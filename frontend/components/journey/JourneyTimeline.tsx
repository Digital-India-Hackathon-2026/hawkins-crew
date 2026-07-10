"use client";

import { Train, Clock, MapPin, ArrowRight } from "lucide-react";
import { Segment, formatTime } from "@/lib/api";

interface JourneyTimelineProps {
  segments: Segment[];
  fromStation: string;
  toStation: string;
}

export function JourneyTimeline({ segments, fromStation, toStation }: JourneyTimelineProps) {
  return (
    <div style={{ padding: "1rem 0" }}>
      {segments.map((seg, i) => {
        if (seg.type === "travel") {
          const isFirst = i === 0;
          const isLast = i === segments.length - 1;

          return (
            <div key={i}>
              {/* Departure station */}
              {isFirst && (
                <TimelineStation
                  code={seg.from_station}
                  time={formatTime(seg.departure_time)}
                  day={seg.departure_day}
                  type="origin"
                />
              )}

              {/* Train connector */}
              <div style={{ display: "flex", gap: "0" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginLeft: "5px" }}>
                  <div
                    style={{
                      width: "2px",
                      flex: 1,
                      minHeight: "64px",
                      background: "#E5E7EB",
                    }}
                  />
                </div>

                <div
                  style={{
                    marginLeft: "20px",
                    marginTop: "8px",
                    marginBottom: "8px",
                    padding: "12px 16px",
                    background: "#FAFAFA",
                    borderRadius: "12px",
                    border: "1px solid #F3F4F6",
                    flex: 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <Train size={15} color="#111111" />
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "#111111",
                      }}
                    >
                      Train {seg.train_number}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.85rem",
                      color: "#6B7280",
                    }}
                  >
                    <span>{seg.from_station}</span>
                    <ArrowRight size={13} />
                    <span>{seg.to_station}</span>
                    <span style={{ color: "#9CA3AF", marginLeft: "auto" }}>
                      {formatTime(seg.departure_time)} → {formatTime(seg.arrival_time)}
                      {seg.arrival_day > seg.departure_day && (
                        <span style={{ color: "#6B7280", marginLeft: "4px" }}>
                          +{seg.arrival_day - seg.departure_day}d
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Arrival / next station */}
              {(isLast || segments[i + 1]?.type === "transfer") && (
                <TimelineStation
                  code={seg.to_station}
                  time={formatTime(seg.arrival_time)}
                  day={seg.arrival_day}
                  type={isLast ? "destination" : "transfer-arrival"}
                />
              )}
            </div>
          );
        }

        if (seg.type === "transfer") {
          return (
            <div key={i}>
              {/* Waiting connector */}
              <div style={{ display: "flex", gap: "0" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginLeft: "5px",
                  }}
                >
                  <div
                    style={{
                      width: "2px",
                      flex: 1,
                      minHeight: "54px",
                      background:
                        "repeating-linear-gradient(to bottom, #D1D5DB 0, #D1D5DB 4px, transparent 4px, transparent 8px)",
                    }}
                  />
                </div>
                <div
                  style={{
                    marginLeft: "20px",
                    marginTop: "8px",
                    marginBottom: "8px",
                    padding: "10px 16px",
                    background: "#FFFBEB",
                    borderRadius: "12px",
                    border: "1px solid #FDE68A",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Clock size={14} color="hsl(40,95%,45%)" />
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "hsl(40,90%,40%)",
                      fontWeight: 500,
                    }}
                  >
                    {seg.waiting_time_min}m waiting at {seg.station}
                  </span>
                </div>
              </div>

              {/* Next departure station */}
              {i + 1 < segments.length && segments[i + 1]?.type === "travel" && (
                <TimelineStation
                  code={(segments[i + 1] as any).from_station}
                  time={formatTime((segments[i + 1] as any).departure_time)}
                  day={(segments[i + 1] as any).departure_day}
                  type="transfer"
                />
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

function TimelineStation({
  code,
  time,
  day,
  type,
}: {
  code: string;
  time: string;
  day: number;
  type: "origin" | "destination" | "transfer" | "transfer-arrival";
}) {
  const dotColor =
    type === "origin"
      ? "#111111"
      : type === "destination"
      ? "hsl(145,60%,45%)"
      : "hsl(40,95%,45%)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
      <div
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: dotColor,
          border: "2px solid #FFFFFF",
          flexShrink: 0,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: "0.9rem",
            color: "#111111",
          }}
        >
          {code}
        </span>
        <span style={{ fontSize: "0.85rem", color: "#6B7280", fontWeight: 500 }}>
          {time}
          {day > 1 && (
            <span style={{ color: "#9CA3AF", marginLeft: "6px", fontSize: "0.78rem" }}>
              Day {day}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
