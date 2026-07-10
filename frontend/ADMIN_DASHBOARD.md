# Government Administration Dashboard

## Overview

The admin dashboard is a separate view within the Prayan application designed for government railway administrators to analyze journey planning performance and optimize train timetables.

## Navigation

Click the **logo in the top-left corner** of the navigation bar to toggle between:
- **Passenger Mode** (Train icon, "Railway" label) - Default journey planner view
- **Admin Mode** (Shield icon, "Admin" label) - Government dashboard

## Features

### 1. Dashboard (`/admin/dashboard`)
Key performance metrics:
- Total journey searches
- Total transfers attempted
- Successful vs. failed transfers
- Overall success rate
- Average waiting time

**Data Source:** Real MongoDB aggregation from `ISearchLog` collection

### 2. Transfer Analytics (`/admin/transfer-analytics`)
- Success rate by station (top 10, with bar chart)
- Detailed station performance table
- Problematic train pairs with failure counts

**Data Source:** Real MongoDB aggregation from `ISearchLog` collection

### 3. Station Details (`/admin/station`)
- Station search and selection
- Per-station transfer metrics
- Top train pairs at selected station

**Data Source:** Real MongoDB aggregation from `ISearchLog` collection

### 4. Timetable Optimizer (`/admin/optimizer`)
- Select station and trains to optimize
- Configure max shift window (default ±10 minutes)
- View before/after metrics comparison
- Recommended timetable changes table

**Data Source:** **MOCKED** - `/api/admin/optimize` returns pre-built JSON. Swap this route's internals with a real CP-SAT/OR-Tools backend when ready.

### 5. Recommendations (`/admin/recommendations`)
- List of optimization recommendations
- Categorized by type (timing, platform, frequency, route)
- Prioritized (high, medium, low)
- Estimated impact

**Data Source:** **MOCKED** - Static list in the component. In production, source from optimizer results.

## API Routes

### Real Data (MongoDB)
- `GET /api/admin/dashboard-metrics` - Overall metrics
- `GET /api/admin/transfer-analytics` - Station & train pair analytics
- `GET /api/admin/station/[code]` - Per-station details

### Mocked Data
- `POST /api/admin/optimize` - Timetable optimization (simulated 2s delay)

## Data Model

All real analytics are derived from the existing `ISearchLog` schema:
- `sourceStation`, `destinationStation`
- `routes[].legs[].transfer` - Contains `stationCode`, `waitingDuration`, `feasibilityScore`
- Transfer success is determined by `feasibilityScore >= 70`

## Seeding Demo Data

The dashboard needs journey search logs to display real analytics. To populate the database with realistic demo data:

```bash
cd frontend
npm run seed
```

This will:
- Connect to MongoDB (requires `MONGODB_URI` in `.env.local`)
- Clear existing logs
- Insert 50 demo journey search logs with:
  - Indian station names (NDLS, CSMT, PUNE, etc.)
  - Real train number formats (12xxx, 17xxx)
  - Plausible transfer patterns (70-75% success rate)
  - Varied waiting times and transfer stations

## Environment Variables

Required in `frontend/.env.local`:

```env
MONGODB_URI=mongodb+srv://...
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Design System

The admin dashboard follows the existing design tokens:
- Colors: `var(--accent)`, `var(--text-primary)`, `var(--bg-card)`, etc.
- Typography: Inter font, 800 weight for headings
- Cards: `--radius-lg` (16px), `--glass-border`
- Charts: recharts with matching color palette

## Next Steps

To integrate the real CP-SAT optimizer:

1. Build the Python/Flask optimizer endpoint using OR-Tools
2. Update `/api/admin/optimize/route.ts` to proxy to the Flask backend instead of returning mock data
3. Adjust the `OptimizerResult` interface if the real optimizer returns additional fields
4. The frontend UI is already built and will work seamlessly once the backend is swapped in

## File Structure

```
frontend/
├── app/
│   ├── admin/
│   │   ├── layout.tsx                    # Admin shell with sidebar
│   │   ├── page.tsx                      # Redirects to /dashboard
│   │   ├── dashboard/page.tsx            # Main metrics
│   │   ├── transfer-analytics/page.tsx   # Charts & tables
│   │   ├── station/page.tsx              # Station selector & details
│   │   ├── optimizer/page.tsx            # Timetable optimizer UI
│   │   └── recommendations/page.tsx      # Recommendation list
│   └── api/
│       └── admin/
│           ├── dashboard-metrics/route.ts
│           ├── transfer-analytics/route.ts
│           ├── station/[code]/route.ts
│           └── optimize/route.ts          # ← MOCKED
├── components/
│   └── layout/
│       └── Navbar.tsx                     # Updated with mode toggle
├── lib/
│   └── api.ts                             # Admin API types & functions
└── scripts/
    └── seedDemoLogs.ts                    # Demo data generator
```
