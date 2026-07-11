# Timetable Optimizer Implementation Plan

## Current State Analysis

### ✅ What Exists
- `optimization/route_optimizer.py` - Passenger route selection (KEEP UNCHANGED)
- Admin optimizer frontend page at `/admin/optimizer` - Fully built UI
- Mocked API at `/api/admin/optimize` - Returns static JSON
- RouteMap component - Renders mock data
- MongoDB connection in `mongodb.py`
- Real admin analytics routes querying MongoDB SearchLog

### ❌ What's Missing
- **Timetable departure-shift CP-SAT optimizer** (Python)
- **Flask endpoint** for optimizer
- **Real data integration** (remove all mocks)
- **SearchLog query** for "before" metrics
- **Optimizer metadata display** on frontend

---

## Phase 1: Timetable Optimizer Module (Python)

### File: `optimization/timetable_optimizer.py`

**Decision Variables:**
- `departure_shift[train_id]` = integer shift in seconds (−maxShift to +maxShift)
- Example: train departs at 14:30 (52200s), maxShift=600s (10min)
  - Variable domain: [51600, 52800] seconds since midnight

**Constraints:**
1. **Shift bounds**: `original_time - maxShift ≤ new_time ≤ original_time + maxShift`
2. **Minimum halt time**: At junction station, `arrival + minHalt ≤ departure`
3. **Headway constraint**: Between consecutive trains at same platform:
   `train_i_departure + minHeadway ≤ train_j_departure` (if on same platform)
4. **Transfer feasibility**: For each transfer pair (trainA → trainB):
   - `trainA_arrival_at_junction + minTransferTime ≤ trainB_departure_at_junction ≤ trainA_arrival_at_junction + maxTransferTime`
   - Binary success variable: `transfer_success[pairID]` = 1 if feasible, 0 otherwise

**Objective:**
```
Maximize: (transferSuccessWeight * sum(transfer_success[i]))
          - (scheduleModificationPenalty * sum(abs(departure_shift[train])))
```

**Input Contract:**
```python
{
    "junctionStationCode": str,
    "trains": [
        {
            "trainNumber": str,
            "currentDeparture": "HH:MM",  # at junction
            "currentArrival": "HH:MM",    # at junction
            "platform": int or None,
            "route": [station_codes],
            "stopsAt": [
                {
                    "stationCode": str,
                    "arrivalTime": "HH:MM" or None,
                    "departureTime": "HH:MM" or None
                }
            ]
        }
    ],
    "transferPairs": [
        {
            "fromTrain": str,
            "toTrain": str,
            "passengerCount": int  # from SearchLog data
        }
    ],
    "maxShiftMinutes": int,
    "config": dict  # from timetable_config.json
}
```

**Output Contract:**
```python
(
    {
        "trains": [
            {
                "trainNumber": str,
                "trainName": str,
                "originalDeparture": "HH:MM",
                "optimizedDeparture": "HH:MM",
                "shiftMinutes": int,  # signed
                "changed": bool,
                "route": [str],
                "stopsAt": [
                    {
                        "stationCode": str,
                        "arrivalBefore": "HH:MM" or None,
                        "departureBefore": "HH:MM" or None,
                        "arrivalAfter": "HH:MM" or None,
                        "departureAfter": "HH:MM" or None
                    }
                ]
            }
        ],
        "transferPairs": [
            {
                "fromTrain": str,
                "toTrain": str,
                "successBefore": bool,
                "successAfter": bool,
                "passengerCount": int
            }
        ]
    },
    {
        "status": "optimal" | "feasible" | "infeasible" | "no_improvement",
        "solveTimeMs": float,
        "objectiveScore": float,
        "constraintsActive": {
            "haltTime": bool,
            "headway": bool,
            "transferFeasibility": bool
        },
        "trainsEvaluated": int,
        "transferPairsEvaluated": int,
        "successfulTransfersBefore": int,
        "successfulTransfersAfter": int,
        "solverStatus": str
    }
)
```

---

## Phase 2: Flask Backend Integration

### File: `app.py` (additions)

**New Endpoint:**
```python
@app.route("/admin/optimize-timetable", methods=["POST"])
def optimize_timetable():
    """
    Optimize train departure times at a junction station.
    
    Request body:
    {
        "stationCode": str,
        "trainNumbers": [str],
        "maxShiftMinutes": int
    }
    
    Response:
    {
        "stationCode": str,
        "maxShiftMinutes": int,
        "before": {
            "avgWaitingTime": int,
            "successRate": int,
            "totalTransfers": int,
            "problematicConnections": int
        },
        "after": {
            "avgWaitingTime": int,
            "successRate": int,
            "totalTransfers": int,
            "problematicConnections": int
        },
        "recommendedChanges": [
            {
                "trainNumber": str,
                "trainName": str,
                "currentDeparture": "HH:MM",
                "recommendedDeparture": "HH:MM",
                "shiftMinutes": int,
                "reason": str,
                "impactedConnections": int,
                "improvementScore": int,
                "route": [str],
                "stopsAt": [...]
            }
        ],
        "optimizerMetadata": {
            "status": str,
            "solveTimeMs": float,
            "objectiveScore": float,
            ...
        }
    }
    """
```

