# Demo Setup - Complete Guide

## 🎯 Quick Start (2 Commands)

```bash
# Terminal 1 - Backend
python app.py

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Then open: http://localhost:3000/admin/dashboard

---

## 📋 What's Populated

### ✅ Dashboard (`/admin/dashboard`)
- 15,847 total searches
- 8,923 transfers (77% success)
- 6 animated metric cards

### ✅ Transfer Analytics (`/admin/transfer-analytics`)
- 15 stations with performance data
- Interactive bar chart
- 10 problematic train pairs

### ✅ Station Details (`/admin/station`)
- Search any station
- Detailed transfer metrics
- Top train pairs

### ✅ Timetable Optimizer (`/admin/optimizer`)
- Before/After route visualization
- Interactive map with timing changes
- Demo values: NDLS, 12301,12302,12951,12429, 15

---

## 🧪 Verify Everything Works

```bash
python test_demo_data.py
```

Should show: ✅ All tests passed!

---

## 📖 Documentation

| File | Purpose | When to Read |
|------|---------|--------------|
| **QUICK_DEMO_GUIDE.md** | 5-min setup | Start here |
| **DEMO_DATA_GUIDE.md** | Data breakdown | Understanding numbers |
| **DEMO_FEATURES_SUMMARY.md** | Complete overview | Before demo |
| **test_demo_data.py** | Automated tests | Verify setup |

---

## 🎯 Demo Flow (4 minutes)

1. **Dashboard** (30s) - "15K searches, 77% success"
2. **Analytics** (90s) - Show chart, point to NDLS (85%), problematic pairs
3. **Station Details** (60s) - Search NDLS, show 1,245 transfers
4. **Optimizer** (60s) - Run demo, toggle before/after

---

## 🔧 Troubleshooting

### Pages Load Forever
- Backend not running → `python app.py`
- Check: http://localhost:5000/health

### Wrong/No Data
- Old routes cached → Restart frontend
- Hard refresh: `Ctrl+Shift+R`

### Backend Errors
- Check terminal for Python errors
- MongoDB not needed (demo data only)

---

## 📊 Key Demo Numbers

**Memorize These:**
- 15,847 searches
- 77% success rate
- NDLS: 85% (best performer)
- 1,245 transfers at NDLS
- Train pair 12301→12302: 50% (needs optimization)

---

## ✅ Pre-Demo Checklist

- [ ] Backend running
- [ ] Frontend running
- [ ] Tests pass
- [ ] Browser tabs ready
- [ ] Demo values memorized

---

## 🎉 You're Ready!

All admin pages are populated with realistic demo data.  
No database configuration needed.  
Everything works out of the box.

**Good luck! 🚀**

---

## 📞 Quick Reference

**Backend:** http://localhost:5000  
**Frontend:** http://localhost:3000  
**Dashboard:** /admin/dashboard  
**Analytics:** /admin/transfer-analytics  
**Station:** /admin/station  
**Optimizer:** /admin/optimizer  

**Test Script:** `python test_demo_data.py`  
**Demo Values:** NDLS, 12301,12302,12951,12429, 15
