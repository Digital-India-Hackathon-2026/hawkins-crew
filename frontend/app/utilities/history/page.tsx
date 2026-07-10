"use client";

import { History } from "lucide-react";
import { UtilityLayout, LiveApiNotice } from "@/components/utility/UtilityLayout";

export default function TrainHistoryPage() {
  return (
    <UtilityLayout
      title="Train History"
      icon={<History size={22} color="hsl(320,70%,60%)" />}
      iconBg="rgba(200,50,150,0.12)"
      description="View historical on-time performance and delay records for any train."
    >
      <div style={{ maxWidth: "520px" }}>
        <LiveApiNotice feature="Train History" />
        <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: "12px" }}>
          <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            <strong style={{ color: "white" }}>Train History</strong> shows historical arrival/departure times versus scheduled times, providing delay patterns and on-time performance statistics.
            <br /><br />
            This feature requires access to historical NTES data which is not stored locally. The Prayan route engine uses centrality-based reliability scoring as a proxy for route reliability.
          </div>
        </div>
      </div>
    </UtilityLayout>
  );
}
