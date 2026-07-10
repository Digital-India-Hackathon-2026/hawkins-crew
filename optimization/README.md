# CP-SAT Route Optimizer

Google OR-Tools CP-SAT based optimal route selection for RailConnect (Prayaan).

## What This Does

This is a **POST-PROCESSING** stage that selects the single optimal route from a set of already-generated, already-ranked candidate routes. It does **NOT**:
- Generate new routes (that's done by `advanced_route_finder.py`)
- Re-rank existing routes (ranking logic remains unchanged)
- Replace existing multi-criteria scoring (it builds on top of it)

## Why This Exists

The existing pipeline generates multiple candidate routes and ranks them by a weighted score. The optimizer adds:

1. **Configurable trade-offs**: Adjust weights for travel time, waiting time, transfers, and delay risk without changing code
2. **Hard constraints**: Enforce maximum transfers and maximum waiting time (e.g., regulatory/operational limits)
3. **Graceful degradation**: When no route satisfies all constraints, falls back to best available option rather than failing
4. **Future-ready for delay analysis**: Built to consume `delayRisk` and `reliabilityScore` fields from planned n8n delay analysis workflow

## Pipeline Position

```
User Input
    ↓
Time Expanded Graph
    ↓
Generate feasible routes (advanced_route_finder.py)
    ↓
Rank routes (existing multi-criteria scoring)
    ↓
[Future: n8n Delay Analysis — adds delayRisk/reliabilityScore]
    ↓
**[CP-SAT Optimizer] ← YOU ARE HERE**
    ↓
Return results (app.py → Next.js frontend)
```

## How to Use

### Basic Usage

```python
from optimization import select_optimal_route, load_optimizer_config

# Load config once at startup
config = load_optimizer_config("optimizer_config.json")

# Later, when you have candidate routes:
candidate_routes = [
    {
        "total_duration": 10800,  # seconds
        "total_waiting": 1800,
        "num_transfers": 1,
        "delayRisk": 0.3,  # 0-1 (optional, uses default if missing)
        "reliabilityScore": 0.8,  # 0-1 (optional)
        "trains_used": ["12345", "67890"],
        "stations_visited": ["SRC", "MID", "DST"],
        # ... other fields passed through unchanged
    },
    # ... more routes
]

optimal_route, metadata = select_optimal_route(candidate_routes, config)

print(f"Selected route: {optimal_route['trains_used']}")
print(f"Optimization status: {metadata['status']}")
print(f"Solve time: {metadata['solve_time_ms']:.1f}ms")
```

### Configuration File

Edit `optimizer_config.json` to tune behavior:

```json
{
  "waitingPenalty": 0.8,
  "transferPenalty": 3600,
  "delayPenalty": 7200,
  "maxTransfers": 3,
  "maxWaitingTime": 7200,
  "missingDelayRiskDefault": 0.5,
  "missingReliabilityScoreDefault": 0.5
}
```

#### Config Field Reference

| Field | Type | Typical Range | Description |
|-------|------|---------------|-------------|
| `waitingPenalty` | float | 0.5 - 1.5 | Cost per second of waiting time at transfers. Higher = penalize waiting more. |
| `transferPenalty` | int | 1800 - 7200 | Fixed cost per transfer (in seconds-equivalent). 3600 = transferring is as bad as 1 hour extra travel. |
| `delayPenalty` | int | 3600 - 14400 | Cost multiplier for delayRisk (0-1 scale). 7200 means delayRisk=1 adds 2 hours equivalent cost. |
| `maxTransfers` | int | 2 - 4 | Hard constraint: reject routes with more than this many transfers. Typical: 3 for intercity. |
| `maxWaitingTime` | int | 3600 - 10800 | Hard constraint: reject routes with total waiting exceeding this (seconds). 7200 = 2 hours. |
| `missingDelayRiskDefault` | float | 0.3 - 1.0 | Default delayRisk when field missing (e.g., n8n call failed). 0.5 = neutral, 1.0 = worst-case. |
| `missingReliabilityScoreDefault` | float | 0.0 - 1.0 | Default reliabilityScore when missing. Currently unused in objective, reserved for future. |

#### Tuning Guide

**Scenario: Users complain about too many transfers**
- Increase `transferPenalty` (e.g., 3600 → 7200)
- Or decrease `maxTransfers` (e.g., 3 → 2)

**Scenario: Users prefer faster routes over more reliable ones**
- Decrease `delayPenalty` (e.g., 7200 → 3600)
- Keep `waitingPenalty` moderate

**Scenario: Prioritize on-time reliability (once n8n delay analysis is live)**
- Increase `delayPenalty` (e.g., 7200 → 14400)
- Routes with lower `delayRisk` will win even if slightly longer

**Scenario: Minimize total journey time regardless of transfers**
- Decrease `transferPenalty` (e.g., 3600 → 1800)
- Decrease `waitingPenalty` (e.g., 0.8 → 0.5)

### Output Metadata

The second return value is a metadata dict for logging/debugging:

```python
{
    "status": "optimal",  # optimal | feasible | infeasible_relaxed | no_candidates | single_candidate
    "solve_time_ms": 12.5,
    "objective_score": 18440.0,  # Lower is better
    "constraints_active": {
        "maxTransfers": false,  # Did any route violate maxTransfers?
        "maxWaitingTime": false
    },
    "candidates_evaluated": 5,
    "candidates_feasible": 5,
    "solver_status": "OPTIMAL"  # CP-SAT internal status
}
```

#### Status Field Values

- `optimal`: Found best possible route satisfying all constraints
- `feasible`: Found a good route satisfying constraints (solver hit time limit before proving optimality)
- `infeasible_relaxed`: No route satisfied hard constraints; returned best available route ignoring constraints
- `no_candidates`: Empty input list
- `single_candidate`: Only one route provided; optimizer bypassed (trivial selection)

## Edge Cases Handled

| Case | Behavior |
|------|----------|
| Empty candidate list | Returns `(None, metadata)` with status `no_candidates` |
| Single candidate | Bypasses CP-SAT (trivial), returns it with status `single_candidate` |
| All routes violate `maxTransfers` | Falls back to route with lowest raw objective score, status `infeasible_relaxed` |
| All routes violate `maxWaitingTime` | Same fallback behavior |
| Missing `delayRisk` field on some routes | Uses `missingDelayRiskDefault` from config (no crash) |
| Null `delayRisk` (e.g., n8n call failed) | Same default substitution |
| Invalid/missing required fields | Route excluded from optimization (won't crash solver) |

## Architecture Notes

### Why CP-SAT, Not Weighted Sum Ranking?

Existing ranking uses weighted sum scoring, which works well. CP-SAT adds:
1. **Hard constraints** that weighted sums can't enforce (e.g., "never more than 3 transfers")
2. **Provable optimality** under those constraints
3. **Declarative constraint modeling** — easier to add new railway-specific rules later (e.g., "prefer routes avoiding congested stations during peak hours")

### Selection Problem, Not Search

This is NOT using CP-SAT to search the route space (that's already done by `advanced_route_finder.py` with Dijkstra). It's a **discrete selection problem**:
- Input: N candidate routes (typically 5-30)
- Decision variables: N booleans (`select_0`, `select_1`, ..., `select_N-1`)
- Constraint: Exactly one is true
- Objective: Minimize weighted cost of the selected route

This is a lightweight use of CP-SAT (solving in ~10-50ms for typical inputs).

### Field Name Normalization

The optimizer accepts multiple field name conventions:
- `travelTime` or `travel_time` or `total_duration`
- `waitingTime` or `waiting_time` or `total_waiting`
- `transfers` or `num_transfers`
- `trains` or `trains_used`
- `stations` or `stations_visited`

This makes it resilient to upstream changes in the route object schema.

## Testing

Run unit tests:

```bash
cd /path/to/hawkins-crew
pytest optimization/test_route_optimizer.py -v
```

Tests cover:
- Normal case (multiple candidates, correct winner selected)
- Edge cases (empty, single candidate, all infeasible)
- Missing fields (delay risk defaults)
- Config sensitivity (changing weights changes outcome)

## Integration with n8n Delay Analysis (Future)

When the n8n delay analysis workflow is added, it should:

1. Receive the list of candidate routes from the ranking stage
2. For each route, compute:
   - `delayRisk` (float 0-1): Probability/severity of delays on this route
   - `reliabilityScore` (float 0-1): Historical on-time performance
3. Add these fields to each route dict
4. Pass enriched routes to this optimizer

The optimizer will automatically use `delayRisk` in its objective function (weighted by `delayPenalty`). No code changes needed.

## Performance

- **Typical solve time**: 10-50ms for 5-30 candidate routes
- **Time limit**: 10 seconds (solver will stop and return best found solution)
- **Memory**: Minimal (< 1MB per solve)
- **Scalability**: CP-SAT selection scales well up to ~100 candidates; beyond that, consider pre-filtering

## Dependencies

- Python 3.8+
- `ortools` (Google OR-Tools): `pip install ortools`

## Troubleshooting

**"No route selected despite having candidates"**
- Check `metadata["solver_status"]` — if `INFEASIBLE`, all routes violate hard constraints
- Try relaxing `maxTransfers` or `maxWaitingTime` in config
- Check logs for which constraint is failing

**"Optimizer taking too long"**
- Should be < 100ms for typical inputs
- If > 1 second, check candidate list size (should be ~5-30, not 1000s)
- Solver has 10-second time limit as failsafe

**"Selected route doesn't match my intuition"**
- Print `metadata["objective_score"]` for each candidate manually to see scores
- Objective is: `travelTime + waitingTime*0.8 + transfers*3600 + delayRisk*7200`
- Adjust config weights to change priorities

**"Missing delayRisk/reliabilityScore errors"**
- Should not error — uses defaults from config
- If it does, check `missingDelayRiskDefault` is set in config file

## License

Part of the Prayaan project (RailConnect).
