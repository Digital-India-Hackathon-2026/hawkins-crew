"use client";

import dynamic from "next/dynamic";
import type { Route, Station } from "@/lib/api";

const RouteMap = dynamic(() => import("./RouteMap").then(mod => ({ default: mod.RouteMap })), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "500px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #E5E7EB",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAFAFA",
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: "#6B7280",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid #E5E7EB",
            borderTopColor: "#111111",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>Loading map...</p>
      </div>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  ),
});

interface RouteMapWrapperProps {
  route: Route;
  stations: Station[];
  className?: string;
}

export function RouteMapWrapper({ route, stations, className }: RouteMapWrapperProps) {
  return <RouteMap route={route} stations={stations} className={className} />;
}
