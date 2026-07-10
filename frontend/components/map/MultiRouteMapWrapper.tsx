"use client";

import dynamic from "next/dynamic";
import type { Route, Station } from "@/lib/api";

const MultiRouteMap = dynamic(
  () => import("./MultiRouteMap").then(mod => ({ default: mod.MultiRouteMap })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: "600px",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAFA",
        }}
      >
        <div style={{ textAlign: "center", color: "#6B7280" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid #E5E7EB",
              borderTopColor: "hsl(215, 70%, 55%)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "4px" }}>
            Loading Interactive Map...
          </p>
          <p style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>
            Preparing route visualization
          </p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    ),
  }
);

interface MultiRouteMapWrapperProps {
  routes: Route[];
  stations: Station[];
  selectedRouteIndex: number;
  onRouteSelect: (index: number) => void;
  className?: string;
}

export function MultiRouteMapWrapper({
  routes,
  stations,
  selectedRouteIndex,
  onRouteSelect,
  className,
}: MultiRouteMapWrapperProps) {
  return (
    <MultiRouteMap
      routes={routes}
      stations={stations}
      selectedRouteIndex={selectedRouteIndex}
      onRouteSelect={onRouteSelect}
      className={className}
    />
  );
}
