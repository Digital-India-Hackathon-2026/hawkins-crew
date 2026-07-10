"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Radio, Search, Loader2 } from "lucide-react";
import { UtilityLayout, LiveApiNotice } from "@/components/utility/UtilityLayout";

export default function LiveTrackingPage() {
  const [trainNo, setTrainNo] = useState("");
  const [searched, setSearched] = useState(false);

  return (
    <UtilityLayout
      title="Live Train Tracking"
      icon={<Radio size={22} color="hsl(0,70%,60%)" />}
      iconBg="rgba(220,50,50,0.12)"
      description="Track real-time position, delays, and upcoming stops for any train."
    >
      <div style={{ maxWidth: "520px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
          <input
            type="text"
            value={trainNo}
            onChange={(e) => setTrainNo(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="Enter train number"
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
            onKeyDown={(e) => e.key === "Enter" && setSearched(true)}
          />
          <button
            className="btn btn-primary"
            onClick={() => setSearched(true)}
            disabled={!trainNo.trim()}
            style={{ whiteSpace: "nowrap", opacity: !trainNo.trim() ? 0.6 : 1 }}
          >
            <Search size={16} /> Track
          </button>
        </div>

        {searched && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <LiveApiNotice feature="Live Train Tracking" />
          </motion.div>
        )}

        {!searched && (
          <div style={{ padding: "1.5rem", background: "rgba(220,50,50,0.06)", border: "1px solid rgba(220,50,50,0.12)", borderRadius: "12px" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <strong style={{ color: "hsl(0,70%,65%)" }}>Live Tracking</strong> shows real-time train position using Indian Railways' NTES system. This requires a live internet connection to NTES servers.
            </div>
          </div>
        )}
      </div>
    </UtilityLayout>
  );
}
