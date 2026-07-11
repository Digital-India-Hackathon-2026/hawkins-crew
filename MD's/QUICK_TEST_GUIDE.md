# Quick Test Guide - Timetable Optimizer Map

## 🚀 Quick Start (3 Steps)

### 1. Start Services
```bash
# Terminal 1 - Backend
python app.py

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 2. Open Optimizer Page
```
http://localhost:3000/admin/optimizer
```

### 3. Enter Demo Values
```
Station: NDLS
Trains: 12301, 12302, 12951, 12429
Max Shift: 15
```

Click **"Run Optimization"**

---

## 📊 What You'll See

### Before Mode (Default)
- Standard route lines
- Gray legend
- Single timings in popups

### After Mode (Toggle to see)
- 🟡 **Amber dashed lines** = Modified trains
- **Thin solid lines** = Unchanged trains
- Amber-tinted legend
- Before → After comparison in popups

### Success Indicators
✅ Success rate improves (e.g., 42% → 78%)  
✅ Problematic connections decrease  
✅ Status shows "OPTIMAL" or "FEASIBLE"  
✅ Map shows visual differences between modes  

---

## 🎯 Visual Differences to Check

| Element | Before Mode | After Mode |
|---------|-------------|------------|
| Modified train lines | Standard color | 🟡 Bright amber, dashed, thick |
| Unchanged train lines | Standard color | Standard color (same) |
| Legend background | Gray | 🟡 Amber tint |
| Station popups | Single time | Before → After with strikethrough |
| Summary panel | Gray | 🟡 Amber tint |

---

## 🔧 Troubleshooting

**"No candidates" error?**  
→ Use the demo values above (they're real train data)

**Map is blank?**  
→ Trains lack GPS coordinates, use NDLS station

**No visual difference between Before/After?**  
→ Check if "Routes Modified" shows > 0  
→ Look for amber dashed lines in After mode  

---

## 📝 Understanding the Results

### This is a TIMING optimizer, not a ROUTE optimizer

**Routes stay the same** (geographic paths don't change)  
**Timings shift** (departure times adjust by 5-15 minutes)  

**Why?** Because we're optimizing transfer windows at a junction, not finding different trains.

### Visual indicators show:
- Which trains had timing adjusted (amber, dashed)
- By how much (popup shows "+X min")
- Impact on transfers (metrics panel)

---

## 🎨 Color Legend

🟡 **Bright Amber** = Modified train (shifted departure time)  
🔵 **Standard Blue/Orange** = Unchanged train  
⚡ **Lightning Icon** = Optimization applied  
✓ **Green Checkmark** = No changes needed  

---

## ⏱️ Expected Performance

- Backend solve time: **10-200ms**
- Map render: **< 500ms**
- Total: **< 1 second**

---

## 📂 Demo Alternatives

If NDLS doesn't work, try:

```
Station: BCT
Trains: 12952, 12954, 12956
Max Shift: 10
```

or

```
Station: HWH  
Trains: 12301, 12303, 12305
Max Shift: 20
```

---

## 🔍 What to Report

✅ **Working:** Before/After toggle shows visual differences  
✅ **Working:** Modified trains are amber and dashed  
✅ **Working:** Station popups show timing comparison  
✅ **Working:** Metrics show improvement  

❌ **Issue:** Report if any of the above don't work

---

## 📚 Full Documentation

For detailed explanation, see:
- `TEST_OPTIMIZER_INSTRUCTIONS.md` - Complete testing guide
- `OPTIMIZER_MAP_IMPROVEMENTS.md` - Technical implementation details
- `DEMO_OPTIMIZATION_DATA.md` - Test scenario explanations

---

## ✨ Success Criteria

You should see:
1. ✅ Map loads with train routes
2. ✅ Toggle switches between Before/After
3. ✅ After mode shows amber dashed lines for modified trains
4. ✅ Legend changes based on mode
5. ✅ Station popups show before → after timing
6. ✅ Metrics show improvement (success rate up, problems down)

**If all 6 work → Feature is ready! 🎉**
