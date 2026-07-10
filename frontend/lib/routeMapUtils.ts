import type { Route, Segment, TrainSegment, Station } from "./api";
import type { PreparedRouteData, MapStation, MapTrainSegment } from "./routeTypes";

const SEGMENT_COLORS = [
  "hsl(215, 70%, 55%)", // Blue
  "hsl(145, 60%, 45%)", // Green
  "hsl(40, 95%, 50%)",  // Orange
  "hsl(280, 60%, 55%)", // Purple
  "hsl(0, 70%, 55%)",   // Red
  "hsl(180, 60%, 45%)", // Teal
  "hsl(25, 80%, 50%)",  // Brown-Orange
];

/**
 * Prepare route data for map visualization by extracting stations and segments
 * with geographic coordinates.
 */
export function prepareRouteForMap(
  route: Route,
  stations: Station[]
): PreparedRouteData {
  const stationsMap = new Map(stations.map(s => [s.code, s]));
  const mapStations: MapStation[] = [];
  const mapSegments: MapTrainSegment[] = [];
  const missingCoordinates: string[] = [];
  const visitedStationCodes = new Set<string>();

  let order = 0;
  let segmentIndex = 0;

  // Extract all travel segments
  const travelSegments = route.segments.filter(
    (s): s is TrainSegment => s.type === "travel"
  );

  if (travelSegments.length === 0) {
    return { stations: [], segments: [], missingCoordinates: [] };
  }

  // Process each train segment
  travelSegments.forEach((segment, idx) => {
    const fromCode = segment.from_station;
    const toCode = segment.to_station;
    const trainNumber = segment.train_number;
    const color = SEGMENT_COLORS[segmentIndex % SEGMENT_COLORS.length];

    // Add from station if not already visited
    if (!visitedStationCodes.has(fromCode)) {
      const stationData = stationsMap.get(fromCode);
      if (stationData && stationData.latitude && stationData.longitude) {
        mapStations.push({
          code: fromCode,
          name: stationData.name,
          latitude: stationData.latitude,
          longitude: stationData.longitude,
          order: order++,
          role: idx === 0 ? "origin" : "transfer",
          departureTime: segment.departure_time,
          trainNumber,
        });
      } else {
        missingCoordinates.push(fromCode);
      }
      visitedStationCodes.add(fromCode);
    }

    // Add to station
    const isLastSegment = idx === travelSegments.length - 1;
    if (!visitedStationCodes.has(toCode)) {
      const stationData = stationsMap.get(toCode);
      if (stationData && stationData.latitude && stationData.longitude) {
        mapStations.push({
          code: toCode,
          name: stationData.name,
          latitude: stationData.latitude,
          longitude: stationData.longitude,
          order: order++,
          role: isLastSegment ? "destination" : "transfer",
          arrivalTime: segment.arrival_time,
          trainNumber,
        });
      } else {
        missingCoordinates.push(toCode);
      }
      visitedStationCodes.add(toCode);
    } else if (isLastSegment) {
      // Update role to destination if it's the last segment
      const existingStation = mapStations.find(s => s.code === toCode);
      if (existingStation) {
        existingStation.role = "destination";
        existingStation.arrivalTime = segment.arrival_time;
      }
    }

    // Create segment
    mapSegments.push({
      trainNumber,
      fromStationCode: fromCode,
      toStationCode: toCode,
      stationCodes: [fromCode, toCode],
      departureTime: segment.departure_time,
      arrivalTime: segment.arrival_time,
      color,
    });

    segmentIndex++;
  });

  return {
    stations: mapStations,
    segments: mapSegments,
    missingCoordinates: Array.from(new Set(missingCoordinates)),
  };
}

/**
 * Calculate the geographic bounds for all stations in the route
 */
export function calculateBounds(stations: MapStation[]): [[number, number], [number, number]] | null {
  if (stations.length === 0) return null;

  const lats = stations.map(s => s.latitude);
  const lngs = stations.map(s => s.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return [[minLat, minLng], [maxLat, maxLng]];
}

/**
 * Format time string for display (HH:MM)
 */
export function formatMapTime(timeStr?: string): string {
  if (!timeStr || timeStr === "None") return "--:--";
  return timeStr.substring(0, 5);
}

/**
 * Get marker color based on station role
 */
export function getMarkerColor(role: "origin" | "transfer" | "destination"): string {
  switch (role) {
    case "origin":
      return "hsl(145, 60%, 45%)"; // Green
    case "destination":
      return "hsl(0, 70%, 55%)";   // Red
    case "transfer":
      return "hsl(40, 95%, 50%)";  // Orange
  }
}
