"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Train, Search, Clock, MapPin, Loader2, Info } from "lucide-react";
import { UtilityLayout, ResultCard } from "@/components/utility/UtilityLayout";
import { getTrainInfo, TrainInfo, TrainStop, formatTime } from "@/lib/api";

export default function TrainInfoPage() {
  const [trainNo, setTrainNo] = useState("");
  const [result, setResult] = useState<{ train: TrainInfo; schedule: TrainStop[]; total_stops: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!trainNo.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await getTrainInfo(trainNo.trim());
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Train not found");
    } finally {
      setLoading(false);
    }
  };

  const getClasses = (train: TrainInfo) => {
    const classes = [];
    if (train.first_ac) classes.push("1A");
    if (train.second_ac) classes.push("2A");
    if (train.third_ac) classes.push("3A");
    if (train.sleeper) classes.push("SL");
    if (train.chair_car) classes.push("CC");
    if (train.first_class) classes.push("2S");
    return classes;
  };

  return (
    <UtilityLayout
      title="Train Information"
      icon={<Train size={22} color="hsl(25,90%,60%)" />}
      iconBg="rgba(220,100,30,0.12)"
      description="Enter a train number to view complete route, schedule, and class information."
    >
      <div style={{ maxWidth: "560px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
          <input
            type="text"
            value={trainNo}
            onChange={(e) => setTrainNo(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="e.g. 12345"
            style={{
              flex: 1,
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
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading || !trainNo.trim()}
            style={{ whiteSpace: "nowrap", opacity: !trainNo.trim() ? 0.6 : 1 }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>

        {error && (
          <div style={{ color: "hsl(0,80%,65%)", fontSize: "0.88rem", padding: "10px 14px", background: "rgba(220,50,50,0.1)", borderRadius: "10px", border: "1px solid rgba(220,50,50,0.2)" }}>
            {error}
          </div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {/* Train header */}
            <div style={{ background: "var(--bg-card)", border: "1px solid rgba(220,100,30,0.2)", borderRadius: "16px", padding: "1.5rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem", color: "hsl(25,90%,60%)", fontWeight: 600, marginBottom: "4px" }}>
                    Train #{result.train.number}
                  </div>
                  <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: "1.2rem", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
                    {result.train.name}
                  </h2>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span className="badge badge-accent">{result.train.type}</span>
                    {result.train.zone && <span className="badge badge-blue">{result.train.zone}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>Total Distance</div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "white" }}>{result.train.distance} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>km</span></div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px" }}>From</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "white" }}>{result.train.from_station_name || result.train.from_station_code}</div>
                  <div style={{ fontSize: "0.78rem", color: "hsl(25,90%,60%)" }}>{formatTime(result.train.departure)}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px" }}>Duration</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "white" }}>{result.train.duration_h}h {result.train.duration_m}m</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{result.total_stops} stops</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px" }}>To</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "white" }}>{result.train.to_station_name || result.train.to_station_code}</div>
                  <div style={{ fontSize: "0.78rem", color: "hsl(145,60%,50%)" }}>{formatTime(result.train.arrival)}</div>
                </div>
              </div>

              {/* Classes */}
              {getClasses(result.train).length > 0 && (
                <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Classes:</span>
                  {getClasses(result.train).map((c) => (
                    <span key={c} className="badge badge-blue">{c}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: "16px", overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={15} color="var(--text-muted)" />
                <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "white" }}>Station Schedule</span>
                <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--text-muted)" }}>{result.total_stops} stops</span>
              </div>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {result.schedule.map((stop, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0.75rem 1.25rem", borderBottom: i < result.schedule.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                    <div style={{ width: "28px", textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: i === 0 ? "hsl(25,90%,55%)" : i === result.schedule.length - 1 ? "hsl(145,60%,45%)" : "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {stop.station_name_full || stop.station_name}
                      </div>
                      {stop.state && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{stop.state}</div>}
                    </div>
                    <div style={{ display: "flex", gap: "12px", fontSize: "0.8rem", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                      <span style={{ color: stop.arrival !== "None" ? "var(--text-secondary)" : "var(--text-muted)" }}>
                        {formatTime(stop.arrival)}
                      </span>
                      <span style={{ color: stop.departure !== "None" ? "hsl(25,90%,60%)" : "var(--text-muted)" }}>
                        {formatTime(stop.departure)}
                      </span>
                      {stop.day > 1 && <span style={{ color: "hsl(25,90%,55%)", fontSize: "0.72rem" }}>D{stop.day}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </UtilityLayout>
  );
}
