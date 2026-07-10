import type { Route } from "./api";

export type StationRole = "origin" | "transfer" | "destination";

export interface MapStation {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
  role: StationRole;
  arrivalTime?: string;
  departureTime?: string;
  trainNumber?: string;
  trainName?: string;
}

export interface MapTrainSegment {
  trainNumber?: string;
  trainName?: string;
  fromStationCode: string;
  toStationCode: string;
  stationCodes: string[];
  departureTime?: string;
  arrivalTime?: string;
  color: string;
}

export interface PreparedRouteData {
  stations: MapStation[];
  segments: MapTrainSegment[];
  missingCoordinates: string[];
}