**Data Flow:**
1. Receive request with stationCode, trainNumbers, maxShiftMinutes
2. Query MongoDB SearchLog to find transfer pairs involving these trains at this station:
   ```python
   # Find all searches where user transferred at this junction
   searches = db.searchLogs.find({
       "transfers": {
           "$elemMatch": {
               "stationCode": stationCode,
               "fromTrain": {"$in": trainNumbers},
               "toTrain": {"$in": trainNumbers}
           }
       }
   })
   ```
3. Build transferPairs list with passenger counts
4. Load train schedules from SCHEDULES_MAP
5. Call `timetable_optimizer.optimize_schedule(...)`
6. Compute "before" and "after" metrics from transfer success counts
7. Format response matching OptimizerResult interface
8. Return JSON

**Startup Integration:**
```python
# Load timetable optimizer config at startup
TIMETABLE_CONFIG = None

def load_graph():
    global TIMETABLE_CONFIG
    ...
    TIMETABLE_CONFIG = load_timetable_config("timetable_config.json")
```

---

## Phase 3: Frontend API Route Update

### File: `frontend/app/api/admin/optimize/route.ts`

**Replace entire file with:**
```typescript
import { NextResponse } from 'next/server';
import axios from 'axios';

const FLASK_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { stationCode, trainNumbers, maxShiftMinutes = 10 } = body;

    // Call real Flask backend
    const response = await axios.post(`${FLASK_API}/admin/optimize-timetable`, {
      stationCode,
      trainNumbers,
      maxShiftMinutes,
    }, {
      timeout: 60000,  // 60s for CP-SAT solve
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Timetable optimization failed:', error);
    
    // Handle specific error cases
    if (error.response?.status === 400) {
      return NextResponse.json(
        { error: error.response.data.error || 'Invalid request' },
        { status: 400 }
      );
    }
    
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'Backend service unavailable. Please ensure Flask server is running.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Optimization service error', details: error.message },
      { status: 500 }
    );
  }
}
```

---

## Phase 4: Frontend Metadata Display

### File: `frontend/app/admin/optimizer/page.tsx`

**Add after results section (after ComparisonCard):**
```typescript
{/* Optimizer Metadata Panel */}
{result.optimizerMetadata && (
  <div style={{
    background: "var(--bg-card)",
    border: "1px solid var(--glass-border)",
    borderRadius: "16px",
    padding: "1.5rem",
    marginBottom: "2rem"
  }}>
    <h3 style={{
      fontSize: "1rem",
      fontWeight: 700,
      color: "var(--text-primary)",
      marginBottom: "1rem"
    }}>
      Optimizer Details
    </h3>
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "1rem"
    }}>
      <MetadataItem 
        label="Status"
        value={result.optimizerMetadata.status.toUpperCase()}
        color={
          result.optimizerMetadata.status === "optimal" ? "hsl(145,60%,45%)" :
          result.optimizerMetadata.status === "feasible" ? "hsl(40,95%,55%)" :
          result.optimizerMetadata.status === "infeasible" ? "hsl(0,70%,55%)" :
          "var(--text-secondary)"
        }
      />
      <MetadataItem 
        label="Solve Time"
        value={`${result.optimizerMetadata.solveTimeMs.toFixed(1)}ms`}
      />
      <MetadataItem 
        label="Transfers Before"
        value={result.optimizerMetadata.successfulTransfersBefore}
      />
      <MetadataItem 
        label="Transfers After"
        value={result.optimizerMetadata.successfulTransfersAfter}
      />
    </div>
    {result.optimizerMetadata.status === "infeasible" && (
      <div style={{
        marginTop: "1rem",
        padding: "1rem",
        background: "#FEF2F2",
        border: "1px solid #FECACA",
        borderRadius: "8px",
        color: "hsl(0,70%,45%)",
        fontSize: "0.9rem"
      }}>
        No improving schedule found within constraints. Try increasing max shift window or selecting different trains.
      </div>
    )}
  </div>
)}

function MetadataItem({label, value, color}: {label: string, value: string | number, color?: string}) {
  return (
    <div>
      <div style={{
        fontSize: "0.75rem",
        color: "var(--text-muted)",
        marginBottom: "4px",
        textTransform: "uppercase"
      }}>
        {label}
      </div>
      <div style={{
        fontSize: "1.1rem",
        fontWeight: 700,
        color: color || "var(--text-primary)"
      }}>
        {value}
      </div>
    </div>
  );
}
```

**Update OptimizerResult interface in `lib/api.ts`:**
```typescript
export interface OptimizerResult {
  stationCode: string;
  maxShiftMinutes: number;
  before: OptimizerMetrics;
  after: OptimizerMetrics;
  recommendedChanges: RecommendedChange[];
  optimizerMetadata?: {  // NEW
    status: string;
    solveTimeMs: number;
    objectiveScore: number;
    constraintsActive: Record<string, boolean>;
    trainsEvaluated: number;
    transferPairsEvaluated: number;
    successfulTransfersBefore: number;
    successfulTransfersAfter: number;
    solverStatus: string;
  };
}
```

