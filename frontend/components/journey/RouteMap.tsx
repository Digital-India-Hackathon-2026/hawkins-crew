"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L, { LatLngBounds, LatLngExpression, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Route, Station } from "@/lib/api";
import { prepareRouteForMap, calculateBounds, formatMapTime, getMarkerColor } from "@/lib/routeMapUtils";
import type { MapStation } from "@/lib/routeTypes";
import { RouteMapLegend } from "./RouteMapLegend";
import { RouteSummaryOverlay } from "./RouteSummaryOverlay";
import { AlertCircle } from "lucide-react";

interface RouteMapProps {
  route: Route;
  stations: Station[];
  className?: string;
}

// Component to handle map bounds fitting
function MapBoundsFitter({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [bounds, map]);

  return null;
}

// Create custom marker icon
function createNumberedIcon(
  order: number,
  role: "origin" | "transfer" | "destination"
): DivIcon {
  const color = getMarkerColor(role);
  const size = role === "transfer" ? 28 : 36;
  const fontSize = role === "transfer" ? "0.7rem" : "0.85rem";

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Inter', sans-serif;
        font-size: ${fontSize};
        font-weight: 700;
        color: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ">
        ${order + 1}
      </div>
    `,
    className: "custom-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function RouteMap({ route, stations, className }: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Prepare route data
  const routeData = useMemo(() => {
    return prepareRouteForMap(route, stations);
  }, [route, stations]);

  // Calculate bounds
  const bounds = useMemo(() => {
    const calculatedBounds = calculateBounds(routeData.stations);
    if (!calculatedBounds) return null;
    return new LatLngBounds(
      [calculatedBounds[0][0], calculatedBounds[0][1]],
      [calculatedBounds[1][0], calculatedBounds[1][1]]
    );
  }, [routeData.stations]);

  // Build polylines for each segment
  const segmentLines = useMemo(() => {
    return routeData.segments.map((segment) => {
      const points: LatLngExpression[] = [];
      segment.stationCodes.forEach((code) => {
        const station = routeData.stations.find((s) => s.code === code);
        if (station) {
          points.push([station.latitude, station.longitude]);
        }
      });
      return { points, color: segment.color };
    });
  }, [routeData]);

  // Empty state
  if (routeData.stations.length === 0) {
    return (
      <div
        className={className}
        style={{
          minHeight: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAFA",
          borderRadius: "12px",
          border: "1px solid #E5E7EB",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center", color: "#6B7280" }}>
          <AlertCircle size={32} style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>
            Unable to display map: No station coordinates available
          </p>
        </div>
      </div>
    );
  }

  // Default center (if bounds calculation fails)
  const defaultCenter: LatLngExpression =
    routeData.stations.length > 0
      ? [routeData.stations[0].latitude, routeData.stations[0].longitude]
      : [20.5937, 78.9629]; // India center

  return (
    <div className={className} style={{ position: "relative" }}>
      {/* Warning for missing coordinates */}
      {routeData.missingCoordinates.length > 0 && (
        <div
          style={{
            marginBottom: "12px",
            padding: "10px 14px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "8px",
            fontSize: "0.8rem",
            color: "hsl(0,70%,45%)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={14} />
          <span>
            Some stations could not be plotted: {routeData.missingCoordinates.join(", ")}
          </span>
        </div>
      )}

      {/* Map Container */}
      <div
        style={{
          height: "500px",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #E5E7EB",
          position: "relative",
        }}
      >
        <MapContainer
          center={defaultCenter}
          zoom={6}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Fit bounds */}
          <MapBoundsFitter bounds={bounds} />

          {/* Draw polylines for each segment */}
          {segmentLines.map((line, idx) => (
            <Polyline
              key={idx}
              positions={line.points}
              pathOptions={{
                color: line.color,
                weight: 4,
                opacity: 0.8,
              }}
            />
          ))}

          {/* Station markers */}
          {routeData.stations.map((station) => (
            <Marker
              key={station.code}
              position={[station.latitude, station.longitude]}
              icon={createNumberedIcon(station.order, station.role)}
            >
              <Popup>
                <div style={{ fontFamily: "'Inter', sans-serif", minWidth: "180px" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: "#111111",
                      marginBottom: "6px",
                      borderBottom: "1px solid #E5E7EB",
                      paddingBottom: "6px",
                    }}
                  >
                    {station.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: "8px" }}>
                    Code: <strong>{station.code}</strong>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: "4px" }}>
                    Order: <strong>#{station.order + 1}</strong>
                  </div>
                  {station.departureTime && (
                    <div style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: "4px" }}>
                      Departure: <strong>{formatMapTime(station.departureTime)}</strong>
                    </div>
                  )}
                  {station.arrivalTime && (
                    <div style={{ fontSize: "0.75rem", color: "#6B7280", marginBottom: "4px" }}>
                      Arrival: <strong>{formatMapTime(station.arrivalTime)}</strong>
                    </div>
                  )}
                  {station.trainNumber && (
                    <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                      Train: <strong>{station.trainNumber}</strong>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Summary Overlay - Top Right */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 1000,
            maxWidth: "calc(100% - 32px)",
          }}
        >
          <RouteSummaryOverlay
            totalDuration={route.total_duration}
            totalWaiting={route.total_waiting}
            numTransfers={route.num_transfers}
            numTrains={route.trains_used.length}
          />
        </div>

        {/* Legend - Bottom Left */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "16px",
            zIndex: 1000,
            maxWidth: "calc(100% - 32px)",
          }}
        >
          <RouteMapLegend />
        </div>
      </div>
    </div>
  );
}
