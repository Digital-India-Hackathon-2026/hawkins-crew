"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useStations } from "@/contexts/StationsContext";
import type { RecommendedChange, TrainStop } from "@/lib/api";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface RouteMapProps {
  junctionStationCode: string;
  trains: RecommendedChange[];
  mode: "before" | "after";
}

const TRAIN_COLORS = [
  "hsl(25,90%,55%)",   // Orange
  "hsl(210,80%,60%)",  // Blue
  "hsl(270,70%,65%)",  // Purple
  "hsl(145,60%,45%)",  // Green
  "hsl(0,70%,60%)",    // Red
  "hsl(185,70%,50%)",  // Cyan
  "hsl(40,95%,55%)",   // Yellow
];

function FitBounds({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export function RouteMap({ junctionStationCode, trains, mode }: RouteMapProps) {
  const { stations } = useStations();

  const stationMap = useMemo(() => {
    const map = new Map();
    stations.forEach((s) => {
      if (s.latitude && s.longitude) {
        map.set(s.code, s);
      }
    });
    return map;
  }, [stations]);

  const allStations = useMemo(() => {
    const codes = new Set<string>();
    trains.forEach((train) => {
      train.route.forEach((code) => codes.add(code));
    });
    return Array.from(codes)
      .map((code) => stationMap.get(code))
      .filter((s) => s) as Array<{
      code: string;
      name: string;
      latitude: number;
      longitude: number;
    }>;
  }, [trains, stationMap]);

  const bounds = useMemo(() => {
    const b = L.latLngBounds([]);
    allStations.forEach((s) => {
      b.extend([s.latitude, s.longitude]);
    });
    return b;
  }, [allStations]);

  const junctionStation = stationMap.get(junctionStationCode);
  const center: [number, number] = junctionStation
    ? [junctionStation.latitude, junctionStation.longitude]
    : [20.5937, 78.9629];

  const junctionIcon = useMemo(
    () =>
      new L.Icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [32, 52],
        iconAnchor: [16, 52],
        popupAnchor: [0, -52],
        shadowSize: [52, 52],
      }),
    []
  );

  const regularIcon = useMemo(
    () =>
      new L.Icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [20, 33],
        iconAnchor: [10, 33],
        popupAnchor: [0, -33],
        shadowSize: [33, 33],
      }),
    []
  );

  if (allStations.length === 0) {
    return (
      <div
        style={{
          padding: "3rem",
          textAlign: "center",
          background: "var(--bg-card)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          color: "var(--text-muted)",
        }}
      >
        No station coordinates available for selected trains
      </div>
    );
  }

  return (
    <div style={{ height: "500px", borderRadius: "16px", overflow: "hidden", border: "1px solid var(--glass-border)" }}>
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={bounds} />

        {/* Train routes */}
        {trains.map((train, idx) => {
          const hasChanged = train.shiftMinutes > 0;
          const isAfterMode = mode === "after";

          // Color logic: changed trains get accent color in "after" mode
          let color = TRAIN_COLORS[idx % TRAIN_COLORS.length];
          if (hasChanged && isAfterMode) {
            color = "hsl(40,95%,55%)"; // Bright amber for modified routes
          }

          const routeCoords = train.route
            .map((code) => {
              const station = stationMap.get(code);
              return station ? [station.latitude, station.longitude] as [number, number] : null;
            })
            .filter((c) => c) as [number, number][];

          if (routeCoords.length < 2) return null;

          return (
            <Polyline
              key={`train-${train.trainNumber}-${mode}`}
              positions={routeCoords}
              pathOptions={{
                color,
                weight: hasChanged && isAfterMode ? 6 : 3,
                opacity: hasChanged && isAfterMode ? 1.0 : 0.65,
                dashArray: hasChanged && isAfterMode ? "12, 8" : undefined,
              }}
            >
              <Popup>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  Train {train.trainNumber}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {train.trainName}
                </div>
                {isAfterMode && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "6px 10px",
                      background: hasChanged ? "rgba(255,193,7,0.15)" : "rgba(76,175,80,0.15)",
                      border: hasChanged ? "1px solid rgba(255,193,7,0.3)" : "1px solid rgba(76,175,80,0.3)",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: hasChanged ? "hsl(40,95%,45%)" : "hsl(145,60%,40%)",
                    }}
                  >
                    {hasChanged ? `⚡ Modified: +${train.shiftMinutes} min` : "✓ No changes needed"}
                  </div>
                )}
              </Popup>
            </Polyline>
          );
        })}

        {/* Station markers */}
        {allStations.map((station) => {
          const isJunction = station.code === junctionStationCode;
          const icon = isJunction ? junctionIcon : regularIcon;

          const trainStops = trains
            .map((train) => {
              const stopIndex = train.route.indexOf(station.code);
              if (stopIndex === -1) return null;
              return {
                train,
                stop: train.stopsAt[stopIndex],
              };
            })
            .filter((t) => t) as Array<{
            train: RecommendedChange;
            stop: TrainStop;
          }>;

          return (
            <Marker key={station.code} position={[station.latitude, station.longitude]} icon={icon}>
              <Popup>
                <div style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "4px" }}>
                  {station.name}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginBottom: "8px",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {station.code}
                </div>
                {isJunction && (
                  <div
                    style={{
                      marginBottom: "8px",
                      padding: "4px 8px",
                      background: "rgba(50,180,100,0.1)",
                      border: "1px solid rgba(50,180,100,0.2)",
                      borderRadius: "6px",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: "hsl(145,60%,45%)",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    Junction Station
                  </div>
                )}
                {trainStops.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Trains at this station:
                    </div>
                    {trainStops.slice(0, 3).map(({ train, stop }) => {
                      const hasChanged = train.shiftMinutes > 0;
                      const showComparison = hasChanged && mode === "after";

                      return (
                        <div
                          key={train.trainNumber}
                          style={{
                            marginBottom: "6px",
                            padding: "6px 8px",
                            background: showComparison ? "rgba(255,193,7,0.08)" : "var(--bg-secondary)",
                            borderRadius: "6px",
                            border: showComparison ? "1px solid rgba(255,193,7,0.3)" : "1px solid var(--glass-border)",
                          }}
                        >
                          <div style={{ fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                            {showComparison && <span style={{ color: "hsl(40,95%,55%)" }}>⚡</span>}
                            {train.trainNumber}
                          </div>

                          {showComparison ? (
                            // Show before → after comparison
                            <>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                                <div style={{ textDecoration: "line-through", opacity: 0.6 }}>
                                  {stop.arrivalBefore && `Arr: ${stop.arrivalBefore}`}
                                  {stop.arrivalBefore && stop.departureBefore && " | "}
                                  {stop.departureBefore && `Dep: ${stop.departureBefore}`}
                                </div>
                                <div style={{ color: "hsl(145,60%,45%)", fontWeight: 600, marginTop: "2px" }}>
                                  {stop.arrivalAfter && `Arr: ${stop.arrivalAfter}`}
                                  {stop.arrivalAfter && stop.departureAfter && " | "}
                                  {stop.departureAfter && `Dep: ${stop.departureAfter}`}
                                </div>
                              </div>
                              <div
                                style={{
                                  fontSize: "0.65rem",
                                  color: "hsl(40,95%,55%)",
                                  marginTop: "4px",
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  background: "rgba(255,193,7,0.15)",
                                  borderRadius: "4px",
                                  display: "inline-block",
                                }}
                              >
                                +{train.shiftMinutes} min shift
                              </div>
                            </>
                          ) : (
                            // Show single timing
                            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                              {(mode === "before" ? stop.arrivalBefore : stop.arrivalAfter) && `Arr: ${mode === "before" ? stop.arrivalBefore : stop.arrivalAfter}`}
                              {(mode === "before" ? stop.arrivalBefore : stop.arrivalAfter) && (mode === "before" ? stop.departureBefore : stop.departureAfter) && " | "}
                              {(mode === "before" ? stop.departureBefore : stop.departureAfter) && `Dep: ${mode === "before" ? stop.departureBefore : stop.departureAfter}`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {trainStops.length > 3 && (
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        +{trainStops.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
