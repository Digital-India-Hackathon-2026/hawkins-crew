import axios from "axios";

// Re-export Station from the context (source of truth is StationsContext)
export type { Station } from "@/contexts/StationsContext";
import type { Station } from "@/contexts/StationsContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Types

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

// ─── PNR Status ──────────────────────────────────────────────────────────────

export interface PNRPassenger {
  number: string;
  booking_status: string;
  current_status: string;
}

export interface PNRData {
  pnr: string;
  train_number: string;
  train_name: string;
  journey_class: string;
  chart_prepared: string;
  source: string;
  destination: string;
  journey_date: string;
  boarding_date: string;
  departure_time: string;
  arrival_time: string;
  booking_status: string;
  current_status: string;
  last_updated: string;
  passengers: PNRPassenger[];
}

export interface PNRResponse {
  success: boolean;
  data?: PNRData;
  error?: string;
}

export async function checkPNRStatus(pnr: string): Promise<PNRResponse> {
  const res = await api.get<PNRResponse>(`/pnr/${pnr}`);
  return res.data;
}

// ─── Live Train Tracking ─────────────────────────────────────────────────────

export interface LiveStation {
  name: string;
  code: string;
  scheduled_arrival: string;
  actual_arrival: string;
  scheduled_departure: string;
  actual_departure: string;
  delay_arrival_min: number;
  day: number;
}

export interface LiveRouteStop {
  serial: string;
  station_name: string;
  station_code: string;
  distance: string;
  is_departed: string;
  day: number;
  scheduled_arrival: string;
  actual_arrival: string;
  scheduled_departure: string;
  actual_departure: string;
  delay_arrival_min: number;
  delay_departure_min: number;
  is_source: boolean;
  is_destination: boolean;
}

export interface LiveTrackingData {
  train_number: string;
  start_date: string;
  current_station: LiveStation;
  current_station_index: number;
  overall_delay_min: number;
  route: LiveRouteStop[];
}

export interface LiveTrackingResponse {
  success: boolean;
  data?: LiveTrackingData;
  error?: string;
}

export async function trackTrain(
  trainNumber: string,
  date?: string
): Promise<LiveTrackingResponse> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await api.get<LiveTrackingResponse>(`/trains/${trainNumber}/live`, { params });
  return res.data;
}

// ─── Seat Availability ───────────────────────────────────────────────────────

export interface AvailEntry {
  date: string;
  availability: string;
  confirm_pct: string;
}

export interface AvailabilityData {
  train_number: string;
  from_station: string;
  to_station: string;
  class_code: string;
  quota: string;
  availability: AvailEntry[];
}

export interface AvailabilityResponse {
  success: boolean;
  data?: AvailabilityData;
  error?: string;
}

export async function getAvailability(params: {
  train: string;
  from: string;
  to: string;
  date: string;
  class: string;
  quota?: string;
}): Promise<AvailabilityResponse> {
  const res = await api.get<AvailabilityResponse>("/availability", { params });
  return res.data;
}

// ─── Train History ───────────────────────────────────────────────────────────

export interface HistoryStation {
  station_code: string;
  station_name: string;
  station_name_full: string;
  state?: string;
  scheduled_arrival: string;
  scheduled_departure: string;
  day: number;
  delay_min: number;
  is_source: boolean;
  is_destination: boolean;
}

export interface TrainHistoryData {
  train_number: string;
  train_name: string;
  train_type: string;
  journey_date: string;
  total_stops: number;
  total_delay_min: number;
  average_delay_min: number;
  max_delay_min: number;
  max_delay_station: string;
  stations: HistoryStation[];
}

export interface TrainHistoryResponse {
  success: boolean;
  data?: TrainHistoryData;
  error?: string;
}

export async function trainHistory(
  trainNumber: string,
  date?: string
): Promise<TrainHistoryResponse> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await api.get<TrainHistoryResponse>(`/trains/${trainNumber}/history`, { params });
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
