"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { getTransferAnalytics, type TransferAnalytics } from "@/lib/api";

export default function TransferAnalyticsPage() {
  const [analytics, setAnalytics] = useState<TransferAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTransferAnalytics()
      .then((data) => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load analytics");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: "3rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <div style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>
          Loading analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "3rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <div
          style={{
            padding: "2rem",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "12px",
            color: "hsl(0,70%,45%)",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  const topStations = analytics?.stationSuccessRates.slice(0, 10) || [];
  const trainPairs = analytics?.problematicTrainPairs || [];

  const successRateData = topStations.map((s) => ({
    station: s.station,
    successRate: Math.round(s.successRate),
    failRate: 100 - Math.round(s.successRate),
  }));

  const COLORS = ["hsl(145,60%,45%)", "hsl(0,70%,60%)"];

  return (
    <div style={{ padding: "3rem 2rem" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "2rem",
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            marginBottom: "0.5rem",
          }}
        >
          Transfer Analytics
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "var(--text-secondary)",
            marginBottom: "2.5rem",
          }}
        >
          Success rates and patterns across transfer stations
        </p>

        {/* Success Rate by Station */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "1.5rem",
            }}
          >
            Success Rate by Station (Top 10)
          </h2>
          {successRateData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={successRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
                <XAxis
                  dataKey="station"
                  tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  label={{
                    value: "Success Rate (%)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "var(--text-secondary)",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                  }}
                />
                <Bar dataKey="successRate" fill="hsl(145,60%,45%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              No station data available
            </div>
          )}
        </div>

        {/* Station Details Table */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "1.5rem",
            }}
          >
            Station Performance Details
          </h2>
          {topStations.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--glass-border)",
                    }}
                  >
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.75rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Station
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "0.75rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Total
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "0.75rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Success
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "0.75rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Failed
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "0.75rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Rate
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "0.75rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Avg Wait
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topStations.map((station, i) => (
                    <tr
                      key={station.station}
                      style={{
                        borderBottom:
                          i < topStations.length - 1
                            ? "1px solid var(--glass-border)"
                            : "none",
                      }}
                    >
                      <td
                        style={{
                          padding: "1rem 0.75rem",
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {station.station}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "1rem 0.75rem",
                          fontSize: "0.9rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {station.total}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "1rem 0.75rem",
                          fontSize: "0.9rem",
                          color: "hsl(145,60%,45%)",
                          fontWeight: 600,
                        }}
                      >
                        {station.successful}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "1rem 0.75rem",
                          fontSize: "0.9rem",
                          color: "hsl(0,70%,60%)",
                          fontWeight: 600,
                        }}
                      >
                        {station.failed}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "1rem 0.75rem",
                          fontSize: "0.9rem",
                          color:
                            station.successRate >= 75
                              ? "hsl(145,60%,45%)"
                              : "hsl(40,95%,55%)",
                          fontWeight: 700,
                        }}
                      >
                        {Math.round(station.successRate)}%
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "1rem 0.75rem",
                          fontSize: "0.9rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {Math.round(station.avgWaitTime)} min
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              No station data available
            </div>
          )}
        </div>

        {/* Problematic Train Pairs */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "1.5rem",
            }}
          >
            <AlertTriangle size={20} color="hsl(40,95%,55%)" />
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Problematic Train Pairs
            </h2>
          </div>
          {trainPairs.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--glass-border)",
                    }}
                  >
                    <th
                      style={{
                        textAlign: "left",
                        padding: "0.75rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Train Pair
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "0.75rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Total Attempts
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "0.75rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Failures
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "0.75rem",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Success Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trainPairs.map((pair, i) => (
                    <tr
                      key={pair.trainPair}
                      style={{
                        borderBottom:
                          i < trainPairs.length - 1
                            ? "1px solid var(--glass-border)"
                            : "none",
                      }}
                    >
                      <td
                        style={{
                          padding: "1rem 0.75rem",
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {pair.trainPair}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "1rem 0.75rem",
                          fontSize: "0.9rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {pair.totalAttempts}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "1rem 0.75rem",
                          fontSize: "0.9rem",
                          color: "hsl(0,70%,60%)",
                          fontWeight: 600,
                        }}
                      >
                        {pair.failures}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "1rem 0.75rem",
                          fontSize: "0.9rem",
                          color:
                            pair.successRate >= 75
                              ? "hsl(145,60%,45%)"
                              : pair.successRate >= 50
                              ? "hsl(40,95%,55%)"
                              : "hsl(0,70%,60%)",
                          fontWeight: 700,
                        }}
                      >
                        {pair.successRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              No problematic train pairs found
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
