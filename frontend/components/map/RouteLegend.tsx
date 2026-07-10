"use client";

import { MapPin, Circle, Award } from "lucide-react";
import { MARKER_COLORS } from "@/lib/map/routeColors";

interface RouteLegendProps {
  routeColors: Array<{ label: string; color: string }>;
  showTrainColors?: boolean;
  trainColors?: Array<{ trainNumber: string; color: string }>;
}

export function RouteLegend({
  routeColors,
  showTrainColors = false,
  trainColors = [],
}: RouteLegendProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "12px 14px",
        background: "rgba(255, 255, 255, 0.98)",
        borderRadius: "10px",
        border: "1px solid #E5E7EB",
        fontSize: "0.75rem",
        boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
        maxWidth: "240px",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontWeight: 700,
          fontSize: "0.8rem",
          color: "#111111",
          letterSpacing: "-0.01em",
          marginBottom: "4px",
        }}
      >
        Map Legend
      </div>

      {/* Station Types */}
      <div>
        <div
          style={{
            fontSize: "0.7rem",
            color: "#6B7280",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "6px",
          }}
        >
          Stations
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <LegendItem
            icon={<MapPin size={12} color={MARKER_COLORS.origin} fill={MARKER_COLORS.origin} />}
            label="Origin"
          />
          <LegendItem
            icon={<MapPin size={12} color={MARKER_COLORS.transfer} fill={MARKER_COLORS.transfer} />}
            label="Transfer"
          />
          <LegendItem
            icon={<MapPin size={12} color={MARKER_COLORS.destination} fill={MARKER_COLORS.destination} />}
            label="Destination"
          />
          <LegendItem
            icon={<MapPin size={12} color={MARKER_COLORS.shared} fill={MARKER_COLORS.shared} />}
            label="Shared (Multiple Routes)"
          />
        </div>
      </div>

      {/* Routes */}
      {routeColors.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              color: "#6B7280",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "6px",
            }}
          >
            Routes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {routeColors.map((route, idx) => (
              <LegendItem
                key={idx}
                icon={
                  idx === 0 ? (
                    <Award size={12} color={route.color} fill={route.color} />
                  ) : (
                    <div
                      style={{
                        width: "16px",
                        height: "3px",
                        background: route.color,
                        borderRadius: "2px",
                      }}
                    />
                  )
                }
                label={route.label}
              />
            ))}
          </div>
        </div>
      )}

      {/* Train Segments */}
      {showTrainColors && trainColors.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              color: "#6B7280",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "6px",
            }}
          >
            Train Segments
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "6px",
            }}
          >
            {trainColors.slice(0, 6).map((train, idx) => (
              <LegendItem
                key={idx}
                icon={
                  <div
                    style={{
                      width: "12px",
                      height: "3px",
                      background: train.color,
                      borderRadius: "2px",
                    }}
                  />
                }
                label={train.trainNumber}
                compact
              />
            ))}
          </div>
          {trainColors.length > 6 && (
            <div
              style={{
                fontSize: "0.65rem",
                color: "#9CA3AF",
                fontStyle: "italic",
                marginTop: "4px",
              }}
            >
              + {trainColors.length - 6} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LegendItem({
  icon,
  label,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? "4px" : "8px",
        fontSize: compact ? "0.65rem" : "0.75rem",
      }}
    >
      <div style={{ minWidth: compact ? "12px" : "16px", display: "flex", alignItems: "center" }}>
        {icon}
      </div>
      <span style={{ color: "#6B7280", fontWeight: 500, lineHeight: 1.2 }}>{label}</span>
    </div>
  );
}
