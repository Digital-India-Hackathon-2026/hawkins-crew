"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, Loader2, Train, Clock, ArrowRight } from "lucide-react";
import { UtilityLayout } from "@/components/utility/UtilityLayout";
import { StationAutocomplete } from "@/components/station/StationAutocomplete";
import { searchTrainsBetweenStations, Station, formatTime } from "@/lib/api";

export default function TrainSearchPage() {
  const [from, setFrom] = useState<Station | null>(null);
  const [to, setTo] = useState<Station | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    setSearched(false);
    try {
      const data = await searchTrainsBetweenStations(from.code, to.code);
      setResults(data);
      setSearched(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <UtilityLayout
      title="Train Search"
      icon={<SearchIcon size={22} color="hsl(210,80%,60%)" />}
      iconBg="rgba(60,130,220,0.12)"
      description="Find all trains running between two stations."
    >
      <div style={{ maxWidth: "560px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
          <StationAutocomplete id="search-from" label="From Station" value={from} onChange={setFrom} placeholder="Source station..." />
          <StationAutocomplete id="search-to" label="To Station" value={to} onChange={setTo} placeholder="Destination station..." />
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading || !from || !to}
            style={{ width: "100%", opacity: (!from || !to) ? 0.6 : 1 }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <SearchIcon size={16} />}
            {loading ? "Searching..." : "Search Trains"}
          </button>
        </div>

        {error && (
          <div style={{ color: "hsl(0,80%,65%)", fontSize: "0.88rem", padding: "10px 14px", background: "rgba(220,50,50,0.1)", borderRadius: "10px", border: "1px solid rgba(220,50,50,0.2)", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        {searched && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {results.length > 0 ? `${results.length} train${results.length !== 1 ? "s" : ""} found` : "No trains found between these stations"}
            </div>
            {results.map((train, i) => (
              <div key={i} style={{ background: "var(--bg-card)", border: "1px solid rgba(60,130,220,0.15)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "hsl(210,80%,60%)", marginBottom: "4px" }}>#{train.train_number}</div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "white" }}>{train.train_name}</div>
                    {train.type && <span className="badge badge-blue" style={{ marginTop: "6px" }}>{train.type}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.9rem", fontFamily: "'JetBrains Mono', monospace" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 700, color: "white" }}>{formatTime(train.departure)}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Departs</div>
                    </div>
                    <ArrowRight size={14} color="var(--text-muted)" />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 700, color: "white" }}>{formatTime(train.arrival)}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Arrives</div>
                    </div>
                  </div>
                </div>
                {train.distance > 0 && (
                  <div style={{ marginTop: "8px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Distance: {train.distance} km · Duration: {train.duration_h}h {train.duration_m}m
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </UtilityLayout>
  );
}
