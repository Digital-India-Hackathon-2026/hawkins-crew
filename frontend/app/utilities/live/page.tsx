"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  Search,
  Loader2,
  RefreshCw,
  Clock,
  Train,
  MapPin,
} from "lucide-react";
import { UtilityLayout } from "@/components/utility/UtilityLayout";
import { trackTrain, formatTime } from "@/lib/api";
import type { LiveTrackingData, LiveRouteStop } from "@/lib/api";

function LiveStatusBadge({ delayMin }: { delayMin: number }) {
  if (delayMin <= 0)
    return <span className="badge badge-success">On Time</span>;
  if (delayMin <= 15)
    return <span className="badge badge-warning">Delayed {delayMin}m</span>;
  return <span className="badge badge-error">Delayed {delayMin}m</span>;
}

function StopStatusDot({
  stop,
  currentIdx,
  idx,
}: {
  stop: LiveRouteStop;
  currentIdx: number;
  idx: number;
}) {
  const isPast = idx < currentIdx;
  const isCurrent = idx === currentIdx;
  const isFuture = currentIdx >= 0 && idx > currentIdx;

  let color = "rgba(255,255,255,0.15)";
  let label = "";
  if (stop.is_source) {
    label = "S";
    color = isPast ? "hsl(145,60%,45%)" : "hsl(25,90%,55%)";
  } else if (stop.is_destination) {
    label = "D";
    color = isPast ? "hsl(145,60%,45%)" : "hsl(145,60%,45%)";
  } else if (isCurrent) {
    label = "●";
    color = "hsl(40,95%,55%)";
  } else if (isPast) {
    color = "hsl(145,60%,45%)";
  }

  return (
    <div
      style={{
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        background: isCurrent
          ? "hsl(40,95%,55%)"
          : isPast
            ? "hsl(145,60%,35%)"
            : "rgba(255,255,255,0.08)",
        border: `2px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: "0.6rem",
        fontWeight: 700,
        color: isPast || isCurrent ? "white" : "var(--text-muted)",
        boxShadow:
          isCurrent
            ? "0 0 0 4px rgba(255,170,50,0.25)"
            : "none",
      }}
    >
      {label}
    </div>
  );
}

function LiveTimeline({
  route,
  currentIdx,
}: {
  route: LiveRouteStop[];
  currentIdx: number;
}) {
  return (
    <div
      style={{
        maxHeight: "420px",
        overflowY: "auto",
        paddingRight: "4px",
      }}
    >
      {route.map((stop, i) => {
        const isPast = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isFuture = currentIdx >= 0 && i > currentIdx;
        const delay = stop.delay_arrival_min;

        return (
          <div key={i} style={{ display: "flex", gap: "12px" }}>
            {/* Timeline line + dot */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "20px",
                flexShrink: 0,
              }}
            >
              <StopStatusDot stop={stop} currentIdx={currentIdx} idx={i} />
              {i < route.length - 1 && (
                <div
                  style={{
                    width: "2px",
                    flex: 1,
                    minHeight: "24px",
                    background: isPast
                      ? "hsl(145,60%,35%)"
                      : isCurrent
                        ? "linear-gradient(to bottom, hsl(40,95%,55%), rgba(255,255,255,0.1))"
                        : "rgba(255,255,255,0.06)",
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div
              style={{
                flex: 1,
                paddingBottom: "0.75rem",
                opacity: isFuture ? 0.55 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: isCurrent ? 700 : 500,
                      fontSize: "0.88rem",
                      color: isCurrent
                        ? "hsl(40,95%,60%)"
                        : "var(--text-primary)",
                    }}
                  >
                    {stop.station_name}
                    {stop.is_source && (
                      <span
                        style={{
                          marginLeft: "6px",
                          fontSize: "0.65rem",
                          color: "hsl(25,90%,55%)",
                          textTransform: "uppercase",
                        }}
                      >
                        Source
                      </span>
                    )}
                    {stop.is_destination && (
                      <span
                        style={{
                          marginLeft: "6px",
                          fontSize: "0.65rem",
                          color: "hsl(145,60%,45%)",
                          textTransform: "uppercase",
                        }}
                      >
                        Destination
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {stop.station_code}
                    {stop.day > 0 ? ` · Day ${stop.day}` : ""}
                    {stop.distance && stop.distance !== "-"
                      ? ` · ${stop.distance} km`
                      : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                      color: isCurrent ? "hsl(40,95%,60%)" : "var(--text-primary)",
                    }}
                  >
                    {formatTime(stop.actual_arrival)}
                  </div>
                  {delay > 0 && (
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color:
                          delay <= 15
                            ? "hsl(40,95%,55%)"
                            : "hsl(0,80%,65%)",
                      }}
                    >
                      +{delay}m
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LiveTrackingPage() {
  const [trainNo, setTrainNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<LiveTrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = useCallback(async () => {
    if (!trainNo.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const dateStr = date.replace(/-/g, "");
      const res = await trackTrain(trainNo.trim(), dateStr);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(
          res.error ||
            "Unable to fetch live status. Please verify the train number and try again."
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Unable to fetch live status. Please verify the train number and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [trainNo, date]);

  return (
    <UtilityLayout
      title="Live Train Tracking"
      icon={<Radio size={22} color="hsl(0,70%,60%)" />}
      iconBg="rgba(220,50,50,0.12)"
      description="Track real-time train position, delays, and upcoming stops for any train."
    >
      <div style={{ maxWidth: "640px" }}>
        {/* Form */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            value={trainNo}
            onChange={(e) =>
              setTrainNo(e.target.value.replace(/\D/g, "").slice(0, 5))
            }
            placeholder="Train number"
            style={{
              flex: 1,
              minWidth: "140px",
              padding: "0.85rem 1rem",
              background: "rgba(255,255,255,0.05)",
              border: "1.5px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              color: "var(--text-primary)",
              fontSize: "1rem",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.1em",
              outline: "none",
            }}
            onKeyDown={(e) => e.key === "Enter" && handleTrack()}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              flex: "0 0 auto",
              padding: "0.85rem 1rem",
              background: "rgba(255,255,255,0.05)",
              border: "1.5px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              color: "var(--text-primary)",
              fontSize: "0.9rem",
              outline: "none",
              fontFamily: "'Inter', sans-serif",
              colorScheme: "dark",
            }}
          />
          <button
            className="btn btn-primary"
            onClick={handleTrack}
            disabled={loading || !trainNo.trim()}
            style={{
              whiteSpace: "nowrap",
              opacity: !trainNo.trim() ? 0.6 : 1,
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            {loading ? "Tracking..." : "Track"}
          </button>
        </div>

        {error && (
          <div
            style={{
              color: "hsl(0,80%,65%)",
              fontSize: "0.88rem",
              padding: "10px 14px",
              background: "rgba(220,50,50,0.1)",
              borderRadius: "10px",
              border: "1px solid rgba(220,50,50,0.2)",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {/* Current Status Card */}
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid rgba(220,50,50,0.2)",
                  borderRadius: "16px",
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "0.8rem",
                        color: "hsl(0,70%,60%)",
                        fontWeight: 600,
                        marginBottom: "4px",
                      }}
                    >
                      #{result.train_number}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Sora', sans-serif",
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      Live Status
                    </div>
                  </div>
                  <LiveStatusBadge delayMin={result.overall_delay_min} />
                </div>

                {/* Current / Next Station */}
                {result.current_station && result.current_station.name && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                      padding: "1rem",
                      background: "rgba(220,50,50,0.06)",
                      borderRadius: "12px",
                      border: "1px solid rgba(220,50,50,0.1)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginBottom: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <MapPin size={11} />
                        Current Station
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color: "hsl(40,95%,60%)",
                        }}
                      >
                        {result.current_station.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          fontFamily: "'JetBrains Mono', monospace",
                          marginTop: "2px",
                        }}
                      >
                        {result.current_station.code}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Next Stop
                      </div>
                      {result.current_station_index <
                        result.route.length - 1 && (
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {result.route[result.current_station_index + 1]
                            ?.station_name || "—"}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timing Details */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "0.75rem",
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginBottom: "2px",
                      }}
                    >
                      Date
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {result.start_date || "—"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginBottom: "2px",
                      }}
                    >
                      Last Updated
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginBottom: "2px",
                      }}
                    >
                      Total Stops
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {result.route.length}
                    </div>
                  </div>
                </div>

                {/* Refresh */}
                <div style={{ marginTop: "1rem", textAlign: "center" }}>
                  <button
                    className="btn btn-ghost"
                    onClick={handleTrack}
                    disabled={loading}
                    style={{ fontSize: "0.82rem", padding: "0.6rem 1.25rem" }}
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    Refresh Live Status
                  </button>
                </div>
              </div>

              {/* Route Timeline */}
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "16px",
                  padding: "1.25rem 1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "1rem",
                  }}
                >
                  <Clock size={15} color="var(--text-muted)" />
                  <span
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    Route Timeline
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {result.route.length} stops
                  </span>
                </div>
                <LiveTimeline
                  route={result.route}
                  currentIdx={result.current_station_index}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </UtilityLayout>
  );
}
