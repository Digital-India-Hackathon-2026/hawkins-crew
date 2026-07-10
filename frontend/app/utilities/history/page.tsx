"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  History,
  Search,
  Loader2,
  Clock,
  Train,
  AlertTriangle,
} from "lucide-react";
import { UtilityLayout } from "@/components/utility/UtilityLayout";
import { trainHistory, formatTime } from "@/lib/api";
import type { TrainHistoryData, HistoryStation } from "@/lib/api";

function DelayBadge({ delayMin }: { delayMin: number }) {
  if (delayMin === 0)
    return <span className="badge badge-success">On Time</span>;
  if (delayMin <= 10)
    return <span className="badge badge-warning">+{delayMin}m</span>;
  return <span className="badge badge-error">+{delayMin}m</span>;
}

function HistoryTimeline({
  stations,
}: {
  stations: HistoryStation[];
}) {
  const maxDelay = Math.max(...stations.map((s) => s.delay_min), 1);

  return (
    <div
      style={{
        maxHeight: "450px",
        overflowY: "auto",
        paddingRight: "4px",
      }}
    >
      {stations.map((stop, i) => {
        const delay = stop.delay_min;
        const delayPct = Math.min((delay / maxDelay) * 100, 100);

        return (
          <div key={i} style={{ display: "flex", gap: "12px" }}>
            {/* Timeline */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "20px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  background: stop.is_source
                    ? "hsl(25,90%,55%)"
                    : stop.is_destination
                      ? "hsl(145,60%,45%)"
                      : delay > 10
                        ? "hsl(0,70%,55%)"
                        : delay > 0
                          ? "hsl(40,95%,55%)"
                          : "rgba(255,255,255,0.15)",
                  border: `2px solid ${
                    stop.is_source
                      ? "hsl(25,90%,55%)"
                      : stop.is_destination
                        ? "hsl(145,60%,45%)"
                        : "rgba(255,255,255,0.2)"
                  }`,
                  flexShrink: 0,
                }}
              />
              {i < stations.length - 1 && (
                <div
                  style={{
                    width: "2px",
                    flex: 1,
                    minHeight: "20px",
                    background: "rgba(255,255,255,0.06)",
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div
              style={{
                flex: 1,
                paddingBottom: "0.6rem",
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {stop.station_name_full || stop.station_name}
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
                      marginTop: "2px",
                    }}
                  >
                    {stop.station_code}
                    {stop.day > 0 ? ` · Day ${stop.day}` : ""}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      fontSize: "0.78rem",
                      fontFamily: "'JetBrains Mono', monospace",
                      marginTop: "4px",
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>
                      Arr {formatTime(stop.scheduled_arrival)}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                      Dep {formatTime(stop.scheduled_departure)}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <DelayBadge delayMin={delay} />
                </div>
              </div>

              {/* Delay bar */}
              {delay > 0 && (
                <div
                  style={{
                    marginTop: "6px",
                    height: "4px",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${delayPct}%`,
                      height: "100%",
                      background:
                        delay > 10
                          ? "hsl(0,70%,55%)"
                          : "hsl(40,95%,55%)",
                      borderRadius: "2px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TrainHistoryPage() {
  const [trainNo, setTrainNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<TrainHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!trainNo.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const dateStr = date.replace(/-/g, "");
      const res = await trainHistory(trainNo.trim(), dateStr);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(
          res.error ||
            "Unable to fetch train history. Please verify the train number and try again."
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Unable to fetch train history."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <UtilityLayout
      title="Train History"
      icon={<History size={22} color="hsl(320,70%,60%)" />}
      iconBg="rgba(200,50,150,0.12)"
      description="View historical on-time performance and delay records for any train."
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
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
            onClick={handleSearch}
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
            {loading ? "Loading..." : "View History"}
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
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {/* Summary card */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid rgba(200,50,150,0.2)",
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
                      color: "hsl(320,70%,60%)",
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
                      color: "white",
                    }}
                  >
                    {result.train_name}
                  </div>
                  {result.train_type && (
                    <span
                      className="badge badge-blue"
                      style={{ marginTop: "6px" }}
                    >
                      {result.train_type}
                    </span>
                  )}
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: "6px",
                    }}
                  >
                    Journey: {result.journey_date}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "0.75rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    padding: "10px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "10px",
                  }}
                >
                  <div className="stat-label">Total Delay</div>
                  <div
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color:
                        result.total_delay_min > 30
                          ? "hsl(0,70%,55%)"
                          : result.total_delay_min > 10
                            ? "hsl(40,95%,55%)"
                            : "hsl(145,60%,45%)",
                      fontFamily: "'Sora', sans-serif",
                      marginTop: "2px",
                    }}
                  >
                    {result.total_delay_min} min
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "10px",
                  }}
                >
                  <div className="stat-label">Avg Delay</div>
                  <div
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      fontFamily: "'Sora', sans-serif",
                      marginTop: "2px",
                    }}
                  >
                    {result.average_delay_min} min
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "10px",
                  }}
                >
                  <div className="stat-label">Max Delay</div>
                  <div
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color:
                        result.max_delay_min > 20
                          ? "hsl(0,70%,55%)"
                          : "hsl(40,95%,55%)",
                      fontFamily: "'Sora', sans-serif",
                      marginTop: "2px",
                    }}
                  >
                    {result.max_delay_min} min
                  </div>
                </div>
                <div
                  style={{
                    padding: "10px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "10px",
                  }}
                >
                  <div className="stat-label">Stops</div>
                  <div
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      fontFamily: "'Sora', sans-serif",
                      marginTop: "2px",
                    }}
                  >
                    {result.total_stops}
                  </div>
                </div>
              </div>

              {/* Max delay station */}
              {result.max_delay_station && result.max_delay_min > 0 && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem 1rem",
                    background: "rgba(220,50,50,0.06)",
                    border: "1px solid rgba(220,50,50,0.1)",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <AlertTriangle size={14} color="hsl(0,70%,55%)" />
                  Maximum delay at{" "}
                  <strong style={{ color: "hsl(0,70%,55%)" }}>
                    {result.max_delay_station}
                  </strong>{" "}
                  ({result.max_delay_min} min)
                </div>
              )}
            </div>

            {/* Detailed Timeline */}
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
                    color: "white",
                  }}
                >
                  Station Timeline
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {result.total_stops} stops
                </span>
              </div>
              <HistoryTimeline stations={result.stations} />
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1.5rem",
              background: "var(--bg-card)",
              border: "1px solid var(--glass-border)",
              borderRadius: "16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <Train size={48} color="hsl(320,70%,35%)" style={{ opacity: 0.5 }} />
            <p
              style={{
                fontSize: "0.88rem",
                color: "var(--text-muted)",
                maxWidth: "360px",
                lineHeight: 1.6,
              }}
            >
              Enter a train number to view its historical performance and delay
              records.
            </p>
          </div>
        )}
      </div>
    </UtilityLayout>
  );
}
