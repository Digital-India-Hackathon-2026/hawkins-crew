"use client";

import { motion } from "framer-motion";
import { Train, MapPin, Clock, Users, Calendar } from "lucide-react";
import type { PNRData } from "@/lib/api";
import { PassengerStatusCard } from "./PassengerStatusCard";
import { StatusBadge } from "./StatusBadge";

export function PNRStatusResult({ data }: { data: PNRData }) {
  const chartStyle = (data.chart_prepared || "").toUpperCase();
  const chartBadgeClass =
    chartStyle === "YES"
      ? "badge badge-success"
      : chartStyle === "NO"
        ? "badge badge-warning"
        : "badge badge-blue";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      {/* A. PNR Overview Card */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(50,180,100,0.2)",
          borderRadius: "16px",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "hsl(145,60%,50%)",
                letterSpacing: "0.08em",
                marginBottom: "4px",
              }}
            >
              PNR: {data.pnr}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {data.booking_status && (
                <StatusBadge status={data.booking_status} />
              )}
              {data.current_status && (
                <StatusBadge status={data.current_status} />
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px" }}
            >
              Chart
            </div>
            <span className={chartBadgeClass}>
              {chartStyle === "YES" ? "Chart Prepared" : chartStyle || "Unknown"}
            </span>
          </div>
        </div>

        {data.last_updated && (
          <div
            style={{
              fontSize: "0.72rem",
              color: "var(--text-muted)",
              textAlign: "right",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: "0.75rem",
              marginTop: "0.5rem",
            }}
          >
            Last updated: {data.last_updated}
          </div>
        )}
      </div>

      {/* B. Train Details */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          padding: "1.25rem 1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "1rem",
          }}
        >
          <Train size={16} color="hsl(25,90%,60%)" />
          <span
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "white",
            }}
          >
            Train Details
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "2px" }}>
              Train Number
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                fontSize: "1rem",
                color: "var(--text-primary)",
              }}
            >
              {data.train_number || "—"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "2px" }}>
              Train Name
            </div>
            <div
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "white",
              }}
            >
              {data.train_name || "—"}
            </div>
          </div>
          {data.journey_class && (
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "2px" }}>
                Class
              </div>
              <span className="badge badge-blue">{data.journey_class}</span>
            </div>
          )}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                marginBottom: "2px",
              }}
            >
              <Calendar size={12} />
              Journey Date
            </div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
              {data.journey_date || "—"}
            </div>
          </div>
          {data.boarding_date && data.boarding_date !== data.journey_date && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  marginBottom: "2px",
                }}
              >
                <Calendar size={12} />
                Boarding Date
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                {data.boarding_date}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* C. Journey Route */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          padding: "1.25rem 1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "1.25rem",
          }}
        >
          <MapPin size={16} color="hsl(25,90%,60%)" />
          <span
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "white",
            }}
          >
            Journey Route
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {/* Source */}
          <div style={{ flex: 1, minWidth: "140px" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "2px" }}>
              Source
            </div>
            <div
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                color: "hsl(25,90%,60%)",
              }}
            >
              {data.source || "—"}
            </div>
            {data.departure_time && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                  marginTop: "4px",
                }}
              >
                <Clock size={12} />
                {data.departure_time}
              </div>
            )}
          </div>

          {/* Visual arrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "40px",
                height: "2px",
                background: "linear-gradient(to right, hsl(25,90%,60%), hsl(145,60%,45%))",
                borderRadius: "1px",
              }}
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(145,60%,45%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>

          {/* Destination */}
          <div style={{ flex: 1, minWidth: "140px" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "2px" }}>
              Destination
            </div>
            <div
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                color: "hsl(145,60%,45%)",
              }}
            >
              {data.destination || "—"}
            </div>
            {data.arrival_time && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                  marginTop: "4px",
                }}
              >
                <Clock size={12} />
                {data.arrival_time}
              </div>
            )}
          </div>
        </div>

        {/* Visual timeline dots */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "1rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="timeline-dot" />
          <span
            style={{
              fontSize: "0.78rem",
              color: "hsl(25,90%,60%)",
              fontWeight: 600,
            }}
          >
            {data.source}
          </span>
          <div
            style={{
              flex: 1,
              height: "2px",
              background: "linear-gradient(to right, hsl(25,90%,60%), hsl(145,60%,45%))",
              borderRadius: "1px",
            }}
          />
          <div className="timeline-dot destination" />
          <span
            style={{
              fontSize: "0.78rem",
              color: "hsl(145,60%,45%)",
              fontWeight: 600,
            }}
          >
            {data.destination}
          </span>
        </div>
      </div>

      {/* D. Passenger Status */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--glass-border)",
          borderRadius: "16px",
          padding: "1.25rem 1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "1rem",
          }}
        >
          <Users size={16} color="hsl(25,90%,60%)" />
          <span
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "white",
            }}
          >
            Passenger Status
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.78rem",
              color: "var(--text-muted)",
            }}
          >
            {data.passengers.length} passenger{data.passengers.length !== 1 ? "s" : ""}
          </span>
        </div>

        {data.passengers.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "10px",
            }}
          >
            {data.passengers.map((p, i) => (
              <PassengerStatusCard key={i} passenger={p} index={i} />
            ))}
          </div>
        ) : (
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              textAlign: "center",
              padding: "1rem",
            }}
          >
            No passenger data available.
          </div>
        )}
      </div>
    </motion.div>
  );
}
