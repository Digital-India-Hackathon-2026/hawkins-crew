"use client";

import { MapPin, Circle } from "lucide-react";

interface LegendItem {
  label: string;
  color: string;
  icon?: "pin" | "circle";
}

interface RouteMapLegendProps {
  items?: LegendItem[];
}

const DEFAULT_ITEMS: LegendItem[] = [
  { label: "Origin", color: "hsl(145, 60%, 45%)", icon: "pin" },
  { label: "Transfer", color: "hsl(40, 95%, 50%)", icon: "pin" },
  { label: "Destination", color: "hsl(0, 70%, 55%)", icon: "pin" },
];

export function RouteMapLegend({ items = DEFAULT_ITEMS }: RouteMapLegendProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap",
        padding: "10px 14px",
        background: "rgba(255, 255, 255, 0.95)",
        borderRadius: "8px",
        border: "1px solid #E5E7EB",
        fontSize: "0.8rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {item.icon === "pin" ? (
            <MapPin size={14} color={item.color} fill={item.color} />
          ) : item.icon === "circle" ? (
            <Circle size={10} color={item.color} fill={item.color} />
          ) : (
            <div
              style={{
                width: "12px",
                height: "3px",
                background: item.color,
                borderRadius: "2px",
              }}
            />
          )}
          <span style={{ color: "#6B7280", fontWeight: 500 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
