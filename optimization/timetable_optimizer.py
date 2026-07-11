"""
Timetable Departure-Shift Optimizer using Google OR-Tools CP-SAT

This module optimizes train departure times at a junction station to maximize
successful passenger transfers while minimizing schedule disruptions.

DISTINCTION: This is DIFFERENT from route_optimizer.py
- route_optimizer.py: Selects 1 route from N candidates (passenger-facing)
- timetable_optimizer.py: Adjusts departure TIMES at a junction (admin-facing)

Usage:
    from optimization.timetable_optimizer import optimize_schedule, load_timetable_config

    config = load_timetable_config("timetable_config.json")
    result, metadata = optimize_schedule(trains, transfer_pairs, junction_code, config)
"""

import json
import time
from typing import Dict, List, Optional, Tuple
from ortools.sat.python import cp_model


def load_timetable_config(config_path: str) -> Dict:
    """
    Load and validate timetable optimizer configuration.

    Args:
        config_path: Path to timetable_config.json

    Returns:
        Validated configuration dictionary

    Raises:
        FileNotFoundError: If config file doesn't exist
        ValueError: If required fields are missing or invalid
    """
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"Config file not found: {config_path}")
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in config file: {e}")

    # Required fields
    required_fields = [
        "minHaltTimeSeconds",
        "minHeadwaySeconds",
        "scheduleModificationPenalty",
        "transferSuccessWeight",
        "maxShiftWindowMinutes",
        "minTransferTimeSeconds",
        "maxTransferTimeSeconds"
    ]

    missing = [field for field in required_fields if field not in config]
    if missing:
        raise ValueError(f"Missing required config fields: {missing}")

    # Validate numeric constraints
    if config["minHaltTimeSeconds"] < 0:
        raise ValueError("minHaltTimeSeconds must be non-negative")
    if config["minHeadwaySeconds"] < 0:
        raise ValueError("minHeadwaySeconds must be non-negative")
    if config["maxShiftWindowMinutes"] <= 0:
        raise ValueError("maxShiftWindowMinutes must be positive")
    if config["minTransferTimeSeconds"] < 0:
        raise ValueError("minTransferTimeSeconds must be non-negative")
    if config["maxTransferTimeSeconds"] <= config["minTransferTimeSeconds"]:
        raise ValueError("maxTransferTimeSeconds must be > minTransferTimeSeconds")

    return config


def _parse_time_to_seconds(time_str: str) -> int:
    """
    Convert HH:MM or HH:MM:SS time string to seconds since midnight.

    Args:
        time_str: Time in "HH:MM" or "HH:MM:SS" format

    Returns:
        Seconds since midnight (0-86399)
    """
    if not time_str or time_str == "None":
        return 0

    parts = time_str.split(":")
    if len(parts) < 2:
        return 0

    try:
        hours = int(parts[0])
        minutes = int(parts[1])
        return hours * 3600 + minutes * 60
    except ValueError:
        return 0


def _seconds_to_time(seconds: int) -> str:
    """
    Convert seconds since midnight to HH:MM format.

    Args:
        seconds: Seconds since midnight

    Returns:
        Time string in "HH:MM" format
    """
    # Handle overflow (next day)
    seconds = seconds % 86400
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    return f"{hours:02d}:{minutes:02d}"


def _compute_transfer_feasibility_before(
    trains_map: Dict[str, Dict],
    transfer_pairs: List[Dict],
    config: Dict
) -> int:
    """
    Count how many transfers are feasible with CURRENT schedules.

    Args:
        trains_map: Train number -> train data
        transfer_pairs: List of transfer pair dicts
        config: Configuration dictionary

    Returns:
        Number of currently successful transfers
    """
    successful = 0
    min_transfer = config["minTransferTimeSeconds"]
    max_transfer = config["maxTransferTimeSeconds"]

    for pair in transfer_pairs:
        from_train_num = pair["fromTrain"]
        to_train_num = pair["toTrain"]

        if from_train_num not in trains_map or to_train_num not in trains_map:
            continue

        from_train = trains_map[from_train_num]
        to_train = trains_map[to_train_num]

        # Transfer time = when from_train DEPARTS to when to_train DEPARTS
        # (Passenger arrives on from_train, gets off at junction, boards to_train)
        from_departure = _parse_time_to_seconds(from_train.get("currentDeparture", "00:00"))
        to_departure = _parse_time_to_seconds(to_train.get("currentDeparture", "00:00"))

        transfer_time = to_departure - from_departure

        # Check feasibility
        if min_transfer <= transfer_time <= max_transfer:
            successful += 1

    return successful


