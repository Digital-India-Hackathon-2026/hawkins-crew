"use client";

import { Clock, RefreshCw, Train, TrendingUp } from "lucide-react";
import { formatDuration } from "@/lib/api";

interface RouteSummaryOverlayProps {
  totalDuration: number;
  totalWaiting: number;
  numTransfers: number;
  numTrains: number;
  score?: number;
}

export function RouteSummaryOverlay({
  totalDuration,
  totalWaiting,
  numTransfers,
  numTrains,
  score,
}: RouteSummaryOverlayProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
        gap: "12px",
        padding: "12px",
        background: "rgba(255, 255, 255, 0.95)",
        borderRadius: "10px",
        border: "1px solid #E5E7EB",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <SummaryItem
        icon={<Clock size={14} />}
        label="Duration"
        value={formatDuration(totalDuration)}
      />
      <SummaryItem
        icon={<RefreshCw size={14} />}
        label="Transfers"
        value={numTransfers.toString()}
      />
      <SummaryItem
        icon={<Train size={14} />}
        label="Trains"
        value={numTrains.toString()}
      />
      <SummaryItem
        icon={<Clock size={14} />}
        label="Waiting"
        value={`${Math.floor(totalWaiting / 60)}m`}
      />
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          color: "#6B7280",
          fontSize: "0.7rem",
          fontWeight: 500,
          marginBottom: "4px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {icon}
        <span>{label}</span>
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.95rem",
          fontWeight: 700,
          color: "#111111",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
    </div>
  );
}
