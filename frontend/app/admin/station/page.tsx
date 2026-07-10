"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Building2, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from "lucide-react";
import { useStations } from "@/contexts/StationsContext";
import { getStationDetails, type StationDetails } from "@/lib/api";

export default function StationDetailsPage() {
  const { stations, search } = useStations();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [stationDetails, setStationDetails] = useState<StationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = search(searchQuery);
      setSearchResults(results.slice(0, 8));
      setShowDropdown(true);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchQuery, search]);

  const handleSelectStation = (stationCode: string) => {
    setSelectedStation(stationCode);
    setSearchQuery(stationCode);
    setShowDropdown(false);
    setLoading(true);
    setError(null);

    getStationDetails(stationCode)
      .then((data) => {
        setStationDetails(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load station details");
        setLoading(false);
      });
  };

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
          Station Details
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "var(--text-secondary)",
            marginBottom: "2.5rem",
          }}
        >
          View transfer performance metrics for individual stations
        </p>

        {/* Station Search */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "2rem",
            position: "relative",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "0.75rem",
            }}
          >
            Select Station
          </label>
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <Search size={18} color="var(--text-muted)" />
            </div>
            <input
              type="text"
              placeholder="Search by station name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowDropdown(true)}
              style={{
                width: "100%",
                padding: "0.875rem 1rem 0.875rem 2.75rem",
                fontSize: "0.95rem",
                border: "1.5px solid var(--glass-border)",
                borderRadius: "12px",
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                outline: "none",
                transition: "all 0.2s ease",
              }}
            />
            {showDropdown && searchResults.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 0.5rem)",
                  left: 0,
                  right: 0,
                  background: "var(--bg-card)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  maxHeight: "300px",
                  overflowY: "auto",
                  zIndex: 100,
                }}
              >
                {searchResults.map((station) => (
                  <button
                    key={station.code}
                    onClick={() => handleSelectStation(station.code)}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--glass-border)",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--bg-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginBottom: "2px",
                      }}
                    >
                      {station.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {station.code} · {station.state || "Unknown State"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-secondary)",
            }}
          >
            Loading station details...
          </div>
        )}

        {/* Error State */}
        {error && (
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
        )}

        {/* Station Details */}
        {!loading && !error && stationDetails && (
          <>
            {/* Metrics Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1.25rem",
                marginBottom: "2rem",
              }}
            >
              <MetricCard
                label="Total Transfers"
                value={stationDetails.totalTransfers}
                icon={Building2}
                color="hsl(210,80%,60%)"
                bg="rgba(60,130,220,0.1)"
                border="rgba(60,130,220,0.2)"
              />
              <MetricCard
                label="Successful"
                value={stationDetails.successfulTransfers}
                icon={CheckCircle}
                color="hsl(145,60%,45%)"
                bg="rgba(50,180,100,0.1)"
                border="rgba(50,180,100,0.2)"
              />
              <MetricCard
                label="Failed"
                value={stationDetails.failedTransfers}
                icon={XCircle}
                color="hsl(0,70%,60%)"
                bg="rgba(220,50,50,0.1)"
                border="rgba(220,50,50,0.2)"
              />
              <MetricCard
                label="Success Rate"
                value={`${stationDetails.successRate}%`}
                icon={stationDetails.successRate >= 75 ? TrendingUp : TrendingDown}
                color={stationDetails.successRate >= 75 ? "hsl(145,60%,45%)" : "hsl(40,95%,55%)"}
                bg={stationDetails.successRate >= 75 ? "rgba(50,180,100,0.1)" : "rgba(255,170,50,0.1)"}
                border={stationDetails.successRate >= 75 ? "rgba(50,180,100,0.2)" : "rgba(255,170,50,0.2)"}
              />
              <MetricCard
                label="Avg Waiting Time"
                value={`${stationDetails.avgWaitingTime} min`}
                icon={Clock}
                color="hsl(185,70%,50%)"
                bg="rgba(30,165,165,0.1)"
                border="rgba(30,165,165,0.2)"
              />
            </div>

            {/* Top Train Pairs */}
            {stationDetails.topTrainPairs.length > 0 && (
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "16px",
                  padding: "1.5rem",
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
                  Top Train Pairs at {stationDetails.stationCode}
                </h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
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
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stationDetails.topTrainPairs.map((pair, i) => (
                        <tr
                          key={pair.trainPair}
                          style={{
                            borderBottom:
                              i < stationDetails.topTrainPairs.length - 1
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
                              fontWeight: 600,
                            }}
                          >
                            {pair.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && !error && !stationDetails && (
          <div
            style={{
              padding: "4rem",
              textAlign: "center",
              background: "var(--bg-card)",
              border: "1px solid var(--glass-border)",
              borderRadius: "16px",
            }}
          >
            <Building2 size={48} color="var(--text-muted)" style={{ marginBottom: "1rem" }} />
            <h3
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: "0.5rem",
              }}
            >
              Select a Station
            </h3>
            <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
              Search and select a station to view detailed transfer analytics
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  border,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${border}`,
        borderRadius: "16px",
        padding: "1.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <div
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--text-secondary)",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: bg,
            border: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} color={color} />
        </div>
      </div>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "1.75rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </motion.div>
  );
}
