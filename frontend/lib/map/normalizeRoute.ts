import type { Route, Station, TrainSegment } from "@/lib/api";

export interface NormalizedStation {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
  role: "origin" | "transfer" | "destination";
  arrivalTime?: string;
  departureTime?: string;
  trainNumber?: string;
  trainName?: string;
  waitingTime?: number; // seconds
  nextTrainNumber?: string;
  platform?: string;
}

export interface NormalizedTrainSegment {
  trainNumber: string;
  trainName?: string;
  fromStationCode: string;
  toStationCode: string;
  stationCodes: string[];
  departureTime: string;
  arrivalTime: string;
  departureDay: number;
  arrivalDay: number;
  color: string;
  coordinates: Array<{ lat: number; lng: number }>;
}

export interface NormalizedRoute {
  routeIndex: number;
  rank: number;
  stations: NormalizedStation[];
  trainSegments: NormalizedTrainSegment[];
  totalDuration: number;
  totalWaiting: number;
  numTransfers: number;
  trainsUsed: string[];
  score: number;
  scoreBreakdown: Record<string, number>;
  color: string;
  distance: number; // calculated from coordinates
  missingStations: string[];
}

/**
 * Normalize a single route for map visualization
 */
export function normalizeRoute(
  route: Route,
  routeIndex: number,
  stations: Station[],
  routeColor: string,
  trainColors: string[]
): NormalizedRoute {
  const stationsMap = new Map(stations.map(s => [s.code, s]));
  const normalizedStations: NormalizedStation[] = [];
  const normalizedSegments: NormalizedTrainSegment[] = [];
  const missingStations: string[] = [];
  const visitedStationCodes = new Set<string>();

  let order = 0;
  let trainColorIndex = 0;

  // Extract travel segments
  const travelSegments = route.segments.filter(
    (s): s is TrainSegment => s.type === "travel"
  );

  // Track waiting times at transfer stations
  const transferWaitingTimes = new Map<string, number>();
  for (let i = 0; i < route.segments.length; i++) {
    const seg = route.segments[i];
    if (seg.type === "transfer") {
      transferWaitingTimes.set(seg.station, seg.waiting_time_sec);
    }
  }

  // Process each train segment
  travelSegments.forEach((segment, idx) => {
    const fromCode = segment.from_station;
    const toCode = segment.to_station;
    const trainNumber = segment.train_number;
    const trainName = segment.train_name;
    const trainColor = trainColors[trainColorIndex % trainColors.length];

    const segmentCoordinates: Array<{ lat: number; lng: number }> = [];

    // Add from station if not already visited
    if (!visitedStationCodes.has(fromCode)) {
      const stationData = stationsMap.get(fromCode);
      if (stationData && stationData.latitude && stationData.longitude) {
        normalizedStations.push({
          code: fromCode,
          name: stationData.name,
          latitude: stationData.latitude,
          longitude: stationData.longitude,
          order: order++,
          role: idx === 0 ? "origin" : "transfer",
          departureTime: segment.departure_time,
          trainNumber,
        });
        segmentCoordinates.push({
          lat: stationData.latitude,
          lng: stationData.longitude,
        });
      } else {
        missingStations.push(fromCode);
      }
      visitedStationCodes.add(fromCode);
    } else {
      // Already visited, just add coordinates
      const stationData = stationsMap.get(fromCode);
      if (stationData && stationData.latitude && stationData.longitude) {
        segmentCoordinates.push({
          lat: stationData.latitude,
          lng: stationData.longitude,
        });
      }
    }

    // Add to station
    const isLastSegment = idx === travelSegments.length - 1;
    if (!visitedStationCodes.has(toCode)) {
      const stationData = stationsMap.get(toCode);
      if (stationData && stationData.latitude && stationData.longitude) {
        const waitingTime = transferWaitingTimes.get(toCode);
        const nextTrain = idx < travelSegments.length - 1
          ? travelSegments[idx + 1].train_number
          : undefined;

        normalizedStations.push({
          code: toCode,
          name: stationData.name,
          latitude: stationData.latitude,
          longitude: stationData.longitude,
          order: order++,
          role: isLastSegment ? "destination" : "transfer",
          arrivalTime: segment.arrival_time,
          trainNumber,
          waitingTime,
          nextTrainNumber: nextTrain,
        });
        segmentCoordinates.push({
          lat: stationData.latitude,
          lng: stationData.longitude,
        });
      } else {
        missingStations.push(toCode);
      }
      visitedStationCodes.add(toCode);
    } else if (isLastSegment) {
      // Update role to destination
      const existingStation = normalizedStations.find(s => s.code === toCode);
      if (existingStation) {
        existingStation.role = "destination";
        existingStation.arrivalTime = segment.arrival_time;
      }
      // Add coordinates
      const stationData = stationsMap.get(toCode);
      if (stationData && stationData.latitude && stationData.longitude) {
        segmentCoordinates.push({
          lat: stationData.latitude,
          lng: stationData.longitude,
        });
      }
    }

    // Create normalized segment
    if (segmentCoordinates.length >= 2) {
      normalizedSegments.push({
        trainNumber,
        trainName,
        fromStationCode: fromCode,
        toStationCode: toCode,
        stationCodes: [fromCode, toCode],
        departureTime: segment.departure_time,
        arrivalTime: segment.arrival_time,
        departureDay: segment.departure_day,
        arrivalDay: segment.arrival_day,
        color: trainColor,
        coordinates: segmentCoordinates,
      });
    }

    trainColorIndex++;
  });

  // Calculate distance from coordinates
  const allCoordinates = normalizedSegments.flatMap(seg => seg.coordinates);
  let distance = 0;
  for (let i = 0; i < allCoordinates.length - 1; i++) {
    const R = 6371; // Earth's radius in km
    const dLat = ((allCoordinates[i + 1].lat - allCoordinates[i].lat) * Math.PI) / 180;
    const dLon = ((allCoordinates[i + 1].lng - allCoordinates[i].lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((allCoordinates[i].lat * Math.PI) / 180) *
        Math.cos((allCoordinates[i + 1].lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distance += R * c;
  }

  return {
    routeIndex,
    rank: route.rank,
    stations: normalizedStations,
    trainSegments: normalizedSegments,
    totalDuration: route.total_duration,
    totalWaiting: route.total_waiting,
    numTransfers: route.num_transfers,
    trainsUsed: route.trains_used,
    score: route.score,
    scoreBreakdown: route.score_breakdown,
    color: routeColor,
    distance: Math.round(distance),
    missingStations: Array.from(new Set(missingStations)),
  };
}

/**
 * Normalize all routes
 */
export function normalizeAllRoutes(
  routes: Route[],
  stations: Station[],
  routeColors: string[],
  trainColors: string[]
): NormalizedRoute[] {
  return routes.map((route, index) =>
    normalizeRoute(route, index, stations, routeColors[index], trainColors)
  );
}

/**
 * Find shared stations across routes
 */
export interface SharedStation {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  routeIndices: number[];
  roles: Array<"origin" | "transfer" | "destination">;
}

export function findSharedStations(normalizedRoutes: NormalizedRoute[]): SharedStation[] {
  const stationMap = new Map<string, SharedStation>();

  normalizedRoutes.forEach(route => {
    route.stations.forEach(station => {
      const existing = stationMap.get(station.code);
      if (existing) {
        existing.routeIndices.push(route.routeIndex);
        if (!existing.roles.includes(station.role)) {
          existing.roles.push(station.role);
        }
      } else {
        stationMap.set(station.code, {
          code: station.code,
          name: station.name,
          latitude: station.latitude,
          longitude: station.longitude,
          routeIndices: [route.routeIndex],
          roles: [station.role],
        });
      }
    });
  });

  // Return only stations that appear in multiple routes
  return Array.from(stationMap.values()).filter(s => s.routeIndices.length > 1);
}
