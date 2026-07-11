"use client";

import { useState, useEffect, useRef } from "react";
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
  Brain,
} from "lucide-react";
import { Route, DelayRisk, fetchDelayRisk, formatDuration, formatTime } from "@/lib/api";
import { JourneyTimeline } from "./JourneyTimeline";
import { DelayRiskBadge } from "./DelayRiskBadge";

interface JourneyCardProps {
  route: Route;
  fromStation: string;
  toStation: string;
  date: string;
}

const rankColors = [
  "hsl(40,95%,55%)",   // Gold
  "hsl(215,70%,65%)",  // Silver
  "hsl(25,70%,55%)",   // Bronze
  "var(--text-muted)",
  "var(--text-muted)",
];

export function JourneyCard({ route, fromStation, toStation, date }: JourneyCardProps) {
  const [expanded, setExpanded] = useState(route.rank === 1);
  const [delayRisk, setDelayRisk] = useState<DelayRisk | null>(null);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const hasFetched = useRef(false);

  // Lazy-fetch delay risk the first time the card is expanded
  useEffect(() => {
    if (!expanded || hasFetched.current) return;
    hasFetched.current = true;
    setIsLoadingRisk(true);
    fetchDelayRisk(fromStation, toStation, date, route)
      .then((risk) => setDelayRisk(risk))
      .catch(() => setDelayRisk({
        riskScore: null,
        description: "Delay analysis unavailable.",
        recommendation: "Check live train status before departure.",
        available: false,
      }))
      .finally(() => setIsLoadingRisk(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

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
        background: "#FFFFFF",
        border: `1px solid ${expanded ? "#D1D5DB" : "#ECECEC"}`,
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: expanded
          ? "0 4px 12px rgba(0,0,0,0.08)"
          : "0 2px 4px rgba(0,0,0,0.04)",
        transition: "all 0.2s ease",
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
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background:
                route.rank === 1
                  ? "#111111"
                  : route.rank === 2
                  ? "#374151"
                  : route.rank === 3
                  ? "#6B7280"
                  : "#F3F4F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: route.rank > 3 ? "1px solid #E5E7EB" : "none",
            }}
          >
            {route.rank <= 3 ? (
              <Award size={20} color="white" />
            ) : (
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "#6B7280",
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
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "#111111",
                  letterSpacing: "-0.02em",
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
                  gap: "4px",
                  minWidth: "90px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#6B7280",
                    fontWeight: 500,
                  }}
                >
                  {formatDuration(route.total_duration)}
                </span>
                <div
                  style={{
                    width: "100%",
                    height: "2px",
                    background: "#E5E7EB",
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
                      background: "#111111",
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "#111111",
                  letterSpacing: "-0.02em",
                }}
              >
                {arrivalTime}
                {arrivalDay > departureDay && (
                  <sup
                    style={{
                      fontSize: "0.68rem",
                      color: "#6B7280",
                      marginLeft: "4px",
                      fontWeight: 600,
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
              color: "#9CA3AF",
              transition: "all 0.2s ease",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
            }}
          >
            <ChevronDown size={22} />
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
                borderTop: "1px solid #F3F4F6",
                padding: "0 1.5rem 1.5rem",
              }}
            >
              {/* Journey Timeline */}
              <div style={{ paddingTop: "1.25rem" }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6B7280",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "14px",
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
                  marginTop: "1.5rem",
                  padding: "1.25rem",
                  background: "#FAFAFA",
                  borderRadius: "12px",
                  border: "1px solid #F3F4F6",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6B7280",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "12px",
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
                          fontSize: "0.75rem",
                          color: "#9CA3AF",
                          textTransform: "capitalize",
                          marginBottom: "4px",
                        }}
                      >
                        {key}
                      </div>
                      <div
                        style={{
                          fontSize: "0.95rem",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 600,
                          color: "#111111",
                        }}
                      >
                        {typeof val === 'string' ? val : val.toFixed(0)}
                      </div>
                    </div>
                  ))}
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9CA3AF",
                        marginBottom: "4px",
                      }}
                    >
                      Total Score
                    </div>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        color: "#111111",
                      }}
                    >
                      {route.score.toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delay Risk Analysis — lazy loaded */}
              {isLoadingRisk ? (
                <DelayRiskSkeleton />
              ) : delayRisk ? (
                <DelayRiskBadge delayRisk={delayRisk} />
              ) : null}

              {/* Trains used */}
              <div
                style={{
                  marginTop: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#6B7280",
                    fontWeight: 500,
                  }}
                >
                  Trains:
                </span>
                {route.trains_used.map((tn) => (
                  <span
                    key={tn}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "100px",
                      background: "#F3F4F6",
                      border: "1px solid #E5E7EB",
                      fontSize: "0.8rem",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                      color: "#111111",
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
        gap: "6px",
        fontSize: "0.82rem",
        color: "#6B7280",
        fontWeight: 500,
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function DelayRiskSkeleton() {
  return (
    <div
      style={{
        marginTop: "1.25rem",
        padding: "1.25rem",
        background: "#F9FAFB",
        borderRadius: "12px",
        border: "1px solid #E5E7EB",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: "0.75rem",
          color: "#6B7280",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Brain size={13} color="#9CA3AF" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
        Delay Risk Analysis
        <span style={{ color: "#9CA3AF", fontWeight: 400, fontSize: "0.72rem", textTransform: "none", letterSpacing: 0 }}>
          — AI analyzing…
        </span>
      </div>

      {/* Animated shimmer bars */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px" }}>
        {/* Score placeholder */}
        <div
          style={{
            width: "56px",
            height: "52px",
            borderRadius: "8px",
            background: "linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s ease-in-out infinite",
          }}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              height: "20px",
              borderRadius: "100px",
              width: "120px",
              background: "linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s ease-in-out infinite",
            }}
          />
          <div
            style={{
              height: "6px",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      {/* Text placeholder lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {["90%", "70%", "55%"].map((w, i) => (
          <div
            key={i}
            style={{
              height: "12px",
              borderRadius: "6px",
              width: w,
              background: "linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%)",
              backgroundSize: "200% 100%",
              animation: `shimmer 1.4s ease-in-out infinite ${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
