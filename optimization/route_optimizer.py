"""
CP-SAT Route Optimizer using Google OR-Tools

This module provides optimal route selection from pre-ranked candidate routes.
It operates as a POST-PROCESSING stage after route generation, ranking, and
delay analysis enrichment.

The optimizer does NOT re-rank or replace existing ranking logic — it makes
a final selection decision on top of already-ranked routes using configurable
weighted objectives and hard constraints.

Pipeline position:
    ... → Rank routes → n8n Delay Analysis → [CP-SAT Optimizer] → Return results

Key Design Decisions:
- Selection problem (not search): one boolean variable per candidate route
- Discrete optimization over known candidates (not continuous route generation)
- Graceful degradation: falls back to best-score route when constraints infeasible
- Missing data handling: uses configurable defaults for missing delay/reliability fields
"""

import json
import os
from typing import List, Dict, Tuple, Optional
from ortools.sat.python import cp_model


def load_optimizer_config(config_path: str = "optimizer_config.json") -> Dict:
    """
    Load optimizer configuration from JSON file.

    Config fields:
    - waitingPenalty: cost per second of waiting time (float, typically 0.5-1.5)
    - transferPenalty: fixed cost per transfer (int, typically 1800-7200 seconds equivalent)
    - delayPenalty: cost multiplier for delay risk score 0-1 (int, typically 3600-14400)
    - maxTransfers: hard constraint on maximum transfers allowed (int, typically 2-4)
    - maxWaitingTime: hard constraint on maximum total waiting time in seconds (int, typically 3600-10800)
    - missingDelayRiskDefault: default value when delayRisk field missing (float 0-1, typically 0.5-1.0)
    - missingReliabilityScoreDefault: default value when reliabilityScore missing (float 0-1)

    Args:
        config_path: Path to JSON config file

    Returns:
        Dictionary with config values

    Raises:
        FileNotFoundError: If config file doesn't exist
        ValueError: If required config fields missing or invalid
    """
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Optimizer config not found at {config_path}")

    with open(config_path, 'r') as f:
        config = json.load(f)

    # Validate required fields
    required = [
        'waitingPenalty', 'transferPenalty', 'delayPenalty',
        'maxTransfers', 'maxWaitingTime',
        'missingDelayRiskDefault', 'missingReliabilityScoreDefault'
    ]

    missing = [field for field in required if field not in config]
    if missing:
        raise ValueError(f"Missing required config fields: {missing}")

    # Validate ranges
    if config['maxTransfers'] < 0:
        raise ValueError(f"maxTransfers must be >= 0, got {config['maxTransfers']}")
    if config['maxWaitingTime'] < 0:
        raise ValueError(f"maxWaitingTime must be >= 0, got {config['maxWaitingTime']}")
    if not (0 <= config['missingDelayRiskDefault'] <= 1):
        raise ValueError(f"missingDelayRiskDefault must be 0-1, got {config['missingDelayRiskDefault']}")
    if not (0 <= config['missingReliabilityScoreDefault'] <= 1):
        raise ValueError(f"missingReliabilityScoreDefault must be 0-1, got {config['missingReliabilityScoreDefault']}")

    return config


