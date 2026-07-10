"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Search, Loader2, ArrowDown, ArrowUp } from "lucide-react";
import { UtilityLayout } from "@/components/utility/UtilityLayout";
import { StationAutocomplete } from "@/components/station/StationAutocomplete";
import { getStationBoard, Station, formatTime } from "@/lib/api";

export default function StationBoardPage() {
  const [station, setStation] = useState<Station | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [tab, setTab] = useState<"arrivals" | "departures">("departures");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!station) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await getStationBoard(station.code);
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Station not found");
    } finally {
      setLoading(false);
    }
  };

  const trains = result ? (tab === "departures" ? result.departures : result.arrivals) : [];

  return (
    <UtilityLayout
      title="Station Board"
      icon={<Building2 size={22} color="hsl(185,70%,50%)" />}
      iconBg="rgba(30,165,165,0.12)"
      description="View all train arrivals and departures at any station."
    >
      <div style={{ maxWidth: "700px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
          <div style={{ flex: 1 }}>
            <StationAutocomplete id="board-station" label="Station" value={station} onChange={setStation} placeholder="Select station..." />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading || !station}
            style={{ alignSelf: "flex-end", opacity: !station ? 0.6 : 1, whiteSpace: "nowrap" }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            View Board
          </button>
        </div>

        {error && (
          <div style={{ color: "hsl(0,80%,65%)", fontSize: "0.88rem", padding: "10px 14px", background: "rgba(220,50,50,0.1)", borderRadius: "10px", border: "1px solid rgba(220,50,50,0.2)", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {/* Station info */}
            <div style={{ marginBottom: "1rem", padding: "1rem 1.25rem", background: "rgba(30,165,165,0.06)", border: "1px solid rgba(30,165,165,0.15)", borderRadius: "12px" }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>{result.station.name}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                {result.station.state && `${result.station.state} · `}{result.station.zone && `${result.station.zone} Zone`}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
              {(["departures", "arrivals"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: `1px solid ${tab === t ? "rgba(30,165,165,0.3)" : "rgba(255,255,255,0.08)"}`,
                    background: tab === t ? "rgba(30,165,165,0.12)" : "transparent",
                    color: tab === t ? "hsl(185,70%,55%)" : "var(--text-muted)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {t === "departures" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {t.charAt(0).toUpperCase() + t.slice(1)} ({t === "departures" ? result.total_departures : result.total_arrivals})
                </button>
              ))}
            </div>

            {/* Train list */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: "14px", overflow: "hidden" }}>
              {trains.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No {tab} found</div>
              ) : (
                trains.map((train: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0.85rem 1.25rem", borderBottom: i < trains.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                    <div style={{ width: "52px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem", fontWeight: 700, color: tab === "departures" ? "hsl(25,90%,60%)" : "hsl(145,60%,50%)" }}>
                      {formatTime(tab === "departures" ? train.departure : train.arrival)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{train.train_name}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        #{train.train_number} · {tab === "departures" ? `→ ${train.to_station}` : `← ${train.from_station}`}
                      </div>
                    </div>
                    {train.type && <span className="badge badge-blue" style={{ flexShrink: 0 }}>{train.type}</span>}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>
    </UtilityLayout>
  );
}
