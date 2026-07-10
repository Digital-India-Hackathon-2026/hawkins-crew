# Pathfinder Analysis - Current State & Issues

## Current Status: ⚠️ **SINGLE ROUTE ONLY**

The pathfinder is **currently returning only 1 route** per query, despite the infrastructure being set up for multiple routes.

---

## Root Cause Analysis

### Location: `advanced_route_finder.py:211-257`

**Function**: `_find_k_shortest_paths_with_loops_prevented()`

**Current Implementation**:
```python
def _find_k_shortest_paths_with_loops_prevented(
    self,
    origin_nodes: List[str],
    dest_nodes: Set[str],
    k: int = 100  # ← Supposed to find k routes
) -> List[List[str]]:
    """
    Find shortest path using simple Dijkstra (no station revisit prevention).
    
    Returns list with single path. Multi-path logic can be added later.
    """
    # ... Dijkstra implementation ...
    
    # Found destination - reconstruct path
    if curr_node in dest_nodes:
        print(f"  Found destination at iteration {iterations}")
        path = []
        node = curr_node
        while node in parent:
            path.append(node)
            node = parent[node]
        path.append(node)
        path.reverse()
        return [path]  # ← RETURNS ONLY ONE PATH
```

### The Problem

**Line 257**: `return [path]`

When the algorithm finds the first path to destination, it **immediately returns** that single path wrapped in a list. The function **never continues** to find alternative routes.

**Expected**: Should find `k` (default 100) candidate paths and return them all
**Actual**: Returns 1 path immediately after finding first route

---

## Current Flow

```
find_routes(from_station, to_station, max_routes=5)
    ↓
_find_k_shortest_paths_with_loops_prevented(k=100)
    ↓
Dijkstra's algorithm searches graph
    ↓
First route to destination found
    ↓
return [path]  ← STOPS HERE
    ↓
Back to find_routes:
    journeys = [route]  ← Only 1 journey
    journeys.sort()
    return journeys[:5]  ← Returns 1 route
```

---

## Why Backend Supports Multiple Routes

The backend infrastructure **is prepared** for multiple routes:

1. **API parameter**: `max_routes=5` passed to `find_routes()`
   - Line 218 in `app.py`: `routes = finder.find_routes(..., max_routes=5)`

2. **Response format**: Supports multiple routes
   - Line 226-238 in `app.py`: Returns array of routes

3. **Frontend**: Multi-route map implemented
   - `MultiRouteMap.tsx` displays all routes
   - `RouteSelector.tsx` shows all routes

4. **Route Ranking**: Score breakdown and sorting implemented
   - Multi-criteria scoring working
   - Routes can be ranked

**But the pathfinder stops after 1 route, so only that 1 route ever reaches frontend**

---

## How to Fix: Multi-Route Finding Algorithm

### Option 1: K-Shortest Paths (Recommended)

Implement Yen's algorithm or k-shortest paths variant:

```python
def _find_k_shortest_paths_with_loops_prevented(
    self,
    origin_nodes: List[str],
    dest_nodes: Set[str],
    k: int = 100
) -> List[List[str]]:
    """Find k-shortest paths allowing different routes."""
    
    paths = []
    
    # Find multiple paths by repeatedly removing edges from previous paths
    for iteration in range(k):
        if iteration == 0:
            # First path: standard Dijkstra
            path = self._dijkstra_path(origin_nodes, dest_nodes)
        else:
            # Subsequent paths: find alternative routes
            path = self._find_alternative_path(
                origin_nodes,
                dest_nodes,
                previous_paths=paths
            )
        
        if not path:
            break  # No more paths found
        
        paths.append(path)
    
    return paths
```

### Option 2: Diversified Search

Find paths with different characteristics:

```python
# Find 3 different route types:
# 1. Fastest route (minimize travel time)
# 2. Fewest transfers (minimize transfers)
# 3. Best balanced (multi-criteria)

paths = [
    self._find_fastest_route(origin_nodes, dest_nodes),
    self._find_fewest_transfers_route(origin_nodes, dest_nodes),
    self._find_best_balanced_route(origin_nodes, dest_nodes),
]
```

### Option 3: Modified Dijkstra

Allow revisiting stations with penalty:

```python
def _dijkstra_modified(self, origin, dest, penalty_multiplier=1.0):
    """Modified Dijkstra allowing station revisit with increasing cost."""
    
    station_visit_count = {}  # Count visits to each station
    
    # When revisiting a station, increase cost
    if next_station in station_visit_count:
        edge_cost *= (1.0 + penalty_multiplier * station_visit_count[next_station])
    
    # This naturally explores different paths
```

---

## Current Graph Structure

The graph **is ready** for multi-route finding:

**Nodes**: `{station}_{day}_{time}` (time-expanded)
- Example: `NDLS_1_08:00`, `NDLS_1_15:30`
- Allows chronological validity

