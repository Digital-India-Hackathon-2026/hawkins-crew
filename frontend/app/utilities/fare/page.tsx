"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, Search, Loader2 } from "lucide-react";
import { UtilityLayout } from "@/components/utility/UtilityLayout";
import { StationAutocomplete } from "@/components/station/StationAutocomplete";
import { getFare, Station } from "@/lib/api";

const CLASSES = [
  { code: "SL", label: "Sleeper (SL)" },
  { code: "3A", label: "3rd AC (3A)" },
  { code: "2A", label: "2nd AC (2A)" },
  { code: "1A", label: "1st AC (1A)" },
  { code: "CC", label: "Chair Car (CC)" },
  { code: "2S", label: "2nd Sitting (2S)" },
];

export default function FareLookupPage() {
  const [trainNo, setTrainNo] = useState("");
  const [from, setFrom] = useState<Station | null>(null);
  const [to, setTo] = useState<Station | null>(null);
  const [travelClass, setTravelClass] = useState("SL");
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!trainNo || !from || !to) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await getFare({ train: trainNo, from: from.code, to: to.code, class: travelClass });
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Fare calculation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <UtilityLayout
      title="Fare Lookup"
      icon={<DollarSign size={22} color="hsl(40,95%,55%)" />}
      iconBg="rgba(255,170,50,0.12)"
      description="Calculate estimated ticket fare between stations for any train class."
    >
      <div style={{ maxWidth: "520px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Train Number</label>
            <input
              type="text"
              value={trainNo}
              onChange={(e) => setTrainNo(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="e.g. 12345"
              style={{ width: "100%", padding: "0.85rem 1rem", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "1rem", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", outline: "none" }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <StationAutocomplete id="fare-from" label="From Station" value={from} onChange={setFrom} placeholder="Source station..." />
          <StationAutocomplete id="fare-to" label="To Station" value={to} onChange={setTo} placeholder="Destination station..." />

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Travel Class</label>
            <select
              value={travelClass}
              onChange={(e) => setTravelClass(e.target.value)}
              style={{ width: "100%", padding: "0.85rem 1rem", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "0.95rem", fontFamily: "'Inter', sans-serif", outline: "none", cursor: "pointer" }}
            >
              {CLASSES.map((c) => <option key={c.code} value={c.code} style={{ background: "#1a1a2e" }}>{c.label}</option>)}
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading || !trainNo || !from || !to}
            style={{ width: "100%", opacity: (!trainNo || !from || !to) ? 0.6 : 1 }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {loading ? "Calculating..." : "Calculate Fare"}
          </button>
        </div>

        {error && (
          <div style={{ color: "hsl(0,80%,65%)", fontSize: "0.88rem", padding: "10px 14px", background: "rgba(220,50,50,0.1)", borderRadius: "10px", border: "1px solid rgba(220,50,50,0.2)", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {/* Fare result */}
            <div style={{ background: "var(--bg-card)", border: "1px solid rgba(255,170,50,0.2)", borderRadius: "16px", padding: "1.5rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "hsl(40,95%,55%)", marginBottom: "4px" }}>#{result.train_number} · {result.from_station} → {result.to_station}</div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>{result.train_name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "2px" }}>{travelClass} Fare</div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: "2rem", color: "hsl(40,95%,60%)" }}>₹{result.fare}</div>
                </div>
              </div>

              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Distance: ~{result.segment_distance_km} km
              </div>

              {/* Class-wise fares */}
              {Object.keys(result.class_fares).length > 0 && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>All Classes</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
                    {Object.entries(result.class_fares).map(([cls, fare]) => (
                      <div key={cls} style={{ padding: "10px", background: cls === travelClass ? "rgba(255,170,50,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${cls === travelClass ? "rgba(255,170,50,0.25)" : "rgba(255,255,255,0.06)"}`, borderRadius: "10px", textAlign: "center" }}>
                        <div style={{ fontSize: "0.7rem", color: cls === travelClass ? "hsl(40,95%,55%)" : "var(--text-muted)", fontWeight: 600, marginBottom: "4px" }}>{cls}</div>
                        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "1rem", color: cls === travelClass ? "hsl(40,95%,62%)" : "var(--text-primary)" }}>₹{fare as number}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1rem", lineHeight: 1.5 }}>{result.note}</p>
            </div>
          </motion.div>
        )}
      </div>
    </UtilityLayout>
  );
}
