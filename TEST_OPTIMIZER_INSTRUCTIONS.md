# Timetable Optimizer - Testing Instructions

## How to Test the Optimizer Feature

### Step 1: Start the Backend
```bash
cd hawkins-crew
python app.py
```

Wait for the message: "Server starting on http://localhost:5000"

### Step 2: Start the Frontend
```bash
cd hawkins-crew/frontend
npm run dev
```

Wait for the message: "Local: http://localhost:3000"

### Step 3: Navigate to the Optimizer Page
Open in browser: **http://localhost:3000/admin/optimizer**

---

## Demo Test Scenarios

### Scenario 1: Delhi Junction (NDLS) - Major Hub
**Recommended for best visualization**

```
Station: NDLS
Train Numbers: 12301, 12302, 12951, 12429
Max Shift Window: 15
```

**Expected Results:**
- 4 trains with complex transfer patterns
- Geographic routes spanning Delhi-Howrah-Mumbai-Lucknow
- 3-5 minutes shifts to improve transfer windows
- Success rate improvement: ~40% → 75%+

### Scenario 2: Mumbai Central (BCT) - Western Hub
```
Station: BCT
Train Numbers: 12952, 12954, 12956
Max Shift Window: 10
```

**Expected Results:**
- 3 trains converging at Mumbai
- Shorter optimization window
- Tighter constraints

### Scenario 3: Howrah Junction (HWH) - Eastern Hub
```
Station: HWH
Train Numbers: 12301, 12303, 12305
Max Shift Window: 20
```

**Expected Results:**
- Larger shift window allows more optimization
- Multiple route intersections

---

## What to Look For

### 1. Before/After Comparison Cards
- **Left card (Red)**: Original schedule metrics
- **Right card (Green)**: Optimized schedule metrics
- Key metrics to watch:
  - Success Rate: should increase
  - Problematic Connections: should decrease
  - Avg Waiting Time: may decrease

### 2. Optimizer Metadata Panel
- **Status**: Should show "OPTIMAL" or "FEASIBLE" (green/amber)
- **Solve Time**: Typically 10-200ms
- **Transfers Before/After**: Should show improvement

### 3. Route Visualization Map

#### Before Mode:
- All trains shown with **solid lines**
- **Lower opacity** (0.65)
- Standard colors from palette
- Station popups show original timing

#### After Mode:
- **Modified trains**: Thick dashed lines, bright amber color
- **Unchanged trains**: Thin solid lines, standard colors
- **Station popups**: Show before → after comparison with strikethrough
- **Junction station**: Highlighted with larger marker

### 4. Visual Comparison Summary (Above Map)
- Shows current viewing mode
- Routes modified count
- Maximum shift applied
- Overall improvement percentage

### 5. Recommended Changes Table
- Lists each train with timing changes
- Shows shift amount (+X min)
- Explains reason for change
- Impact score

---

## Understanding the Results

### What Changes on the Map?

**IMPORTANT**: The optimizer adjusts **departure TIMES**, not geographic routes.

- **Routes stay the same**: The geographic path (station sequence) doesn't change
- **Timing shifts**: Trains depart a few minutes earlier/later at the junction
- **Visual indicators**: Modified trains are highlighted with special styling

### Why Don't Routes Look Different?

This is a **timetable optimizer**, not a **route optimizer**:

- **Route Optimizer** (`/route` endpoint): Finds completely different train combinations
- **Timetable Optimizer** (this feature): Adjusts timing on existing trains

Think of it like this:
- Route optimizer: "Take train A instead of train B"
- Timetable optimizer: "Delay train A by 5 minutes so passengers from train C can board it"

### How to See Actual Route Changes?

If you want to see different geographic routes, use the main route search:
1. Go to **http://localhost:3000/**
2. Enter origin/destination
3. The route finder will show multiple different paths
4. Compare the train combinations (different routes entirely)

---

## Troubleshooting

### "No candidates" or "insufficient_data" error
- The trains don't stop at the selected station
- Try the demo scenarios above (they use real train data)
- Make sure you're using actual station codes (e.g., NDLS, not "Delhi")

### Map shows "No station coordinates available"
- The trains are in the database but stations lack GPS coordinates
- Try the recommended demo scenarios which use major stations

### All trains show "No changes needed"
- Current schedule is already optimal for the constraints
- Try increasing max shift window
- Try a busier junction with more trains

### Backend connection error
- Ensure Flask server is running: `python app.py`
- Check backend URL: http://localhost:5000
- Verify in Network tab: POST to `/admin/optimize-timetable`

---

## Alternative: Run Test Script

For quick testing without the UI:

```bash
python test_optimizer_demo.py
```

This will:
1. Send a demo optimization request
2. Print before/after comparison
3. Show recommended changes
4. Provide UI viewing instructions

---

## Expected UI Behavior

### Toggle Between Modes
1. Click **"Before"** button: See original schedule with standard styling
2. Click **"After"** button: See optimized schedule with highlights
3. **Legend updates** dynamically based on mode
4. **Comparison panel** shows current viewing state

### Station Popup Behavior
- **Before mode**: Single timing shown
- **After mode (unchanged train)**: Single timing shown
- **After mode (modified train)**: Before → After comparison with strikethrough

### Performance
- Optimization solve time: **10-200ms**
- Map rendering: **< 500ms**
- Total round-trip: **< 1 second** for typical scenarios

---

## Demo Values Summary

For quick copy-paste testing:

**Scenario 1 (Best for testing):**
- Station: `NDLS`
- Trains: `12301, 12302, 12951, 12429`
- Max Shift: `15`

**Scenario 2:**
- Station: `BCT`
- Trains: `12952, 12954, 12956`
- Max Shift: `10`

**Scenario 3:**
- Station: `HWH`
- Trains: `12301, 12303, 12305`
- Max Shift: `20`

---

## Success Criteria

✅ Backend returns 200 OK with optimization results  
✅ Before/After cards show different metrics  
✅ Optimizer metadata shows "optimal" or "feasible" status  
✅ Map renders with all train routes  
✅ Junction station is highlighted with larger marker  
✅ Toggle switches between Before/After modes  
✅ Legend updates based on current mode  
✅ Modified trains show visual distinction (color, weight, dash pattern)  
✅ Station popups show timing changes in After mode  
✅ Comparison summary panel displays correct statistics  
✅ Recommended changes table lists all modifications  

---

## Next Steps After Testing

Once you verify the feature works:

1. **Real Data Integration**: Connect to actual train schedules from your database
2. **Historical Analysis**: Query SearchLog collection for real transfer patterns
3. **Production Config**: Adjust `timetable_config.json` weights and constraints
4. **User Permissions**: Add authorization checks for admin-only access
5. **Export Functionality**: Add "Export Changes" button to download CSV of modifications
6. **Approval Workflow**: Build review/approve flow for schedule changes
7. **Impact Simulation**: "What-if" analysis before applying changes

