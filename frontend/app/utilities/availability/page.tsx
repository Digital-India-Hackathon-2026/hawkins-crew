"use client";

import { Users } from "lucide-react";
import { UtilityLayout, LiveApiNotice } from "@/components/utility/UtilityLayout";

export default function AvailabilityPage() {
  return (
    <UtilityLayout
      title="Seat Availability"
      icon={<Users size={22} color="hsl(270,70%,65%)" />}
      iconBg="rgba(130,60,220,0.12)"
      description="Check seat availability and waitlist status for any train and class."
    >
      <div style={{ maxWidth: "520px" }}>
        <LiveApiNotice feature="Seat Availability" />
        <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            <strong style={{ color: "white" }}>Seat Availability</strong> requires real-time access to Indian Railways' reservation system (PRS). This feature shows current booking status, waitlist numbers, and fare for specific dates and quotas.
            <br /><br />
            To enable this feature, configure access to the IRCTC PRS API or use the official IRCTC website at{" "}
            <a href="https://www.irctc.co.in" target="_blank" rel="noopener noreferrer" style={{ color: "hsl(270,70%,65%)", textDecoration: "underline" }}>irctc.co.in</a>.
          </div>
        </div>
      </div>
    </UtilityLayout>
  );
}
