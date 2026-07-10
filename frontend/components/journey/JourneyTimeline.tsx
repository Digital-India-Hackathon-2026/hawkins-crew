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
                      minHeight: "60px",
                      background: "linear-gradient(to bottom, hsl(25,90%,55%), rgba(220,100,30,0.4))",
                    }}
                  />
                </div>

                <div
                  style={{
                    marginLeft: "20px",
                    marginTop: "6px",
                    marginBottom: "6px",
                    padding: "10px 14px",
                    background: "rgba(220,100,30,0.08)",
                    borderRadius: "10px",
                    border: "1px solid rgba(220,100,30,0.15)",
                    flex: 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <Train size={14} color="hsl(25,90%,60%)" />
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "hsl(25,90%,62%)",
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
                      fontSize: "0.82rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>{seg.from_station}</span>
                    <ArrowRight size={12} />
                    <span>{seg.to_station}</span>
                    <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>
                      {formatTime(seg.departure_time)} → {formatTime(seg.arrival_time)}
                      {seg.arrival_day > seg.departure_day && (
                        <span style={{ color: "hsl(25,90%,55%)", marginLeft: "4px" }}>
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
                      minHeight: "50px",
                      background:
                        "repeating-linear-gradient(to bottom, hsl(40,95%,55%) 0, hsl(40,95%,55%) 4px, transparent 4px, transparent 8px)",
                    }}
                  />
                </div>
                <div
                  style={{
                    marginLeft: "20px",
                    marginTop: "6px",
                    marginBottom: "6px",
                    padding: "8px 14px",
                    background: "rgba(255,170,50,0.08)",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,170,50,0.15)",
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Clock size={13} color="hsl(40,95%,62%)" />
                  <span
                    style={{
                      fontSize: "0.82rem",
                      color: "hsl(40,95%,62%)",
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
      ? "hsl(25,90%,55%)"
      : type === "destination"
      ? "hsl(145,60%,45%)"
      : "hsl(40,95%,55%)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <div
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: dotColor,
          border: "2px solid var(--bg-primary)",
          boxShadow: `0 0 8px ${dotColor}66`,
          flexShrink: 0,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: "0.85rem",
            color:
              type === "destination"
                ? "hsl(145,60%,55%)"
                : type === "origin"
                ? "hsl(25,90%,62%)"
                : "hsl(40,95%,62%)",
          }}
        >
          {code}
        </span>
        <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500 }}>
          {time}
          {day > 1 && (
            <span style={{ color: "hsl(25,90%,55%)", marginLeft: "4px", fontSize: "0.75rem" }}>
              Day {day}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
