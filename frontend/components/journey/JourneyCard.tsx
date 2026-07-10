"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Train,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart3,
  MapPin,
  Award,
  RefreshCw,
} from "lucide-react";
import { Route, formatDuration, formatTime } from "@/lib/api";
import { JourneyTimeline } from "./JourneyTimeline";

interface JourneyCardProps {
  route: Route;
  fromStation: string;
  toStation: string;
}

const rankColors = [
  "hsl(40,95%,55%)",   // Gold
  "hsl(215,70%,65%)",  // Silver
  "hsl(25,70%,55%)",   // Bronze
  "var(--text-muted)",
  "var(--text-muted)",
];

export function JourneyCard({ route, fromStation, toStation }: JourneyCardProps) {
  const [expanded, setExpanded] = useState(route.rank === 1);

  const firstTravel = route.segments.find((s) => s.type === "travel") as any;
  const lastTravel = [...route.segments].reverse().find((s) => s.type === "travel") as any;

  const departureTime = firstTravel ? formatTime(firstTravel.departure_time) : "--";
  const arrivalTime = lastTravel ? formatTime(lastTravel.arrival_time) : "--";
  const arrivalDay = lastTravel?.arrival_day || 1;
  const departureDay = firstTravel?.departure_day || 1;

  // Reliability score derived from score_breakdown (centrality_bonus normalized)
  const centralityBonus = Math.abs(route.score_breakdown.centrality_bonus || 0);
  const maxBonus = 7200;
  const reliabilityPct = Math.min(100, Math.round((centralityBonus / maxBonus) * 100 + 50));

  const reliabilityColor =
    reliabilityPct >= 80
      ? "hsl(145,60%,45%)"
      : reliabilityPct >= 60
      ? "hsl(40,95%,55%)"
      : "hsl(0,70%,55%)";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: (route.rank - 1) * 0.08 }}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${expanded ? "rgba(220,100,30,0.25)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: expanded
          ? "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(220,100,30,0.1)"
          : "0 4px 16px rgba(0,0,0,0.3)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Card Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "1.25rem 1.5rem",
          textAlign: "left",
        }}
        aria-expanded={expanded}
        aria-label={`Route ${route.rank}: ${fromStation} to ${toStation}`}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          {/* Rank badge */}
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background:
                route.rank === 1
                  ? "linear-gradient(135deg, hsl(40,95%,55%), hsl(30,90%,45%))"
                  : route.rank === 2
                  ? "linear-gradient(135deg, hsl(215,50%,55%), hsl(215,60%,40%))"
                  : route.rank === 3
                  ? "linear-gradient(135deg, hsl(25,60%,50%), hsl(20,65%,38%))"
                  : "rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow:
                route.rank === 1 ? "0 4px 12px rgba(220,170,40,0.3)" : "none",
            }}
          >
            {route.rank <= 3 ? (
              <Award size={20} color="white" />
            ) : (
              <span
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "var(--text-secondary)",
                }}
              >
                #{route.rank}
              </span>
            )}
          </div>

          {/* Main info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Journey times */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "white",
                }}
              >
                {departureTime}
              </span>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                  minWidth: "80px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                  }}
                >
                  {formatDuration(route.total_duration)}
                </span>
                <div
                  style={{
                    width: "100%",
                    height: "1.5px",
                    background:
                      "linear-gradient(to right, hsl(25,90%,55%), rgba(220,100,30,0.3))",
                    borderRadius: "2px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "hsl(25,90%,55%)",
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: "1.4rem",
                  fontWeight: 800,
                  color: "white",
                }}
              >
                {arrivalTime}
                {arrivalDay > departureDay && (
                  <sup
                    style={{
                      fontSize: "0.65rem",
                      color: "hsl(25,90%,60%)",
                      marginLeft: "3px",
                    }}
                  >
                    +{arrivalDay - departureDay}d
                  </sup>
                )}
              </span>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <StatPill
                icon={<RefreshCw size={12} />}
                label={`${route.num_transfers} transfer${route.num_transfers !== 1 ? "s" : ""}`}
                color={route.num_transfers === 0 ? "hsl(145,60%,50%)" : "hsl(25,90%,60%)"}
              />
              <StatPill
                icon={<Clock size={12} />}
                label={`${Math.floor(route.total_waiting / 60)}m wait`}
                color="hsl(40,95%,55%)"
              />
              <StatPill
                icon={<Train size={12} />}
                label={`${route.trains_used.length} train${route.trains_used.length !== 1 ? "s" : ""}`}
                color="hsl(215,70%,65%)"
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "0.78rem",
                  color: reliabilityColor,
                  fontWeight: 500,
                }}
              >
                <BarChart3 size={12} />
                <span>{reliabilityPct}% reliable</span>
              </div>
            </div>
          </div>

          {/* Expand icon */}
          <div
            style={{
              color: "var(--text-muted)",
              transition: "transform 0.2s, color 0.2s",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
            }}
          >
            <ChevronDown size={20} />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                padding: "0 1.5rem 1.5rem",
              }}
            >
              {/* Journey Timeline */}
              <div style={{ paddingTop: "1rem" }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "12px",
                  }}
                >
                  Journey Timeline
                </div>
                <JourneyTimeline
                  segments={route.segments}
                  fromStation={fromStation}
                  toStation={toStation}
                />
              </div>

              {/* Score Breakdown */}
              <div
                style={{
                  marginTop: "1.25rem",
                  padding: "1rem",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "10px",
                  }}
                >
                  Score Breakdown
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {Object.entries(route.score_breakdown).map(([key, val]) => (
                    <div key={key}>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          textTransform: "capitalize",
                          marginBottom: "2px",
                        }}
                      >
                        {key.replace(/_/g, " ")}
                      </div>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 600,
                          color:
                            val < 0
                              ? "hsl(145,60%,50%)"
                              : "var(--text-primary)",
                        }}
                      >
                        {val.toFixed(0)}
                      </div>
                    </div>
                  ))}
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginBottom: "2px",
                      }}
                    >
                      Total Score
                    </div>
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        color: "hsl(25,90%,62%)",
                      }}
                    >
                      {route.score.toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trains used */}
              <div
                style={{
                  marginTop: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                  }}
                >
                  Trains:
                </span>
                {route.trains_used.map((tn) => (
                  <span
                    key={tn}
                    style={{
                      padding: "3px 10px",
                      borderRadius: "100px",
                      background: "rgba(220,100,30,0.12)",
                      border: "1px solid rgba(220,100,30,0.2)",
                      fontSize: "0.78rem",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                      color: "hsl(25,90%,62%)",
                    }}
                  >
                    {tn}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatPill({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "0.78rem",
        color,
        fontWeight: 500,
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