**Edges**: Two types
1. **Travel edges**: Train segment between stations
   - Weight: travel time (seconds)
   - Type: "travel"

2. **Transfer edges**: Wait at station for next train
   - Weight: waiting time (seconds)
   - Type: "transfer"

**This structure supports multiple paths naturally** - they just aren't being found.

---

## Impact on Frontend

### Current Behavior
```
Search: NDLS → MAQ

Backend response:
{
  "routes": [
    { "rank": 1, "segments": [...], "score": 5400 }
  ]
}

Frontend:
- MultiRouteMap shows 1 route
- RouteSelector shows 1 option
- Map has all 1 route visible
- No comparison possible
```

### Expected Behavior (With Fix)
```
Search: NDLS → MAQ

Backend response:
{
  "routes": [
    { "rank": 1, "segments": [...], "score": 5400 },
    { "rank": 2, "segments": [...], "score": 6200 },
    { "rank": 3, "segments": [...], "score": 7100 },
    { "rank": 4, "segments": [...], "score": 7500 },
    { "rank": 5, "segments": [...], "score": 8000 }
  ]
}

Frontend:
- MultiRouteMap shows all 5 routes
- RouteSelector shows all 5 options
- User can click to switch between routes
- Visual comparison enabled
```

---

## What's Already Working

✅ **Frontend infrastructure**: Multi-route map, selector, timeline all ready
✅ **API structure**: Supports multiple routes in response
✅ **Ranking system**: Score calculation working
✅ **Graph structure**: Supports multiple paths
✅ **Data structures**: Journey, segments, transfers all in place

❌ **The pathfinder itself**: Only returns 1 route

---

## Fixing Strategy

### Step 1: Implement K-Shortest Paths
Replace the single-path return with proper multi-path algorithm.

**Estimated change**: 50-100 lines in `advanced_route_finder.py`

### Step 2: Tune Candidate Count
Adjust `max_candidates` parameter based on performance.

**Current**: `k=100` (finds 100 candidates, returns top 5)
**May need**: Adjust based on graph size and query time

### Step 3: Test Multiple Queries
Verify different station pairs return 3-5 distinct routes.

**Test routes**:
- NDLS → MAQ (major route, should have many options)
- NDLS → BPL (moderate)
- BPL → NGP (test shorter routes)

### Step 4: Performance Monitoring
Ensure pathfinding doesn't exceed acceptable time.

**Target**: < 500ms for typical query
**Current**: Likely < 100ms (only finds 1 route)
**With fix**: May increase to 200-400ms (needs tuning)

---

## Code Locations to Modify

### Primary File
**`advanced_route_finder.py`**

**Function to replace**:
- Line 211-297: `_find_k_shortest_paths_with_loops_prevented()`

**Related functions**:
- Line 299+: `_build_journey()` (should work as-is)
- Line 104: `_calculate_route_score()` (already handles multiple routes)
- Line 94: `_get_centrality_bonus()` (already tuned)

### Secondary Files
**`app.py`**
- Line 218: Already passes `max_routes=5` ✅
- May need to adjust if pathfinder returns too many candidates

**Frontend** (no changes needed)
- Already supports multiple routes
- Just needs backend to provide them

---

## Testing After Fix

### Manual Testing
```bash
# 1. Start backend
python app.py

# 2. Query backend directly
curl -X POST http://localhost:5000/route \
  -H "Content-Type: application/json" \
  -d '{"from":"NDLS","to":"MAQ","date":"2026-07-13"}'

# 3. Check response
# Should have:
# - "routes": array with 3-5 routes
# - Each route different rank (1,2,3,4,5)
# - Different scores (5400, 6200, 7100, etc)
# - Different segments (different trains/transfers)
```

### Visual Testing
```bash
# 1. Frontend still running on port 3000
# 2. Search for NDLS → MAQ
# 3. Verify:
#    - MultiRouteMap shows 5 different colored lines
#    - RouteSelector shows 5 route cards
#    - Clicking each card highlights different route
#    - Statistics differ per route
#    - No backend errors in console
```

---

## Summary

**Current State**: 
- ✅ Infrastructure ready for multiple routes
- ✅ Frontend fully supports visualization
- ❌ Backend pathfinder returns only 1 route

**Root Cause**: 
- `_find_k_shortest_paths_with_loops_prevented()` returns early after finding first path

**Solution**: 
- Replace with proper k-shortest paths algorithm
- Should be straightforward code change
- ~50-100 lines modified

**Impact**: 
- Unlocks full multi-route comparison feature
- Makes demo 10x more impressive
- Shows algorithmic sophistication

**Effort**: 
- 2-4 hours implementation + testing
- Medium complexity (graph algorithms)
- Well-defined scope
