"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Search } from "lucide-react";
import { UtilityLayout, LiveApiNotice } from "@/components/utility/UtilityLayout";

export default function PNRStatusPage() {
  const [pnr, setPnr] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    if (pnr.length === 10) setSearched(true);
  };

  return (
    <UtilityLayout
      title="PNR Status"
      icon={<CreditCard size={22} color="hsl(145,60%,50%)" />}
      iconBg="rgba(50,180,100,0.12)"
      description="Check booking status and passenger details for any PNR number."
    >
      <div style={{ maxWidth: "520px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            value={pnr}
            onChange={(e) => setPnr(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Enter 10-digit PNR number"
            maxLength={10}
            style={{
              flex: 1,
              padding: "0.85rem 1rem",
              background: "rgba(255,255,255,0.05)",
              border: "1.5px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              color: "var(--text-primary)",
              fontSize: "1rem",
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.12em",
              outline: "none",
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={pnr.length !== 10}
            style={{ opacity: pnr.length !== 10 ? 0.6 : 1, whiteSpace: "nowrap" }}
          >
            <Search size={16} /> Check
          </button>
        </div>

        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "8px" }}>
          {pnr.length}/10 digits entered
        </p>

        {searched && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: "1.5rem" }}
          >
            <LiveApiNotice feature="PNR Status" />
          </motion.div>
        )}
      </div>
    </UtilityLayout>
  );
}