def _normalize_route_object(route: Dict, config: Dict) -> Dict:
    """
    Normalize route object to expected shape, handling missing fields.

    Maps various possible field names to canonical names:
    - travelTime/travel_time/total_duration → travelTime (seconds)
    - waitingTime/waiting_time/total_waiting → waitingTime (seconds)
    - transfers/num_transfers → transfers (count)
    - delayRisk/delay_risk → delayRisk (0-1)
    - reliabilityScore/reliability_score → reliabilityScore (0-1)
    - trains/trains_used → trains (list)
    - stations/stations_visited → stations (list)

    Args:
        route: Raw route object (may have varying field names)
        config: Optimizer config with default values

    Returns:
        Normalized route dict with canonical field names
    """
    normalized = {}

    # Travel time (required field)
    if 'travelTime' in route:
        normalized['travelTime'] = route['travelTime']
    elif 'travel_time' in route:
        normalized['travelTime'] = route['travel_time']
    elif 'total_duration' in route:
        normalized['travelTime'] = route['total_duration']
    else:
        raise ValueError("Route missing travelTime/travel_time/total_duration field")

    # Waiting time (required field)
    if 'waitingTime' in route:
        normalized['waitingTime'] = route['waitingTime']
    elif 'waiting_time' in route:
        normalized['waitingTime'] = route['waiting_time']
    elif 'total_waiting' in route:
        normalized['waitingTime'] = route['total_waiting']
    else:
        raise ValueError("Route missing waitingTime/waiting_time/total_waiting field")

    # Transfers (required field)
    if 'transfers' in route:
        normalized['transfers'] = route['transfers']
    elif 'num_transfers' in route:
        normalized['transfers'] = route['num_transfers']
    else:
        raise ValueError("Route missing transfers/num_transfers field")

    # Delay risk (optional, use default if missing)
    if 'delayRisk' in route and route['delayRisk'] is not None:
        normalized['delayRisk'] = route['delayRisk']
    elif 'delay_risk' in route and route['delay_risk'] is not None:
        normalized['delayRisk'] = route['delay_risk']
    else:
        # Missing or null — use configured default (typically worst-case)
        normalized['delayRisk'] = config['missingDelayRiskDefault']

    # Reliability score (optional, use default if missing)
    if 'reliabilityScore' in route and route['reliabilityScore'] is not None:
        normalized['reliabilityScore'] = route['reliabilityScore']
    elif 'reliability_score' in route and route['reliability_score'] is not None:
        normalized['reliabilityScore'] = route['reliability_score']
    else:
        normalized['reliabilityScore'] = config['missingReliabilityScoreDefault']

    # Trains (required for output contract)
    if 'trains' in route:
        normalized['trains'] = route['trains']
    elif 'trains_used' in route:
        normalized['trains'] = route['trains_used']
    else:
        normalized['trains'] = []  # Fallback to empty list

    # Stations (required for output contract)
    if 'stations' in route:
        normalized['stations'] = route['stations']
    elif 'stations_visited' in route:
        normalized['stations'] = route['stations_visited']
    else:
        normalized['stations'] = []  # Fallback to empty list

    # Pass through all other fields unchanged
    for key, value in route.items():
        if key not in normalized:
            normalized[key] = value

    return normalized


def _is_route_feasible(route: Dict) -> Tuple[bool, Optional[str]]:
    """
    Pre-filter check: determine if a route violates basic feasibility rules.

    Feasibility rules (matching existing pipeline conventions):
    1. Travel time must be positive (> 0)
    2. Waiting time must be non-negative (>= 0)
    3. Transfers must be non-negative (>= 0)
    4. Must have at least one train
    5. Must have at least two stations (origin and destination)

    Args:
        route: Normalized route dict

    Returns:
        Tuple of (is_feasible: bool, reason: str or None)
    """
    if route['travelTime'] <= 0:
        return False, "travelTime must be > 0"

    if route['waitingTime'] < 0:
        return False, "waitingTime must be >= 0"

    if route['transfers'] < 0:
        return False, "transfers must be >= 0"

    if not route['trains'] or len(route['trains']) == 0:
        return False, "route must have at least one train"

    if not route['stations'] or len(route['stations']) < 2:
        return False, "route must have at least two stations"

    return True, None


def _compute_objective_score(
    route: Dict,
    config: Dict
) -> float:
    """
    Compute the objective score for a route using weighted criteria.

    Objective = travelTime + waitingTime * waitingPenalty
                + transfers * transferPenalty + delayRisk * delayPenalty

    Lower score is better. This matches the optimization direction used in CP-SAT.

    Args:
        route: Normalized route dict
        config: Optimizer config with penalty weights

    Returns:
        Objective score (float, lower is better)
    """
    score = (
        route['travelTime']
        + route['waitingTime'] * config['waitingPenalty']
        + route['transfers'] * config['transferPenalty']
        + route['delayRisk'] * config['delayPenalty']
    )
    return score


