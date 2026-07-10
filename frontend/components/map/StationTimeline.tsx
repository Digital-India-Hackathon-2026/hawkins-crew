"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Train } from "lucide-react";
import type { NormalizedRoute } from "@/lib/map/normalizeRoute";

interface StationTimelineProps {
  route: NormalizedRoute;
  onStationClick?: (stationCode: string) => void;
}

export function StationTimeline({ route, onStationClick }: StationTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatTime = (timeStr?: string) => {
    if (!timeStr || timeStr === "None") return "--:--";
    return timeStr.substring(0, 5);
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: "100%",
          padding: "14px 16px",
          background: "#FAFAFA",
          border: "none",
          borderBottom: isExpanded ? "1px solid #E5E7EB" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#F3F4F6";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#FAFAFA";
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "#111111",
            letterSpacing: "-0.01em",
          }}
        >
          Journey Timeline
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {/* Timeline */}
      {isExpanded && (
        <div style={{ padding: "16px" }}>
          <div style={{ position: "relative" }}>
            {/* Vertical line */}
            <div
              style={{
                position: "absolute",
                left: "11px",
                top: "20px",
                bottom: "20px",
                width: "2px",
                background: "linear-gradient(to bottom, hsl(145, 60%, 45%), hsl(0, 70%, 55%))",
                opacity: 0.3,
              }}
            />

            {/* Timeline items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {route.stations.map((station, idx) => {
                const prevStation = idx > 0 ? route.stations[idx - 1] : null;
                const trainSegment = route.trainSegments.find(
                  seg => seg.fromStationCode === prevStation?.code && seg.toStationCode === station.code
                );

                return (
                  <div key={station.code}>
                    {/* Train segment indicator */}
                    {trainSegment && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "8px 0 8px 32px",
                        }}
                      >
                        <Train size={12} color={trainSegment.color} />
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "#6B7280",
                            fontWeight: 500,
                          }}
                        >
                          Train {trainSegment.trainNumber}
                        </div>
                      </div>
                    )}

                    {/* Station */}
                    <button
                      onClick={() => onStationClick?.(station.code)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "10px 0",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#F9FAFB";
                        e.currentTarget.style.paddingLeft = "8px";
                        e.currentTarget.style.paddingRight = "8px";
                        e.currentTarget.style.marginLeft = "-8px";
                        e.currentTarget.style.marginRight = "-8px";
                        e.currentTarget.style.borderRadius = "8px";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.paddingLeft = "0";
                        e.currentTarget.style.paddingRight = "0";
                        e.currentTarget.style.marginLeft = "0";
                        e.currentTarget.style.marginRight = "0";
                      }}
                    >
                      {/* Dot */}
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background:
                            station.role === "origin"
                              ? "hsl(145, 60%, 45%)"
                              : station.role === "destination"
                              ? "hsl(0, 70%, 55%)"
                              : "hsl(40, 95%, 50%)",
                          border: "3px solid white",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "white",
                          position: "relative",
                          zIndex: 2,
                        }}
                      >
                        {idx + 1}
                      </div>

                      {/* Station info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            color: "#111111",
                            marginBottom: "2px",
                            lineHeight: 1.2,
                          }}
                        >
                          {station.name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "#6B7280",
                            marginBottom: "4px",
                          }}
                        >
                          {station.code}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "12px",
                            fontSize: "0.7rem",
                            color: "#9CA3AF",
                          }}
                        >
                          {station.arrivalTime && (
                            <span>Arr: {formatTime(station.arrivalTime)}</span>
                          )}
                          {station.departureTime && (
                            <span>Dep: {formatTime(station.departureTime)}</span>
                          )}
                        </div>
                        {station.waitingTime && station.waitingTime > 0 && (
                          <div
                            style={{
                              marginTop: "6px",
                              padding: "4px 8px",
                              background: "#FFF4ED",
                              border: "1px solid #FED7AA",
                              borderRadius: "4px",
                              fontSize: "0.65rem",
                              color: "hsl(25, 90%, 55%)",
                              fontWeight: 600,
                              display: "inline-block",
                            }}
                          >
                            Wait: {Math.floor(station.waitingTime / 60)}m
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
