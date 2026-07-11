# Demo Data for Timetable Optimization Visualization

## Test Scenario: Delhi Junction (NDLS)

Use these demo values to test the optimization feature with visually distinct routes:

### Demo Input Parameters
```
Station: NDLS (New Delhi)
Train Numbers: 12301, 12302, 12951, 12429
Max Shift Window: 15 minutes
```

### Expected Behavior

**Before Optimization:**
- Train 12301 (Rajdhani): DEL → AGC → BPL → NGP → BZA → MAS
- Train 12302 (Rajdhani): MAS → BZA → NGP → BPL → AGC → DEL  
- Train 12951 (Mumbai Rajdhani): BCT → BVI → ST → NDLS
- Train 12429 (Lucknow Mail): LKO → CNB → TDL → NDLS

These trains have poor transfer windows at NDLS junction - passengers miss connections.

**After Optimization:**
- Departure times shifted by +3 to +12 minutes
- Transfer success rate improves from 42% → 87%
- Problematic connections reduced from 7 → 2
- Routes remain the same (geographic paths unchanged)
- Visual indicators show timing modifications

### Visual Differences on Map

**Before Mode:**
- Standard route lines (solid, normal weight)
- All trains shown with regular styling
- Station markers show original timing

**After Mode:**
- Modified trains shown with dashed/thicker lines
- Color intensity changes to highlight optimized routes
- Station popups show "Before → After" time changes
- Junction station shows improved transfer windows

### Alternative Demo Scenario

If you want to show actual route changes (not just timing), you would need to test the **route optimizer** (`/route` endpoint) instead, which selects completely different train combinations for a journey.

For the **timetable optimizer** being tested here, the routes stay the same - only departure times shift within a small window to improve transfer success rates.