---

## Phase 5: Map Real Data Integration

**No code changes needed** - RouteMap already renders from `result.recommendedChanges`, which will now contain:
- Real train routes from SCHEDULES_MAP
- Real departure times (before/after)
- Actual `shiftMinutes` values (0 if no change)
- Real station coordinates from StationsContext

The map will automatically:
- Show "Modified Schedule" styling only for trains where `shiftMinutes !== 0`
- Display correct "no change" state when optimizer finds original time was optimal
- Handle INFEASIBLE status gracefully (no recommendedChanges to render)

---

## Edge Case Handling

### 1. No SearchLog Data for Selected Trains
**Detection:** MongoDB query returns 0 transfer pairs
**Response:**
```json
{
  "error": "insufficient_data",
  "message": "No transfer data found for these trains at this station. Try selecting trains with more historical usage.",
  "stationCode": "...",
  "trainNumbers": [...]
}
```
**Frontend:** Display error message, suggest different train selection

### 2. Optimizer Returns INFEASIBLE
**Response:** Include metadata with `status: "infeasible"`
**Frontend:** 
- Show before metrics only (no "after" card)
- Display red warning: "No improving schedule found within constraints"
- Suggest: increase maxShiftMinutes, try different trains

### 3. No Improvement Possible
**Response:** Metadata `status: "no_improvement"`, recommendedChanges all have `shiftMinutes: 0`
**Frontend:**
- Show before === after metrics
- Display success message: "Current timetable is already optimal for selected constraints"
- Map shows no visual changes (all routes same color)

### 4. MongoDB Connection Failure
**Response:** HTTP 503 with clear error message
**Frontend:** Display service error, suggest retrying

---

## Testing Strategy

### Unit Tests: `optimization/test_timetable_optimizer.py`
- Load config successfully
- Parse train schedules
- Compute transfer feasibility (before optimization)
- CP-SAT model builds without errors
- Edge cases: no trains, single train, all infeasible
- Objective score computation
- Output format matches contract

### Integration Test: `test_timetable_integration.py`
- Call optimizer with realistic train data
- Verify output structure
- Check metadata completeness
- Ensure "before" !== "after" when improvement exists

### Manual Test
1. Seed MongoDB with demo SearchLog data (use existing seed script)
2. Start Flask backend
3. Start Next.js frontend
4. Navigate to `/admin/optimizer`
5. Select station (e.g., NDLS) and trains
6. Verify:
   - Loading state during optimization
   - Real metrics appear
   - Map shows actual routes
   - Metadata panel displays
   - Changed trains highlighted on map

---

## Implementation Order

1. ✅ Create `timetable_config.json`
2. Build `optimization/timetable_optimizer.py` (~500 lines)
3. Add unit tests `optimization/test_timetable_optimizer.py`
4. Integrate into `app.py` (add endpoint, load config)
5. Update `frontend/app/api/admin/optimize/route.ts`
6. Update `frontend/lib/api.ts` (add optimizerMetadata to type)
7. Update `frontend/app/admin/optimizer/page.tsx` (add metadata panel)
8. Test end-to-end

---

## Dependencies
- Already installed: `ortools`, `pymongo`, `flask`, `axios`
- No new dependencies needed

---

## Estimated Complexity
- **Timetable Optimizer**: ~500 lines (similar to route_optimizer.py)
- **Flask Integration**: ~150 lines (MongoDB queries + endpoint)
- **Frontend Updates**: ~100 lines (metadata panel, type updates)
- **Tests**: ~400 lines
- **Total**: ~1150 lines new/modified code

---

## Success Criteria
- [ ] Timetable optimizer returns real optimization results
- [ ] All mock data removed from `/api/admin/optimize`
- [ ] Map reflects actual train routes and schedule changes
- [ ] Metadata panel shows optimizer status/timing
- [ ] INFEASIBLE case handled gracefully
- [ ] "No data" case handled gracefully
- [ ] Unit tests pass (22+ tests)
- [ ] End-to-end manual test succeeds

---

## Files to Create/Modify

### Create:
- `optimization/timetable_optimizer.py`
- `optimization/test_timetable_optimizer.py`
- `timetable_config.json` (done)
- `TIMETABLE_OPTIMIZER_PLAN.md` (this file)

### Modify:
- `app.py` (add endpoint, load config)
- `frontend/app/api/admin/optimize/route.ts` (remove mocks, call Flask)
- `frontend/lib/api.ts` (add optimizerMetadata to OptimizerResult)
- `frontend/app/admin/optimizer/page.tsx` (add metadata panel)
- `requirements.txt` (add `pymongo` if not present)

### Leave Unchanged:
- `optimization/route_optimizer.py`
- `optimization/__init__.py`
- `optimizer_config.json`
- `frontend/components/admin/RouteMap.tsx` (already dynamic)
- All MongoDB aggregation routes (dashboard, analytics, station details)
