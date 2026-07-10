"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { NormalizedStation } from "@/lib/map/normalizeRoute";
import { MARKER_COLORS } from "@/lib/map/routeColors";
import { Clock, MapPin, Train, Timer } from "lucide-react";

interface StationMarkerProps {
  station: NormalizedStation;
  isShared?: boolean;
  sharedRouteCount?: number;
  routeColor: string;
  onClick?: () => void;
}

function createStationIcon(
  order: number,
  role: "origin" | "transfer" | "destination",
  isShared: boolean,
  routeColor: string
): L.DivIcon {
  const color = isShared ? MARKER_COLORS.shared : MARKER_COLORS[role];
  const size = role === "transfer" ? 32 : 40;
  const fontSize = role === "transfer" ? "0.75rem" : "0.9rem";
  const borderWidth = role === "origin" || role === "destination" ? 4 : 3;

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: ${borderWidth}px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Inter', sans-serif;
        font-size: ${fontSize};
        font-weight: 700;
        color: white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        ${role === "origin" || role === "destination" ? `box-shadow: 0 0 0 3px ${color}40, 0 3px 10px rgba(0,0,0,0.3);` : ""}
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

function formatTime(timeStr?: string): string {
  if (!timeStr || timeStr === "None") return "--:--";
  return timeStr.substring(0, 5);
}

export function StationMarker({
  station,
  isShared = false,
  sharedRouteCount = 1,
  routeColor,
  onClick,
}: StationMarkerProps) {
  const icon = createStationIcon(station.order, station.role, isShared, routeColor);

  const getRoleEmoji = (role: string) => {
    switch (role) {
      case "origin":
        return "🚉";
      case "destination":
        return "🏁";
      case "transfer":
        return "🔄";
      default:
        return "🚉";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "origin":
        return "Origin Station";
      case "destination":
        return "Destination Station";
      case "transfer":
        return "Transfer Station";
      default:
        return "Station";
    }
  };

  return (
    <Marker
      position={[station.latitude, station.longitude]}
      icon={icon}
      eventHandlers={{
        click: onClick,
      }}
    >
      <Popup maxWidth={280}>
        <div style={{ fontFamily: "'Inter', sans-serif", minWidth: "220px" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              marginBottom: "10px",
              paddingBottom: "10px",
              borderBottom: "2px solid #E5E7EB",
            }}
          >
            <div style={{ fontSize: "1.5rem" }}>{getRoleEmoji(station.role)}</div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "#111111",
                  marginBottom: "4px",
                  lineHeight: 1.2,
                }}
              >
                {station.name}
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#6B7280",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {getRoleLabel(station.role)}
              </div>
            </div>
          </div>

          {/* Station Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <DetailRow
              icon={<MapPin size={13} />}
              label="Code"
              value={station.code}
            />

            <DetailRow
              icon={<span style={{ fontSize: "0.9rem", fontWeight: 700 }}>#{station.order + 1}</span>}
              label="Journey Order"
              value=""
            />

            {station.trainNumber && (
              <DetailRow
                icon={<Train size={13} />}
                label="Train"
                value={station.trainNumber}
              />
            )}

            {station.arrivalTime && (
              <DetailRow
                icon={<Clock size={13} />}
                label="Arrival"
                value={formatTime(station.arrivalTime)}
              />
            )}

            {station.departureTime && (
              <DetailRow
                icon={<Clock size={13} />}
                label="Departure"
                value={formatTime(station.departureTime)}
              />
            )}

            {station.waitingTime && station.waitingTime > 0 && (
              <div
                style={{
                  marginTop: "6px",
                  padding: "8px",
                  background: "#FFF4ED",
                  border: "1px solid #FED7AA",
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.75rem",
                    color: "hsl(25, 90%, 55%)",
                    fontWeight: 600,
                  }}
                >
                  <Timer size={12} />
                  <span>Transfer Wait: {Math.floor(station.waitingTime / 60)}m</span>
                </div>
                {station.nextTrainNumber && (
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#6B7280",
                      marginTop: "4px",
                    }}
                  >
                    Next Train: {station.nextTrainNumber}
                  </div>
                )}
              </div>
            )}

            {isShared && sharedRouteCount > 1 && (
              <div
                style={{
                  marginTop: "6px",
                  padding: "8px",
                  background: "#F3F4F6",
                  border: "1px solid #E5E7EB",
                  borderRadius: "6px",
                  fontSize: "0.7rem",
                  color: "#6B7280",
                  fontWeight: 500,
                }}
              >
                Appears in {sharedRouteCount} route{sharedRouteCount > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "0.8rem",
      }}
    >
      <div style={{ color: "#9CA3AF", minWidth: "14px" }}>{icon}</div>
      <div style={{ color: "#6B7280", flex: 1 }}>{label}:</div>
      <div style={{ color: "#111111", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
    </div>
  );
}
