"use client";

import { useState } from "react";
import { CreditCard, Ticket } from "lucide-react";
import { UtilityLayout } from "@/components/utility/UtilityLayout";
import { PNRStatusForm } from "@/components/pnr/PNRStatusForm";
import { PNRStatusResult } from "@/components/pnr/PNRStatusResult";
import { checkPNRStatus } from "@/lib/api";
import type { PNRData } from "@/lib/api";

export default function PNRStatusPage() {
  const [result, setResult] = useState<PNRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async (pnr: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await checkPNRStatus(pnr);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || "Unable to fetch PNR status. Please verify the PNR number and try again.");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Unable to fetch PNR status. Please verify the PNR number and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UtilityLayout
      title="Check PNR Status"
      icon={<CreditCard size={22} color="hsl(145,60%,50%)" />}
      iconBg="rgba(50,180,100,0.12)"
      description="Enter your 10-digit PNR number to view booking, journey, and passenger confirmation details."
    >
      <div style={{ maxWidth: "640px" }}>
        <PNRStatusForm onCheck={handleCheck} loading={loading} />

        {error && (
          <div
            style={{
              color: "hsl(0,80%,65%)",
              fontSize: "0.88rem",
              padding: "10px 14px",
              background: "rgba(220,50,50,0.1)",
              borderRadius: "10px",
              border: "1px solid rgba(220,50,50,0.2)",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        {result && <PNRStatusResult data={result} />}

        {!result && !loading && !error && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1.5rem",
              background: "var(--bg-card)",
              border: "1px solid var(--glass-border)",
              borderRadius: "16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <Ticket size={48} color="hsl(145,60%,35%)" style={{ opacity: 0.5 }} />
            <p
              style={{
                fontSize: "0.88rem",
                color: "var(--text-muted)",
                maxWidth: "360px",
                lineHeight: 1.6,
              }}
            >
              Enter a 10-digit PNR number to check your ticket status.
            </p>
          </div>
        )}
      </div>
    </UtilityLayout>
  );
}
