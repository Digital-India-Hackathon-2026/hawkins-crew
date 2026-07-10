"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, Loader2, Calendar, Train } from "lucide-react";
import { UtilityLayout } from "@/components/utility/UtilityLayout";
import { StationAutocomplete } from "@/components/station/StationAutocomplete";
import { getAvailability, Station } from "@/lib/api";
import type { AvailEntry } from "@/lib/api";

const CLASSES = [
  { code: "SL", label: "Sleeper (SL)" },
  { code: "3A", label: "3rd AC (3A)" },
  { code: "2A", label: "2nd AC (2A)" },
  { code: "1A", label: "1st AC (1A)" },
  { code: "CC", label: "Chair Car (CC)" },
  { code: "2S", label: "2nd Sitting (2S)" },
];

const QUOTAS = [
  { code: "GN", label: "General (GN)" },
  { code: "CK", label: "Tatkal (CK)" },
  { code: "LB", label: "Ladies (LB)" },
  { code: "SS", label: "Senior Citizen (SS)" },
];

function AvailBadge({ availability }: { availability: string }) {
  const upper = (availability || "").toUpperCase();
  const isAvail = upper.includes("AVAIL") || upper.includes("CNF");
  const isRac = upper.includes("RAC");
  const isWl = upper.includes("WL");
  const isNotAvail = upper.includes("NOT") || upper.includes("NO");

  let badgeClass = "badge badge-success";
  let label = availability;

  if (isRac) {
    badgeClass = "badge badge-warning";
    label = "RAC";
  } else if (isWl) {
    badgeClass = "badge badge-warning";
  } else if (isNotAvail) {
    badgeClass = "badge badge-error";
    label = "Not Available";
  }

  return <span className={badgeClass}>{label}</span>;
}

export default function AvailabilityPage() {
  const [trainNo, setTrainNo] = useState("");
  const [from, setFrom] = useState<Station | null>(null);
  const [to, setTo] = useState<Station | null>(null);
  const [date, setDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [travelClass, setTravelClass] = useState("SL");
  const [quota, setQuota] = useState("GN");
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!trainNo || !from || !to) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const dateStr = date.replace(/-/g, "");
      const res = await getAvailability({
        train: trainNo,
        from: from.code,
        to: to.code,
        date: dateStr,
        class: travelClass,
        quota,
      });
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(
          res.error ||
            "Unable to fetch availability. Please verify the details and try again."
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Unable to fetch availability."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <UtilityLayout
      title="Seat Availability"
      icon={<Users size={22} color="hsl(270,70%,65%)" />}
      iconBg="rgba(130,60,220,0.12)"
      description="Check seat availability and waitlist status for any train and class."
    >
      <div style={{ maxWidth: "560px" }}>
        {/* Form */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "6px",
              }}
            >
              Train Number
            </label>
            <input
              type="text"
              value={trainNo}
              onChange={(e) =>
                setTrainNo(e.target.value.replace(/\D/g, "").slice(0, 5))
              }
              placeholder="e.g. 12345"
              style={{
                width: "100%",
                padding: "0.85rem 1rem",
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "var(--text-primary)",
                fontSize: "1rem",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.1em",
                outline: "none",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <StationAutocomplete
            id="avail-from"
            label="From Station"
            value={from}
            onChange={setFrom}
            placeholder="Source station..."
          />
          <StationAutocomplete
            id="avail-to"
            label="To Station"
            value={to}
            onChange={setTo}
            placeholder="Destination station..."
          />

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "6px",
                }}
              >
                Journey Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  outline: "none",
                  fontFamily: "'Inter', sans-serif",
                  colorScheme: "dark",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "6px",
                }}
              >
                Class
              </label>
              <select
                value={travelClass}
                onChange={(e) => setTravelClass(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  fontFamily: "'Inter', sans-serif",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {CLASSES.map((c) => (
                  <option
                    key={c.code}
                    value={c.code}
                    style={{ background: "#1a1a2e" }}
                  >
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "6px",
                }}
              >
                Quota
              </label>
              <select
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  fontFamily: "'Inter', sans-serif",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {QUOTAS.map((q) => (
                  <option
                    key={q.code}
                    value={q.code}
                    style={{ background: "#1a1a2e" }}
                  >
                    {q.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading || !trainNo || !from || !to}
            style={{
              width: "100%",
              opacity: !trainNo || !from || !to ? 0.6 : 1,
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            {loading ? "Checking..." : "Check Availability"}
          </button>
        </div>

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

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Train Summary */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid rgba(130,60,220,0.2)",
                borderRadius: "16px",
                padding: "1.25rem 1.5rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.8rem",
                      color: "hsl(270,70%,65%)",
                      fontWeight: 600,
                    }}
                  >
                    #{result.train_number}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: "white",
                      marginTop: "4px",
                    }}
                  >
                    {result.from_station} → {result.to_station}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="badge badge-blue">{result.class_code}</span>
                  <span
                    className="badge badge-accent"
                    style={{ marginLeft: "6px" }}
                  >
                    {result.quota}
                  </span>
                </div>
              </div>

              {/* Availability entries */}
              {result.availability && result.availability.length > 0 && (
                <div style={{ marginTop: "1.25rem" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {result.availability.map(
                      (entry: AvailEntry, i: number) => (
                        <div
                          key={i}
                          style={{
                            padding: "12px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: "10px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--text-muted)",
                              marginBottom: "4px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Calendar size={11} />
                            {entry.date}
                          </div>
                          <div style={{ marginBottom: "4px" }}>
                            <AvailBadge availability={entry.availability} />
                          </div>
                          {entry.confirm_pct && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              Confirmation: {entry.confirm_pct}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Empty state */}
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
            <Train size={48} color="hsl(270,70%,35%)" style={{ opacity: 0.5 }} />
            <p
              style={{
                fontSize: "0.88rem",
                color: "var(--text-muted)",
                maxWidth: "360px",
                lineHeight: 1.6,
              }}
            >
              Enter train details to check seat availability and waiting list
              status.
            </p>
          </div>
        )}
      </div>
    </UtilityLayout>
  );
}
