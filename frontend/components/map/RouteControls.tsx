"use client";

import { Eye, EyeOff, Maximize2, MapPin, RotateCcw } from "lucide-react";
import { useState } from "react";

interface RouteControlsProps {
  routes: Array<{ label: string; color: string }>;
  visibleRoutes: Set<number>;
  onToggleRoute: (routeIndex: number) => void;
  onFocusBest: () => void;
  onShowAll: () => void;
  onFitMap: () => void;
  onReset: () => void;
}

export function RouteControls({
  routes,
  visibleRoutes,
  onToggleRoute,
  onFocusBest,
  onShowAll,
  onFitMap,
  onReset,
}: RouteControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "10px",
        background: "rgba(255, 255, 255, 0.98)",
        borderRadius: "10px",
        border: "1px solid #E5E7EB",
        boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
        minWidth: "180px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.8rem",
            color: "#111111",
            letterSpacing: "-0.01em",
          }}
        >
          Route Controls
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        <ControlButton onClick={onFocusBest} label="Best" icon={<MapPin size={12} />} />
        <ControlButton onClick={onShowAll} label="All" icon={<Maximize2 size={12} />} />
        <ControlButton onClick={onFitMap} label="Fit" icon={<Maximize2 size={12} />} />
        <ControlButton onClick={onReset} label="Reset" icon={<RotateCcw size={12} />} />
      </div>

      {/* Route Toggles */}
      <div style={{ marginTop: "4px" }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: "100%",
            padding: "6px 8px",
            background: "transparent",
            border: "1px solid #E5E7EB",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#6B7280",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Toggle Routes</span>
          <span style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
        </button>

        {isExpanded && (
          <div
            style={{
              marginTop: "6px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {routes.map((route, idx) => {
              const isVisible = visibleRoutes.has(idx);
              return (
                <button
                  key={idx}
                  onClick={() => onToggleRoute(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 8px",
                    background: isVisible ? "#F3F4F6" : "transparent",
                    border: "1px solid #E5E7EB",
                    borderRadius: "6px",
                    fontSize: "0.7rem",
                    fontWeight: 500,
                    color: isVisible ? "#111111" : "#9CA3AF",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                  <div
                    style={{
                      width: "12px",
                      height: "3px",
                      background: route.color,
                      borderRadius: "2px",
                      opacity: isVisible ? 1 : 0.4,
                    }}
                  />
                  <span style={{ flex: 1 }}>{route.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        padding: "8px 6px",
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "6px",
        fontSize: "0.7rem",
        fontWeight: 600,
        color: "#6B7280",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#F3F4F6";
        e.currentTarget.style.borderColor = "#D1D5DB";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#FFFFFF";
        e.currentTarget.style.borderColor = "#E5E7EB";
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
