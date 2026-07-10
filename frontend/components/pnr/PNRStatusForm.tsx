"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

interface PNRStatusFormProps {
  onCheck: (pnr: string) => void;
  loading: boolean;
}

export function PNRStatusForm({ onCheck, loading }: PNRStatusFormProps) {
  const [pnr, setPnr] = useState("");
  const [touched, setTouched] = useState(false);

  const numericPnr = pnr.replace(/\D/g, "");
  const isValid = numericPnr.length === 10;
  const showError = touched && !isValid && numericPnr.length > 0;

  const handleChange = (value: string) => {
    setPnr(value);
    if (!touched && value.length > 0) setTouched(true);
  };

  const handleSubmit = () => {
    if (isValid && !loading) {
      onCheck(numericPnr);
    }
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          type="text"
          inputMode="numeric"
          value={numericPnr}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Enter 10-digit PNR number"
          maxLength={10}
          style={{
            flex: 1,
            padding: "0.85rem 1rem",
            background: "rgba(255,255,255,0.05)",
            border: `1.5px solid ${
              showError
                ? "rgba(220,50,50,0.5)"
                : "rgba(255,255,255,0.1)"
            }`,
            borderRadius: "12px",
            color: "var(--text-primary)",
            fontSize: "1rem",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.12em",
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={() => setTouched(true)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading || !isValid}
          style={{
            whiteSpace: "nowrap",
            opacity: !isValid ? 0.6 : 1,
          }}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          {loading ? "Checking..." : "Check Status"}
        </button>
      </div>

      {/* Validation feedback */}
      {showError && (
        <div
          style={{
            fontSize: "0.78rem",
            color: "hsl(0,80%,65%)",
            marginTop: "6px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          PNR must be exactly 10 digits.
        </div>
      )}
      {!showError && numericPnr.length > 0 && (
        <div
          style={{
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            marginTop: "6px",
          }}
        >
          {numericPnr.length}/10 digits entered
        </div>
      )}
    </div>
  );
}
