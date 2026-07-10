"use client";

import { Clock, RefreshCw, Train, MapPin, Award, TrendingUp } from "lucide-react";
import { formatDuration } from "@/lib/api";
import type { NormalizedRoute } from "@/lib/map/normalizeRoute";

interface RouteSummaryProps {
  route: NormalizedRoute;
  isBest?: boolean;
}

export function RouteSummary({ route, isBest = false }: RouteSummaryProps) {
  const reliabilityPct = Math.min(
    100,
    Math.round(
      (Math.abs(route.scoreBreakdown.centrality_bonus || 0) / 7200) * 100 + 50
    )
  );

  const reliabilityColor =
    reliabilityPct >= 80
      ? "hsl(145, 60%, 45%)"
      : reliabilityPct >= 60
      ? "hsl(40, 95%, 55%)"
      : "hsl(0, 70%, 55%)";

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `2px solid ${isBest ? route.color : "#E5E7EB"}`,
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
          paddingBottom: "12px",
          borderBottom: "1px solid #F3F4F6",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "1rem",
              fontWeight: 800,
              color: "#111111",
              letterSpacing: "-0.01em",
              marginBottom: "4px",
            }}
          >
            Route #{route.rank}
          </div>
          {isBest && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                background: "#FFF4ED",
                border: "1px solid #FED7AA",
                borderRadius: "100px",
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "hsl(25, 90%, 55%)",
              }}
            >
              <Award size={11} />
              Best Recommended
            </div>
          )}
        </div>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: route.color,
            opacity: 0.15,
          }}
        />
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <StatItem
          icon={<Clock size={14} />}
          label="Duration"
          value={formatDuration(route.totalDuration)}
        />
        <StatItem
          icon={<RefreshCw size={14} />}
          label="Transfers"
          value={route.numTransfers.toString()}
        />
        <StatItem
          icon={<Train size={14} />}
          label="Trains"
          value={route.trainsUsed.length.toString()}
        />
        <StatItem
          icon={<Clock size={14} />}
          label="Waiting"
          value={`${Math.floor(route.totalWaiting / 60)}m`}
        />
        <StatItem
          icon={<MapPin size={14} />}
          label="Stations"
          value={route.stations.length.toString()}
        />
        <StatItem
          icon={<MapPin size={14} />}
          label="Distance"
          value={`${route.distance}km`}
        />
      </div>

      {/* Reliability */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px",
          background: "#FAFAFA",
          borderRadius: "8px",
          marginBottom: "12px",
        }}
      >
        <TrendingUp size={14} color={reliabilityColor} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "0.7rem",
              color: "#6B7280",
              fontWeight: 500,
              marginBottom: "4px",
            }}
          >
            Reliability Score
          </div>
          <div
            style={{
              width: "100%",
              height: "6px",
              background: "#E5E7EB",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${reliabilityPct}%`,
                height: "100%",
                background: reliabilityColor,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
        <div
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            color: reliabilityColor,
          }}
        >
          {reliabilityPct}%
        </div>
      </div>

      {/* Trains Used */}
      <div>
        <div
          style={{
            fontSize: "0.7rem",
            color: "#6B7280",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "8px",
          }}
        >
          Trains Used
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {route.trainsUsed.map((train, idx) => (
            <span
              key={idx}
              style={{
                padding: "4px 10px",
                borderRadius: "100px",
                background: "#F3F4F6",
                border: "1px solid #E5E7EB",
                fontSize: "0.75rem",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                color: "#111111",
              }}
            >
              {train}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          color: "#6B7280",
          fontSize: "0.7rem",
          fontWeight: 500,
          marginBottom: "4px",
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
