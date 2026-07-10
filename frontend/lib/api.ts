import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Types
export interface Station {
  code: string;
  name: string;
  state: string | null;
  zone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface TrainSegment {
  type: "travel";
  train_number: string;
  from_station: string;
  to_station: string;
  departure_time: string;
  arrival_time: string;
  departure_day: number;
  arrival_day: number;
}

export interface TransferSegment {
  type: "transfer";
  station: string;
  waiting_time_sec: number;
  waiting_time_min: number;
}

export type Segment = TrainSegment | TransferSegment;

export interface Route {
  rank: number;
  segments: Segment[];
  total_duration: number;
  total_waiting: number;
  num_transfers: number;
  trains_used: string[];
  score: number;
  score_breakdown: {
    travel_time: number;
    transfer_penalty: number;
    waiting_time: number;
    centrality_bonus: number;
  };
}

export interface RouteResponse {
  status: "found" | "not_found";
  from: string;
  to: string;
  date: string;
  routes?: Route[];
  message?: string;
}

export interface TrainInfo {
  number: string;
  name: string;
  type: string;
  zone: string;
  distance: number;
  duration_h: number;
  duration_m: number;
  from_station_code: string;
  from_station_name: string;
  to_station_code: string;
  to_station_name: string;
  departure: string;
  arrival: string;
  classes: string;
  first_ac: number;
  second_ac: number;
  third_ac: number;
  sleeper: number;
  chair_car: number;
  first_class: number;
  return_train: string;
}

export interface TrainStop {
  station_code: string;
  station_name: string;
  station_name_full?: string;
  arrival: string;
  departure: string;
  day: number;
  state?: string;
  zone?: string;
}

// API functions
export async function findRoutes(
  from: string,
  to: string,
  date: string
): Promise<RouteResponse> {
  const res = await api.post<RouteResponse>("/route", { from, to, date });
  return res.data;
}

export async function getAllStations(): Promise<Station[]> {
  const res = await api.get<{ stations: Station[]; total: number }>(
    "/stations/all"
  );
  return res.data.stations;
}

export async function searchTrains(query: string): Promise<TrainInfo[]> {
  const res = await api.get<{ trains: TrainInfo[] }>("/trains/search", {
    params: { q: query },
  });
  return res.data.trains;
}

export async function searchTrainsBetweenStations(
  from: string,
  to: string
): Promise<{ train_number: string; train_name: string; type: string; departure: string; arrival: string; distance: number }[]> {
  const res = await api.get("/trains/search", {
    params: { from, to },
  });
  return res.data.trains;
}

export async function getTrainInfo(
  number: string
): Promise<{ train: TrainInfo; schedule: TrainStop[]; total_stops: number }> {
  const res = await api.get(`/trains/${number}`);
  return res.data;
}

export async function getStationBoard(code: string): Promise<{
  station: Station;
  arrivals: any[];
  departures: any[];
  total_arrivals: number;
  total_departures: number;
}> {
  const res = await api.get(`/stations/${code}/board`);
  return res.data;
}

export async function getFare(params: {
  train: string;
  from: string;
  to: string;
  class: string;
}): Promise<{
  train_number: string;
  train_name: string;
  from_station: string;
  to_station: string;
  segment_distance_km: number;
  selected_class: string;
  fare: number;
  class_fares: Record<string, number>;
  available_classes: string[];
  note: string;
}> {
  const res = await api.get("/fare", { params });
  return res.data;
}

// Utility: format duration from seconds
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// Utility: format time string
export function formatTime(timeStr: string | null): string {
  if (!timeStr || timeStr === "None") return "--:--";
  return timeStr.substring(0, 5); // "HH:MM"
}
