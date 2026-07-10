# Route Map Visualization - Timetable Optimizer

## Overview

The Timetable Optimizer page now includes an interactive map visualization that shows train routes before and after optimization, making it easy to see the spatial impact of schedule changes.

## Features

### Before/After Toggle
- Single map with a toggle control at the top
- Switch between "Before" and "After" states to compare routes
- Smooth transition when switching modes

### Map Elements

**Station Markers:**
- **Regular stations**: Standard blue markers (20x33px)
- **Junction station**: Larger marker (32x52px) to highlight the optimization focus
- Click any marker to see:
  - Station name and code
  - All trains stopping there
  - Arrival/departure times (before or after, depending on mode)
  - Time deltas for modified schedules (in "After" mode)

**Train Routes:**
- Each train shown as a colored polyline connecting its stations
- 7 distinct colors rotate for up to 7 trains
- In "After" mode:
  - Modified trains shown with thicker, dashed lines
  - Popup shows "+X min" badge
  - Time deltas displayed at each stop

**Legend:**
- Visual guide showing:
  - Train route lines
  - Modified schedule indicator (after mode only)
  - Station markers (regular vs junction)

### Auto-Fit Bounds
- Map automatically zooms/pans to show all stations in the selected routes
- Padding ensures markers aren't cut off at edges

## Data Flow

### API Enhancement
The `/api/admin/optimize` endpoint was enhanced to include:

```typescript
{
  route: string[],           // Station codes in order
  stopsAt: [{
    stationCode: string,
    arrivalBefore: string | null,
    departureBefore: string | null,
    arrivalAfter: string | null,
    departureAfter: string | null,
  }]
}
```

### Station Coordinates
- Sourced from existing `stations.json` GeoJSON file
- Accessed via `StationsContext` hook
- Coordinates format: `[longitude, latitude]` in GeoJSON, converted to `[lat, lng]` for Leaflet

### Mock Routes
For the mocked optimizer, predefined station routes are used:
- `NDLS`: Delhi → Agra → Bhopal → Nagpur → Pune
- `CSMT`: Mumbai → Pune → Bhopal → Nagpur → Delhi
- `PUNE`: Pune → Bhopal → Delhi
- Default fallback route for other stations

## Technical Implementation

### Libraries
- **Leaflet**: Core mapping library (v1.9.4)
- **React-Leaflet**: React wrapper (v5.0.0)
- **OpenStreetMap**: Tile layer (free, no API key required)

### Component Structure

```
RouteMap (components/admin/RouteMap.tsx)
├── MapContainer (react-leaflet)
│   ├── TileLayer (OSM tiles)
│   ├── FitBounds (auto-zoom utility)
│   ├── Polyline (per train)
│   │   └── Popup (train info)
│   └── Marker (per station)
│       └── Popup (station info + trains)
```

### Dynamic Import
The map component is dynamically imported with `next/dynamic` and `ssr: false` to:
- Avoid SSR issues with Leaflet (which relies on `window`)
- Show a loading state while the map loads
- Reduce initial bundle size

### Styling
- Map height: 500px
- Border radius: 16px to match admin card style
- Colors from existing design system (`--accent`, etc.)
- Leaflet CSS imported in `globals.css`

## Visual Indicators

### "Before" Mode
- All trains shown with solid lines (3px width)
- Standard opacity (0.7)
- Station popups show original times

### "After" Mode
- **Unchanged trains**: Same as before (solid, 3px, 0.7 opacity)
- **Modified trains**:
  - Thicker line (5px)
  - Higher opacity (0.9)
  - Dashed pattern (10px dash, 5px gap)
  - Orange badge in route popup showing "+X min"
  - Time deltas in station popups: "14:24 → 14:32 (+8m)"

## User Flow

1. Select junction station + trains in configuration panel
2. Click "Run Optimization"
3. See before/after comparison cards
4. **NEW:** See map with "Before" mode active by default
5. Click train routes or stations to explore details
6. Toggle to "After" mode to see modified schedules
7. Modified trains visually stand out with dashed lines
8. Scroll down to see recommended timetable changes table

## Performance

- Only selected trains + their stations are rendered
- MVP scope: 6-10 trains max (easily handled)
- Dynamic import reduces initial page load
- Station coordinate lookup is memoized

## Limitations & Future Enhancements

**Current Limitations:**
- Mock data uses predefined station routes (not real train schedules)
- Polylines are straight connections (not actual track curvature)
- No intermediate waypoints between stations shown

**When Integrating Real Optimizer:**
- Backend should return actual station sequences for each train
- Can enhance with actual track geometry (GeoJSON LineStrings) if available
- Consider adding:
  - Platform numbers as labels
  - Real-time delay indicators
  - Alternative route suggestions overlaid

## File Changes

### New Files
- `components/admin/RouteMap.tsx` - Map component
- `MAP_VISUALIZATION.md` - This documentation

### Modified Files
- `app/api/admin/optimize/route.ts` - Enhanced response with route/stops data
- `app/admin/optimizer/page.tsx` - Added map section + toggle
- `lib/api.ts` - Added `TrainStop` interface + updated `RecommendedChange`
- `app/globals.css` - Added Leaflet CSS import
- `package.json` - Added leaflet dependencies

### Dependencies Added
```json
{
  "@types/leaflet": "^1.9.21",
  "leaflet": "^1.9.4",
  "react-leaflet": "^5.0.0"
}
```

## Example Screenshots

*Since this is a backend implementation, here's what the UI should look like:*

**Before Mode:**
- All train routes visible as solid colored lines
- Junction station with larger marker at center
- Clean, minimal legend at top

**After Mode:**
- Modified trains shown with thicker dashed lines
- Orange time delta badges on modified routes
- Station popups show old → new times

## Testing

```bash
# Start dev server
cd frontend
npm run dev

# Navigate to admin dashboard
# Click logo → Admin mode
# Go to "Timetable Optimizer"
# Fill in:
#   - Station: NDLS (or any station)
#   - Trains: 12345, 12346, 12347
#   - Max shift: 10 minutes
# Click "Run Optimization"
# Scroll to map section
# Toggle between Before/After
# Click markers and routes to see popups
```

## Integration with Real Optimizer

When swapping in the real CP-SAT backend:

1. **Backend Response Must Include:**
   - For each train: array of station codes in route order
   - For each station: before/after arrival & departure times
   - Station codes that match those in `stations.json`

2. **Frontend Changes:**
   - None required if response matches `RecommendedChange` interface
   - Map will automatically render real routes

3. **Optional Enhancements:**
   - Add actual track geometry from railway GIS data
   - Show platform assignments (if optimizer considers them)
   - Add conflict visualization (overlapping trains at same time/platform)

## Browser Compatibility

- Modern browsers with ES6+ support
- Leaflet works on all major browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive (touch gestures for pan/zoom work)