def select_optimal_route(
    candidate_routes: List[Dict],
    config: Dict
) -> Tuple[Optional[Dict], Dict]:
    """
    Select optimal route from candidates using CP-SAT constraint optimization.

    This is a SELECTION problem: given N already-generated, already-ranked routes,
    choose the single best one according to configurable weighted objectives and
    hard constraints. Does NOT re-generate routes or replace existing ranking logic.

    Objective (minimize):
        travelTime + waitingTime * waitingPenalty + transfers * transferPenalty
        + delayRisk * delayPenalty

    Constraints:
        1. Exactly one route selected
        2. Route is feasible (positive travel time, valid trains/stations, etc.)
        3. transfers <= maxTransfers
        4. waitingTime <= maxWaitingTime

    Edge Cases Handled:
    - Empty input: returns (None, metadata with "no_candidates" status)
    - Single candidate: bypasses CP-SAT, returns it directly
    - All routes violate constraints: falls back to best raw score, relaxed constraints
    - Missing delayRisk/reliabilityScore: uses configured defaults

    Args:
        candidate_routes: List of route dicts (from pipeline after ranking/delay analysis)
        config: Optimizer config dict (from load_optimizer_config)

    Returns:
        Tuple of (selected_route: dict or None, metadata: dict)

        selected_route: The chosen route (same shape as input, no fields added/removed)
        metadata: {
            "status": "optimal" | "feasible" | "infeasible_relaxed" | "no_candidates" | "single_candidate",
            "solve_time_ms": float,
            "objective_score": float,
            "constraints_active": {
                "maxTransfers": bool,
                "maxWaitingTime": bool
            },
            "candidates_evaluated": int,
            "candidates_feasible": int,
            "solver_status": str (CP-SAT status name)
        }
    """
    import time
    start_time = time.time()

    metadata = {
        "status": "unknown",
        "solve_time_ms": 0.0,
        "objective_score": None,
        "constraints_active": {
            "maxTransfers": False,
            "maxWaitingTime": False
        },
        "candidates_evaluated": len(candidate_routes),
        "candidates_feasible": 0,
        "solver_status": None
    }

    # Edge case 1: Empty candidate list
    if not candidate_routes or len(candidate_routes) == 0:
        metadata["status"] = "no_candidates"
        metadata["solve_time_ms"] = (time.time() - start_time) * 1000
        return None, metadata

    # Edge case 2: Single candidate (trivial selection, bypass solver)
    if len(candidate_routes) == 1:
        route = candidate_routes[0]
        try:
            normalized = _normalize_route_object(route, config)
            feasible, reason = _is_route_feasible(normalized)

            if not feasible:
                # Even single candidate is infeasible — return it anyway with warning
                metadata["status"] = "single_candidate_infeasible"
                metadata["infeasibility_reason"] = reason
            else:
                metadata["status"] = "single_candidate"

            metadata["objective_score"] = _compute_objective_score(normalized, config)
            metadata["solve_time_ms"] = (time.time() - start_time) * 1000

            # Return original route object unchanged (not normalized version)
            return route, metadata

        except Exception as e:
            metadata["status"] = "error"
            metadata["error"] = str(e)
            metadata["solve_time_ms"] = (time.time() - start_time) * 1000
            return None, metadata

    # Normalize all routes and pre-filter for feasibility
    normalized_routes = []
    feasible_indices = []  # Tracks which original routes passed feasibility check

    for i, route in enumerate(candidate_routes):
        try:
            normalized = _normalize_route_object(route, config)
            feasible, reason = _is_route_feasible(normalized)

            if feasible:
                normalized_routes.append(normalized)
                feasible_indices.append(i)
            # else: route is infeasible, excluded from optimization

        except Exception as e:
            # Normalization failed (missing required fields) — skip this route
            pass

    metadata["candidates_feasible"] = len(normalized_routes)

    # Edge case 3: No feasible routes after pre-filtering
    if len(normalized_routes) == 0:
        # All routes failed feasibility — return best raw score anyway (relaxed)
        best_route = None
        best_score = float('inf')

        for route in candidate_routes:
            try:
                normalized = _normalize_route_object(route, config)
                score = _compute_objective_score(normalized, config)
                if score < best_score:
                    best_score = score
                    best_route = route
            except:
                pass

        metadata["status"] = "all_infeasible_fallback"
        metadata["objective_score"] = best_score if best_route else None
        metadata["solve_time_ms"] = (time.time() - start_time) * 1000
        return best_route, metadata

    # Build CP-SAT model
    model = cp_model.CpModel()

    # Decision variables: one boolean per feasible route
    # select[i] = 1 if route i is chosen, 0 otherwise
    select = []
    for i in range(len(normalized_routes)):
        select.append(model.NewBoolVar(f'select_{i}'))

    # CONSTRAINT 1: Exactly one route selected
    # Railway justification: A passenger must take exactly one complete journey from
    # origin to destination — cannot take zero routes (no travel) or multiple routes
    # (physically impossible to be on two trains simultaneously)
    model.Add(sum(select) == 1)

    # CONSTRAINT 2: Maximum transfers
    # Railway justification: Excessive transfers increase travel complexity, passenger
    # fatigue, missed connection risk, and luggage handling burden. Regulatory and
    # operational guidelines often cap feasible transfers (typically 2-3 for intercity,
    # 4-5 maximum for complex journeys). Beyond this, alternatives like direct
    # routes or different travel modes should be considered.
    max_transfers = config['maxTransfers']
    for i, route in enumerate(normalized_routes):
        if route['transfers'] > max_transfers:
            # This route violates max transfers — force its selection variable to 0
            # (This is equivalent to excluding it, but we track it explicitly for metadata)
            model.Add(select[i] == 0)
            metadata["constraints_active"]["maxTransfers"] = True

    # CONSTRAINT 3: Maximum waiting time
    # Railway justification: Extended waiting times at transfer stations expose passengers
    # to missed connections (if earlier train delayed), platform safety concerns, lack of
    # amenities (especially at smaller stations), and poor user experience. Excessive
    # total waiting (e.g., > 2-3 hours) usually indicates poor schedule alignment and
    # should be avoided unless no alternative exists.
    max_waiting = config['maxWaitingTime']
    for i, route in enumerate(normalized_routes):
        if route['waitingTime'] > max_waiting:
            # Route violates max waiting time — exclude from selection
            model.Add(select[i] == 0)
            metadata["constraints_active"]["maxWaitingTime"] = True

    # Objective: Minimize weighted sum
    # Precompute objective scores for each route (convert to integer for CP-SAT)
    # CP-SAT requires integer coefficients, so we scale float scores by 1000
    objective_terms = []
    route_scores = []  # Track original float scores for metadata

    for i, route in enumerate(normalized_routes):
        score = _compute_objective_score(route, config)
        route_scores.append(score)

        # Scale to integer (multiply by 1000 to preserve precision)
        scaled_score = int(score * 1000)
        objective_terms.append(scaled_score * select[i])

    model.Minimize(sum(objective_terms))

    # Solve
    solver = cp_model.CpSolver()
    # Set time limit to prevent hanging on pathological cases (10 seconds is generous
    # for a selection problem over ~5-30 candidates)
    solver.parameters.max_time_in_seconds = 10.0

    status = solver.Solve(model)

    metadata["solver_status"] = solver.StatusName(status)
    metadata["solve_time_ms"] = (time.time() - start_time) * 1000

    # Interpret result
    if status == cp_model.OPTIMAL:
        metadata["status"] = "optimal"

        # Find which route was selected
        selected_idx = None
        for i in range(len(select)):
            if solver.Value(select[i]) == 1:
                selected_idx = i
                break

        if selected_idx is not None:
            metadata["objective_score"] = route_scores[selected_idx]
            # Return ORIGINAL route object (not normalized), matching input shape
            original_idx = feasible_indices[selected_idx]
            return candidate_routes[original_idx], metadata
        else:
            # Should never happen (solver says optimal but no var selected) — defensive
            metadata["status"] = "error_no_selection"
            return None, metadata

    elif status == cp_model.FEASIBLE:
        # Found a feasible solution but didn't prove optimality (hit time limit)
        metadata["status"] = "feasible"

        selected_idx = None
        for i in range(len(select)):
            if solver.Value(select[i]) == 1:
                selected_idx = i
                break

        if selected_idx is not None:
            metadata["objective_score"] = route_scores[selected_idx]
            original_idx = feasible_indices[selected_idx]
            return candidate_routes[original_idx], metadata
        else:
            metadata["status"] = "error_no_selection"
            return None, metadata

    elif status == cp_model.INFEASIBLE:
        # No route satisfies hard constraints — fall back to best raw score (relaxed)
        metadata["status"] = "infeasible_relaxed"

        # Find route with lowest objective score among all candidates (ignore constraints)
        best_route = None
        best_score = float('inf')

        for i, route in enumerate(normalized_routes):
            if route_scores[i] < best_score:
                best_score = route_scores[i]
                best_idx = i

        if best_score < float('inf'):
            metadata["objective_score"] = best_score
            original_idx = feasible_indices[best_idx]
            return candidate_routes[original_idx], metadata
        else:
            # No route had a computable score — return first candidate as last resort
            metadata["objective_score"] = None
            return candidate_routes[0], metadata

    else:
        # Unknown or error status
        metadata["status"] = f"solver_error_{solver.StatusName(status).lower()}"

        # Fall back to first candidate as defensive measure
        return candidate_routes[0] if candidate_routes else None, metadata
