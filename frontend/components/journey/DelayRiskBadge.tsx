"use client";

import { AlertTriangle, ShieldCheck, Info, TrendingUp } from "lucide-react";
import { DelayRisk } from "@/lib/api";

interface DelayRiskBadgeProps {
  delayRisk: DelayRisk;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type RiskLevel = "Very Low" | "Low" | "Moderate" | "High" | "Very High" | "Unknown";

function getRiskLevel(score: number | null): RiskLevel {
  if (score === null || score === undefined) return "Unknown";
  if (score <= 20) return "Very Low";
  if (score <= 40) return "Low";
  if (score <= 60) return "Moderate";
  if (score <= 80) return "High";
  return "Very High";
}

interface RiskStyle {
  bg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  barColor: string;
  icon: React.ReactNode;
  sectionBg: string;
  sectionBorder: string;
}

function getRiskStyle(level: RiskLevel): RiskStyle {
  switch (level) {
    case "Very Low":
      return {
        bg: "#F0FDF4",
        border: "#BBF7D0",
        badgeBg: "#DCFCE7",
        badgeText: "#15803D",
        barColor: "#22C55E",
        icon: <ShieldCheck size={14} color="#15803D" />,
        sectionBg: "#F0FDF4",
        sectionBorder: "#BBF7D0",
      };
    case "Low":
      return {
        bg: "#F0FDF4",
        border: "#BBF7D0",
        badgeBg: "#DCFCE7",
        badgeText: "#15803D",
        barColor: "#4ADE80",
        icon: <ShieldCheck size={14} color="#15803D" />,
        sectionBg: "#F0FDF4",
        sectionBorder: "#BBF7D0",
      };
    case "Moderate":
      return {
        bg: "#FFFBEB",
        border: "#FDE68A",
        badgeBg: "#FEF3C7",
        badgeText: "#92400E",
        barColor: "#FBBF24",
        icon: <Info size={14} color="#92400E" />,
        sectionBg: "#FFFBEB",
        sectionBorder: "#FDE68A",
      };
    case "High":
      return {
        bg: "#FFF7ED",
        border: "#FED7AA",
        badgeBg: "#FFEDD5",
        badgeText: "#9A3412",
        barColor: "#F97316",
        icon: <AlertTriangle size={14} color="#9A3412" />,
        sectionBg: "#FFF7ED",
        sectionBorder: "#FED7AA",
      };
    case "Very High":
      return {
        bg: "#FEF2F2",
        border: "#FECACA",
        badgeBg: "#FEE2E2",
        badgeText: "#991B1B",
        barColor: "#EF4444",
        icon: <AlertTriangle size={14} color="#991B1B" />,
        sectionBg: "#FEF2F2",
        sectionBorder: "#FECACA",
      };
    default:
      return {
        bg: "#F9FAFB",
        border: "#E5E7EB",
        badgeBg: "#F3F4F6",
        badgeText: "#4B5563",
        barColor: "#9CA3AF",
        icon: <TrendingUp size={14} color="#6B7280" />,
        sectionBg: "#F9FAFB",
        sectionBorder: "#E5E7EB",
      };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DelayRiskBadge({ delayRisk }: DelayRiskBadgeProps) {
  // Unavailable / not yet fetched
  if (!delayRisk || !delayRisk.available) {
    return (
      <div
        style={{
          marginTop: "1.25rem",
          padding: "1rem 1.25rem",
          background: "#F9FAFB",
          borderRadius: "12px",
          border: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <TrendingUp size={16} color="#9CA3AF" />
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#6B7280",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "2px",
            }}
          >
            Delay Risk Analysis
          </div>
          <div style={{ fontSize: "0.85rem", color: "#9CA3AF" }}>
            {delayRisk?.description || "Delay analysis unavailable"}
          </div>
        </div>
      </div>
    );
  }

  const level = getRiskLevel(delayRisk.riskScore);
  const style = getRiskStyle(level);
  const score = delayRisk.riskScore ?? 0;

  return (
    <div
      style={{
        marginTop: "1.25rem",
        padding: "1.25rem",
        background: style.sectionBg,
        borderRadius: "12px",
        border: `1px solid ${style.sectionBorder}`,
      }}
    >
      {/* Section header */}
      <div
        style={{
          fontSize: "0.75rem",
          color: "#6B7280",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "12px",
        }}
      >
        Delay Risk Analysis
      </div>

      {/* Score row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Numeric score */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: "56px",
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', 'Courier New', monospace",
              fontSize: "1.75rem",
              fontWeight: 800,
              color: style.barColor,
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          <span
            style={{
              fontSize: "0.65rem",
              color: "#9CA3AF",
              fontWeight: 500,
              marginTop: "2px",
            }}
          >
            / 100
          </span>
        </div>

        {/* Vertical divider */}
        <div
          style={{
            width: "1px",
            height: "36px",
            background: style.border,
            flexShrink: 0,
          }}
        />

        {/* Level badge + progress bar */}
        <div style={{ flex: 1, minWidth: "120px" }}>
          {/* Level badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            {style.icon}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 10px",
                borderRadius: "100px",
                background: style.badgeBg,
                color: style.badgeText,
                fontSize: "0.76rem",
                fontWeight: 700,
                letterSpacing: "0.03em",
              }}
            >
              {level} Risk
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "100%",
              height: "6px",
              background: "#E5E7EB",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${score}%`,
                height: "100%",
                background: style.barColor,
                borderRadius: "999px",
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      {delayRisk.description && (
        <p
          style={{
            fontSize: "0.85rem",
            color: "#374151",
            lineHeight: 1.55,
            marginBottom: delayRisk.recommendation ? "8px" : "0",
          }}
        >
          {delayRisk.description}
        </p>
      )}

      {/* Recommendation */}
      {delayRisk.recommendation && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            padding: "8px 12px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.6)",
            border: `1px solid ${style.border}`,
          }}
        >
          <Info size={13} color={style.badgeText} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span
            style={{
              fontSize: "0.8rem",
              color: style.badgeText,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {delayRisk.recommendation}
          </span>
        </div>
      )}
    </div>
  );
}
