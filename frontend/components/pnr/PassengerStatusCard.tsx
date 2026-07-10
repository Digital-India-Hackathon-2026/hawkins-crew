"use client";

import type { PNRPassenger } from "@/lib/api";
import { StatusBadge } from "./StatusBadge";

export function PassengerStatusCard({
  passenger,
  index,
}: {
  passenger: PNRPassenger;
  index: number;
}) {
  const current = passenger.current_status || "";
  const booking = passenger.booking_status || "";

  // Parse coach/berth from current status like "CNF/S6/71/GN" or "RAC/12/GN"
  const parseStatus = (s: string) => {
    const parts = s.split("/").filter(Boolean);
    let coach = "";
    let berth = "";
    let berthType = "";

    if (parts.length >= 3) {
      // e.g. CNF/S6/71/GN -> coach=S6, berth=71, berthType=GN
      coach = parts[1] || "";
      berth = parts[2] || "";
      berthType = parts[3] || "";
    } else if (parts.length === 2) {
      // e.g. RAC/12/GN
      coach = parts[1] || "";
    }

    return { coach, berth, berthType };
  };

  const currentParsed = parseStatus(current);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "12px",
        padding: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 700,
            fontSize: "0.85rem",
            color: "var(--text-primary)",
          }}
        >
          Passenger {index + 1}
        </span>
        <StatusBadge status={current} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          fontSize: "0.82rem",
        }}
      >
        <div>
          <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
            Booking Status
          </span>
          <div style={{ color: "var(--text-secondary)", fontWeight: 500, marginTop: "2px" }}>
            {booking || "—"}
          </div>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
            Current Status
          </span>
          <div style={{ color: "var(--text-secondary)", fontWeight: 500, marginTop: "2px" }}>
            {current || "—"}
          </div>
        </div>
        {currentParsed.coach && (
          <div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
              Coach
            </span>
            <div
              style={{
                color: "hsl(25,90%,60%)",
                fontWeight: 600,
                marginTop: "2px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {currentParsed.coach}
            </div>
          </div>
        )}
        {currentParsed.berth && (
          <div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
              Berth
            </span>
            <div
              style={{
                color: "hsl(25,90%,60%)",
                fontWeight: 600,
                marginTop: "2px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {currentParsed.berth}
              {currentParsed.berthType ? `/${currentParsed.berthType}` : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
