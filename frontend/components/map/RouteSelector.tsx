"use client";

import { Award, Clock, RefreshCw, Train, TrendingUp } from "lucide-react";
import { formatDuration } from "@/lib/api";
import type { Route } from "@/lib/api";

interface RouteSelectorProps {
  routes: Route[];
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
}

export function RouteSelector({
  routes,
  selectedRouteIndex,
  onSelectRoute,
}: RouteSelectorProps) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "#111111",
              letterSpacing: "-0.01em",
              marginBottom: "4px",
            }}
          >
            Select Route
          </h3>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#6B7280",
              fontWeight: 500,
            }}
          >
            {routes.length} route{routes.length > 1 ? "s" : ""} found · Click to compare
          </p>
        </div>
      </div>

      {/* Route Options - Horizontal Scrollable on Mobile */}
      <div
        className="route-selector-scroll"
        style={{
          display: "flex",
          gap: "10px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        {routes.map((route, index) => {
          const isSelected = index === selectedRouteIndex;
          const isBest = index === 0;

          // Calculate reliability for quick preview
          const reliabilityPct = Math.min(
            100,
            Math.round(
              (Math.abs(route.score_breakdown.centrality_bonus || 0) / 7200) * 100 + 50
            )
          );

          return (
            <button
              key={index}
              onClick={() => onSelectRoute(index)}
              style={{
                minWidth: "200px",
                flex: "1 0 auto",
                maxWidth: "240px",
                padding: "12px 14px",
                background: isSelected ? "#F0F9FF" : "#FAFAFA",
                border: isSelected ? "2px solid hsl(215, 70%, 55%)" : "1px solid #E5E7EB",
                borderRadius: "10px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                textAlign: "left",
                position: "relative",
                boxShadow: isSelected ? "0 4px 12px rgba(66, 133, 244, 0.15)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = "#F9FAFB";
                  e.currentTarget.style.borderColor = "#D1D5DB";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = "#FAFAFA";
                  e.currentTarget.style.borderColor = "#E5E7EB";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {/* Radio Indicator */}
              <div
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: isSelected ? "5px solid hsl(215, 70%, 55%)" : "2px solid #D1D5DB",
                  background: "#FFFFFF",
                  transition: "all 0.2s ease",
                }}
              />

              {/* Route Header */}
              <div style={{ marginBottom: "10px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "6px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.9rem",
                      fontWeight: 800,
                      color: isSelected ? "hsl(215, 70%, 55%)" : "#111111",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Route #{route.rank}
                  </span>
                  {isBest && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        padding: "3px 8px",
                        background: "#FFF4ED",
                        border: "1px solid #FED7AA",
                        borderRadius: "100px",
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        color: "hsl(25, 90%, 55%)",
                      }}
                    >
                      <Award size={10} />
                      Best
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <QuickStat
                  icon={<Clock size={11} />}
                  value={formatDuration(route.total_duration)}
                  isSelected={isSelected}
                />
                <QuickStat
                  icon={<RefreshCw size={11} />}
                  value={`${route.num_transfers} transfer${route.num_transfers !== 1 ? "s" : ""}`}
                  isSelected={isSelected}
                />
                <QuickStat
                  icon={<Train size={11} />}
                  value={`${route.trains_used.length} train${route.trains_used.length !== 1 ? "s" : ""}`}
                  isSelected={isSelected}
                />
                <QuickStat
                  icon={<TrendingUp size={11} />}
                  value={`${reliabilityPct}%`}
                  isSelected={isSelected}
                />
              </div>

              {/* Score Indicator */}
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "#E5E7EB",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (reliabilityPct / 100) * 100)}%`,
                    height: "100%",
                    background: isSelected
                      ? "hsl(215, 70%, 55%)"
                      : reliabilityPct >= 80
                      ? "hsl(145, 60%, 45%)"
                      : reliabilityPct >= 60
                      ? "hsl(40, 95%, 55%)"
                      : "hsl(0, 70%, 55%)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .route-selector-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .route-selector-scroll::-webkit-scrollbar-track {
          background: #F3F4F6;
          border-radius: 3px;
        }
        .route-selector-scroll::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 3px;
        }
        .route-selector-scroll::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>
    </div>
  );
}

function QuickStat({
  icon,
  value,
  isSelected,
}: {
  icon: React.ReactNode;
  value: string;
  isSelected: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
      }}
    >
      <div style={{ color: isSelected ? "hsl(215, 70%, 55%)" : "#9CA3AF" }}>
        {icon}
      </div>
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          color: isSelected ? "hsl(215, 70%, 55%)" : "#6B7280",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </span>
    </div>
  );
}