def optimize_schedule(
    trains: List[Dict],
    transfer_pairs: List[Dict],
    junction_station_code: str,
    config: Dict,
    max_shift_minutes: Optional[int] = None
) -> Tuple[Dict, Dict]:
    """
    Optimize train departure times at a junction to maximize successful transfers.

    Decision Variables:
        departure_shift[train_id]: Integer shift in seconds (−maxShift to +maxShift)

    Constraints:
        1. Shift bounds: within ±maxShiftWindowMinutes
        2. Minimum halt time at junction
        3. Headway between consecutive trains (if platform info available)
        4. Transfer feasibility: minTransferTime ≤ connection ≤ maxTransferTime

    Objective:
        Maximize: (transferSuccessWeight * successful_transfers)
                  - (scheduleModificationPenalty * total_absolute_shift)

    Args:
        trains: List of train dicts with currentDeparture, currentArrival, etc.
        transfer_pairs: List of {fromTrain, toTrain, passengerCount}
        junction_station_code: Station code where optimization occurs
        config: Configuration from load_timetable_config()
        max_shift_minutes: Override maxShiftWindowMinutes from config (optional)

    Returns:
        (optimized_result, metadata) where:
            optimized_result: {
                "trains": [...],  # with originalDeparture, optimizedDeparture, shiftMinutes
                "transferPairs": [...]  # with successBefore, successAfter
            }
            metadata: {
                "status": "optimal" | "feasible" | "infeasible" | "no_improvement",
                "solveTimeMs": float,
                "objectiveScore": float,
                "constraintsActive": {...},
                "trainsEvaluated": int,
                "transferPairsEvaluated": int,
                "successfulTransfersBefore": int,
                "successfulTransfersAfter": int,
                "solverStatus": str
            }
    """
    start_time = time.time()

    # Handle edge cases
    if not trains:
        return (
            {"trains": [], "transferPairs": []},
            {
                "status": "no_trains",
                "solveTimeMs": 0.0,
                "objectiveScore": 0.0,
                "constraintsActive": {},
                "trainsEvaluated": 0,
                "transferPairsEvaluated": 0,
                "successfulTransfersBefore": 0,
                "successfulTransfersAfter": 0,
                "solverStatus": "N/A"
            }
        )

    if len(trains) == 1:
        # Single train - no optimization needed
        train = trains[0]
        return (
            {
                "trains": [{
                    "trainNumber": train.get("trainNumber", ""),
                    "trainName": train.get("trainName", ""),
                    "originalDeparture": train.get("currentDeparture", "00:00"),
                    "optimizedDeparture": train.get("currentDeparture", "00:00"),
                    "shiftMinutes": 0,
                    "changed": False,
                    "route": train.get("route", []),
                    "stopsAt": train.get("stopsAt", [])
                }],
                "transferPairs": []
            },
            {
                "status": "single_train",
                "solveTimeMs": (time.time() - start_time) * 1000,
                "objectiveScore": 0.0,
                "constraintsActive": {},
                "trainsEvaluated": 1,
                "transferPairsEvaluated": 0,
                "successfulTransfersBefore": 0,
                "successfulTransfersAfter": 0,
                "solverStatus": "N/A"
            }
        )

    # Extract config parameters
    max_shift = (max_shift_minutes or config["maxShiftWindowMinutes"]) * 60  # Convert to seconds
    min_halt = config["minHaltTimeSeconds"]
    min_headway = config["minHeadwaySeconds"]
    min_transfer = config["minTransferTimeSeconds"]
    max_transfer = config["maxTransferTimeSeconds"]
    transfer_weight = config["transferSuccessWeight"]
    modification_penalty = config["scheduleModificationPenalty"]

    # Build trains map for quick lookup
    trains_map = {train["trainNumber"]: train for train in trains}

    # Compute "before" metrics
    successful_before = _compute_transfer_feasibility_before(trains_map, transfer_pairs, config)

    # Create CP-SAT model
    model = cp_model.CpModel()

    # Decision variables: departure shift for each train (in seconds)
    departure_vars = {}
    shift_abs_vars = {}  # Absolute value of shift for objective

    for train in trains:
        train_num = train["trainNumber"]
        current_departure = _parse_time_to_seconds(train.get("currentDeparture", "00:00"))

        # Shift domain: [-max_shift, +max_shift]
        shift_var = model.NewIntVar(-max_shift, max_shift, f"shift_{train_num}")
        departure_vars[train_num] = {
            "shift": shift_var,
            "original": current_departure
        }

        # Absolute value of shift for objective
        abs_var = model.NewIntVar(0, max_shift, f"abs_shift_{train_num}")
        model.AddAbsEquality(abs_var, shift_var)
        shift_abs_vars[train_num] = abs_var

    # Constraint tracking
    constraints_active = {
        "haltTime": False,
        "headway": False,
        "transferFeasibility": False
    }

    # Constraint 1: Minimum halt time at junction
    # arrival + minHalt ≤ departure
    # (original_departure + shift) ≥ (arrival + minHalt)
    for train in trains:
        train_num = train["trainNumber"]
        arrival = _parse_time_to_seconds(train.get("currentArrival", "00:00"))
        departure = _parse_time_to_seconds(train.get("currentDeparture", "00:00"))

        if arrival > 0 and departure > 0:
            # New departure time = original + shift
            # Must be >= arrival + minHalt
            min_departure = arrival + min_halt

            # original_departure + shift >= min_departure
            # shift >= min_departure - original_departure
            lower_bound = min_departure - departure
            if lower_bound > -max_shift:
                model.Add(departure_vars[train_num]["shift"] >= lower_bound)
                constraints_active["haltTime"] = True

    # Constraint 2: Headway between trains on same platform
    # This requires platform information - skip if not available
    platform_trains = {}
    for train in trains:
        platform = train.get("platform")
        if platform is not None:
            if platform not in platform_trains:
                platform_trains[platform] = []
            platform_trains[platform].append(train)

    for platform, platform_train_list in platform_trains.items():
        if len(platform_train_list) < 2:
            continue

        # Sort by current departure time
        sorted_trains = sorted(
            platform_train_list,
            key=lambda t: _parse_time_to_seconds(t.get("currentDeparture", "00:00"))
        )

        for i in range(len(sorted_trains) - 1):
            train_i = sorted_trains[i]
            train_j = sorted_trains[i + 1]

            train_i_num = train_i["trainNumber"]
            train_j_num = train_j["trainNumber"]

            # train_i_new_departure + minHeadway <= train_j_new_departure
            # (original_i + shift_i) + minHeadway <= (original_j + shift_j)
            # shift_j - shift_i >= minHeadway - (original_j - original_i)

            original_i = departure_vars[train_i_num]["original"]
            original_j = departure_vars[train_j_num]["original"]

            min_gap = min_headway - (original_j - original_i)

            model.Add(
                departure_vars[train_j_num]["shift"] - departure_vars[train_i_num]["shift"] >= min_gap
            )
            constraints_active["headway"] = True

    # Constraint 3: Transfer feasibility
    # For each transfer pair, create a boolean success variable
    transfer_success_vars = []

    for pair_idx, pair in enumerate(transfer_pairs):
        from_train_num = pair["fromTrain"]
        to_train_num = pair["toTrain"]

        # Skip if trains not in our optimization set
        if from_train_num not in departure_vars or to_train_num not in departure_vars:
            continue

        from_train = trains_map[from_train_num]
        to_train = trains_map[to_train_num]

        # Transfer time = when from_train DEPARTS to when to_train DEPARTS
        # (Passenger arrives on from_train, gets off at junction, boards to_train)
        from_departure_orig = departure_vars[from_train_num]["original"]
        to_departure_orig = departure_vars[to_train_num]["original"]

        # New transfer time = (to_departure_orig + to_shift) - (from_departure_orig + from_shift)
        # Success if: minTransfer <= transfer_time <= maxTransfer

        # Create success indicator
        success_var = model.NewBoolVar(f"transfer_success_{pair_idx}")
        transfer_success_vars.append(success_var)

        # transfer_time = (to_departure_orig + to_shift) - (from_departure_orig + from_shift)
        # We need: minTransfer <= (to_departure_orig + to_shift) - (from_departure_orig + from_shift) <= maxTransfer

        # Rewrite: minTransfer <= to_departure_orig - from_departure_orig + to_shift - from_shift <= maxTransfer
        # Lower: to_shift - from_shift >= minTransfer - (to_departure_orig - from_departure_orig)
        # Upper: to_shift - from_shift <= maxTransfer - (to_departure_orig - from_departure_orig)

        base_gap = to_departure_orig - from_departure_orig
        lower_constraint = min_transfer - base_gap
        upper_constraint = max_transfer - base_gap

        # Create intermediate variables for each constraint
        satisfies_lower = model.NewBoolVar(f"satisfies_lower_{pair_idx}")
        satisfies_upper = model.NewBoolVar(f"satisfies_upper_{pair_idx}")

        # satisfies_lower = 1 iff lower constraint met
        shift_diff = model.NewIntVar(-2 * max_shift, 2 * max_shift, f"shift_diff_{pair_idx}")
        model.Add(shift_diff == departure_vars[to_train_num]["shift"] - departure_vars[from_train_num]["shift"])
        model.Add(shift_diff >= lower_constraint).OnlyEnforceIf(satisfies_lower)
        model.Add(shift_diff < lower_constraint).OnlyEnforceIf(satisfies_lower.Not())

        # satisfies_upper = 1 iff upper constraint met
        model.Add(shift_diff <= upper_constraint).OnlyEnforceIf(satisfies_upper)
        model.Add(shift_diff > upper_constraint).OnlyEnforceIf(satisfies_upper.Not())

        # success_var = satisfies_lower AND satisfies_upper
        model.AddBoolAnd([satisfies_lower, satisfies_upper]).OnlyEnforceIf(success_var)
        model.AddBoolOr([satisfies_lower.Not(), satisfies_upper.Not()]).OnlyEnforceIf(success_var.Not())

        constraints_active["transferFeasibility"] = True

    # Objective: Maximize successful transfers, minimize schedule changes
    # Objective = (transferWeight * sum(success)) - (modificationPenalty * sum(abs_shift))

    total_success = sum(transfer_success_vars)
    total_shift = sum(shift_abs_vars.values())

    # CP-SAT minimizes, so we negate
    # We want to maximize: transferWeight * total_success - modificationPenalty * total_shift
    # Minimize: -transferWeight * total_success + modificationPenalty * total_shift

    model.Minimize(
        modification_penalty * total_shift - transfer_weight * total_success
    )

    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0  # 30 second timeout
    status = solver.Solve(model)

    solve_time = (time.time() - start_time) * 1000

    # Map status
    status_map = {
        cp_model.OPTIMAL: "optimal",
        cp_model.FEASIBLE: "feasible",
        cp_model.INFEASIBLE: "infeasible",
        cp_model.MODEL_INVALID: "model_invalid",
        cp_model.UNKNOWN: "unknown"
    }
    solver_status = status_map.get(status, "unknown")

    # Handle infeasible case
    if status in [cp_model.INFEASIBLE, cp_model.MODEL_INVALID]:
        return (
            {"trains": [], "transferPairs": []},
            {
                "status": "infeasible",
                "solveTimeMs": solve_time,
                "objectiveScore": 0.0,
                "constraintsActive": constraints_active,
                "trainsEvaluated": len(trains),
                "transferPairsEvaluated": len(transfer_pairs),
                "successfulTransfersBefore": successful_before,
                "successfulTransfersAfter": 0,
                "solverStatus": solver_status
            }
        )

    # Extract solution
    optimized_trains = []
    successful_after = 0

    for train in trains:
        train_num = train["trainNumber"]
        original_departure = departure_vars[train_num]["original"]
        shift_seconds = solver.Value(departure_vars[train_num]["shift"])
        optimized_departure_seconds = original_departure + shift_seconds

        # Compute shift in minutes
        shift_minutes = shift_seconds // 60

        optimized_trains.append({
            "trainNumber": train_num,
            "trainName": train.get("trainName", ""),
            "originalDeparture": _seconds_to_time(original_departure),
            "optimizedDeparture": _seconds_to_time(optimized_departure_seconds),
            "shiftMinutes": shift_minutes,
            "changed": shift_minutes != 0,
            "route": train.get("route", []),
            "stopsAt": _shift_stops(train.get("stopsAt", []), shift_seconds, junction_station_code)
        })

    # Count successful transfers after optimization
    for var in transfer_success_vars:
        if solver.Value(var) == 1:
            successful_after += 1

    # Build transfer pairs result
    optimized_transfer_pairs = []
    for pair_idx, pair in enumerate(transfer_pairs):
        from_train_num = pair["fromTrain"]
        to_train_num = pair["toTrain"]

        if from_train_num not in departure_vars or to_train_num not in departure_vars:
            continue

        # Compute before/after success
        from_departure_orig = departure_vars[from_train_num]["original"]
        to_departure_orig = departure_vars[to_train_num]["original"]

        # Before
        transfer_time_before = to_departure_orig - from_departure_orig
        success_before = min_transfer <= transfer_time_before <= max_transfer

        # After
        from_shift = solver.Value(departure_vars[from_train_num]["shift"])
        to_shift = solver.Value(departure_vars[to_train_num]["shift"])
        from_departure_after = from_departure_orig + from_shift
        to_departure_after = to_departure_orig + to_shift
        transfer_time_after = to_departure_after - from_departure_after
        success_after_val = min_transfer <= transfer_time_after <= max_transfer

        optimized_transfer_pairs.append({
            "fromTrain": from_train_num,
            "toTrain": to_train_num,
            "successBefore": success_before,
            "successAfter": success_after_val,
            "passengerCount": pair.get("passengerCount", 0)
        })

    # Compute objective score
    objective_score = solver.ObjectiveValue()

    # Determine final status
    if successful_after == successful_before:
        final_status = "no_improvement"
    else:
        final_status = solver_status

    result = {
        "trains": optimized_trains,
        "transferPairs": optimized_transfer_pairs
    }

    metadata = {
        "status": final_status,
        "solveTimeMs": solve_time,
        "objectiveScore": float(objective_score),
        "constraintsActive": constraints_active,
        "trainsEvaluated": len(trains),
        "transferPairsEvaluated": len(transfer_pairs),
        "successfulTransfersBefore": successful_before,
        "successfulTransfersAfter": successful_after,
        "solverStatus": solver_status
    }

    return result, metadata


def _shift_stops(stops: List[Dict], shift_seconds: int, junction_code: str) -> List[Dict]:
    """
    Apply departure shift to all stops in a train's schedule.

    Args:
        stops: Original stopsAt array
        shift_seconds: Shift applied at junction (in seconds)
        junction_code: Station code where shift occurs

    Returns:
        Modified stops with before/after times
    """
    shifted_stops = []

    for stop in stops:
        station_code = stop.get("stationCode", "")
        arrival_before = stop.get("arrivalTime") or stop.get("arrival")
        departure_before = stop.get("departureTime") or stop.get("departure")

        # Apply shift at junction and all subsequent stops
        arrival_after = arrival_before
        departure_after = departure_before

        if station_code == junction_code:
            # Apply shift to departure at junction
            if departure_before:
                dep_seconds = _parse_time_to_seconds(departure_before)
                new_dep_seconds = dep_seconds + shift_seconds
                departure_after = _seconds_to_time(new_dep_seconds)

        shifted_stops.append({
            "stationCode": station_code,
            "arrivalBefore": arrival_before,
            "departureBefore": departure_before,
            "arrivalAfter": arrival_after,
            "departureAfter": departure_after
        })

    return shifted_stops
