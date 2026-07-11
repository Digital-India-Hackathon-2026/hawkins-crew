"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Settings2, Play, Search, TrendingUp, Zap, Map } from "lucide-react";
import { useStations } from "@/contexts/StationsContext";
import { runOptimization, type OptimizerResult } from "@/lib/api";

const RouteMap = dynamic(() => import("@/components/admin/RouteMap").then((mod) => ({ default: mod.RouteMap })), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "500px",
        background: "var(--bg-card)",
        border: "1px solid var(--glass-border)",
        borderRadius: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-secondary)",
      }}
    >
      Loading map...
    </div>
  ),
});

export default function TimetableOptimizerPage() {
  const { search } = useStations();
  const [stationQuery, setStationQuery] = useState("");
  const [stationResults, setStationResults] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [trainNumbers, setTrainNumbers] = useState("");
  const [maxShiftMinutes, setMaxShiftMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStationDropdown, setShowStationDropdown] = useState(false);
  const [mapMode, setMapMode] = useState<"before" | "after">("before");

  const handleStationSearch = (query: string) => {
    setStationQuery(query);
    if (query.trim()) {
      const results = search(query);
      setStationResults(results.slice(0, 8));
      setShowStationDropdown(true);
    } else {
      setStationResults([]);
      setShowStationDropdown(false);
    }
  };

  const handleSelectStation = (stationCode: string) => {
    setSelectedStation(stationCode);
    setStationQuery(stationCode);
    setShowStationDropdown(false);
  };

  const handleRunOptimization = async () => {
    if (!selectedStation) {
      setError("Please select a station");
      return;
    }

    if (!trainNumbers.trim()) {
      setError("Please enter at least one train number");
      return;
    }

    const trains = trainNumbers
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    setLoading(true);
    setError(null);

    try {
      const optimizationResult = await runOptimization({
        stationCode: selectedStation,
        trainNumbers: trains,
        maxShiftMinutes,
      });
      setResult(optimizationResult);
    } catch (err: any) {
      setError(err.message || "Optimization failed");
    } finally {
      setLoading(false);
    }
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
          Timetable Optimizer
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "var(--text-secondary)",
            marginBottom: "2.5rem",
          }}
        >
          Optimize train departure times to improve transfer success rates
        </p>

        {/* Configuration Panel */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
            borderRadius: "16px",
            padding: "1.5rem",
            marginBottom: "2rem",
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
            <Settings2 size={20} color="hsl(25,90%,55%)" />
            <h2
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Configuration
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gap: "1.5rem",
            }}
          >
            {/* Station Selection */}
            <div style={{ position: "relative" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "0.5rem",
                }}
              >
                Transfer Station
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
                  placeholder="Search station..."
                  value={stationQuery}
                  onChange={(e) => handleStationSearch(e.target.value)}
                  onFocus={() => stationQuery && setShowStationDropdown(true)}
                  className="input-base"
                  style={{
                    paddingLeft: "2.75rem",
                  }}
                />
                {showStationDropdown && stationResults.length > 0 && (
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
                      maxHeight: "250px",
                      overflowY: "auto",
                      zIndex: 100,
                    }}
                  >
                    {stationResults.map((station) => (
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
                          {station.code}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Train Numbers */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "0.5rem",
                }}
              >
                Train Numbers (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g., 12345, 12346, 12347"
                value={trainNumbers}
                onChange={(e) => setTrainNumbers(e.target.value)}
                className="input-base"
              />
            </div>

            {/* Max Shift */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "0.5rem",
                }}
              >
                Max Shift Window (minutes)
              </label>
              <input
                type="number"
                value={maxShiftMinutes}
                onChange={(e) => setMaxShiftMinutes(parseInt(e.target.value) || 10)}
                min={1}
                max={60}
                className="input-base"
              />
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunOptimization}
              disabled={loading}
              className="btn btn-primary"
              style={{
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              <Play size={18} />
              {loading ? "Running Optimization..." : "Run Optimization"}
            </button>

            {error && (
              <div
                style={{
                  padding: "1rem",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: "12px",
                  color: "hsl(0,70%,45%)",
                  fontSize: "0.9rem",
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Before/After Comparison */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1.5rem",
                marginBottom: "2rem",
              }}
            >
              <ComparisonCard
                title="Before Optimization"
                metrics={result.before}
                color="hsl(0,70%,60%)"
              />
              <ComparisonCard
                title="After Optimization"
                metrics={result.after}
                color="hsl(145,60%,45%)"
              />
            </div>

            {/* Optimizer Metadata Panel */}
            {result.optimizerMetadata && (
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  marginBottom: "2rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: "1rem",
                  }}
                >
                  Optimizer Details
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  <MetadataItem
                    label="Status"
                    value={result.optimizerMetadata.status.toUpperCase()}
                    color={
                      result.optimizerMetadata.status === "optimal"
                        ? "hsl(145,60%,45%)"
                        : result.optimizerMetadata.status === "feasible"
                        ? "hsl(40,95%,55%)"
                        : result.optimizerMetadata.status === "infeasible"
                        ? "hsl(0,70%,55%)"
                        : result.optimizerMetadata.status === "no_improvement"
                        ? "hsl(200,60%,50%)"
                        : "var(--text-secondary)"
                    }
                  />
                  <MetadataItem
                    label="Solve Time"
                    value={`${result.optimizerMetadata.solveTimeMs.toFixed(1)}ms`}
                  />
                  <MetadataItem
                    label="Trains Evaluated"
                    value={result.optimizerMetadata.trainsEvaluated}
                  />
                  <MetadataItem
                    label="Transfer Pairs"
                    value={result.optimizerMetadata.transferPairsEvaluated}
                  />
                  <MetadataItem
                    label="Transfers Before"
                    value={result.optimizerMetadata.successfulTransfersBefore}
                  />
                  <MetadataItem
                    label="Transfers After"
                    value={result.optimizerMetadata.successfulTransfersAfter}
                    color={
                      result.optimizerMetadata.successfulTransfersAfter >
                      result.optimizerMetadata.successfulTransfersBefore
                        ? "hsl(145,60%,45%)"
                        : undefined
                    }
                  />
                </div>
                {result.optimizerMetadata.status === "infeasible" && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      background: "#FEF2F2",
                      border: "1px solid #FECACA",
                      borderRadius: "8px",
                      color: "hsl(0,70%,45%)",
                      fontSize: "0.9rem",
                    }}
                  >
                    No improving schedule found within constraints. Try
                    increasing max shift window or selecting different trains.
                  </div>
                )}
                {result.optimizerMetadata.status === "no_improvement" && (
                  <div
                    style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      background: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                      borderRadius: "8px",
                      color: "hsl(200,70%,40%)",
                      fontSize: "0.9rem",
                    }}
                  >
                    Current timetable is already optimal for the selected
                    constraints. No schedule changes recommended.
                  </div>
                )}
              </div>
            )}

            {/* Route Visualization Map */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--glass-border)",
                borderRadius: "16px",
                padding: "1.5rem",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Map size={20} color="hsl(210,80%,60%)" />
                  <h2
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    Route Visualization
                  </h2>
                </div>

                {/* Before/After Toggle */}
                <div
                  style={{
                    display: "inline-flex",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "10px",
                    padding: "4px",
                  }}
                >
                  <button
                    onClick={() => setMapMode("before")}
                    style={{
                      padding: "8px 20px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      background: mapMode === "before" ? "var(--bg-card)" : "transparent",
                      color: mapMode === "before" ? "var(--text-primary)" : "var(--text-secondary)",
                      boxShadow: mapMode === "before" ? "0 2px 4px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    Before
                  </button>
                  <button
                    onClick={() => setMapMode("after")}
                    style={{
                      padding: "8px 20px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      background: mapMode === "after" ? "var(--bg-card)" : "transparent",
                      color: mapMode === "after" ? "var(--text-primary)" : "var(--text-secondary)",
                      boxShadow: mapMode === "after" ? "0 2px 4px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    After
                  </button>
                </div>
              </div>

              {/* Visual Comparison Summary */}
              {result.recommendedChanges.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "0.75rem",
                    marginBottom: "1rem",
                    padding: "1rem",
                    background: mapMode === "after" ? "rgba(255,193,7,0.08)" : "rgba(120,120,120,0.05)",
                    borderRadius: "10px",
                    border: `1px solid ${mapMode === "after" ? "rgba(255,193,7,0.2)" : "var(--glass-border)"}`,
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      Viewing
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {mapMode === "before" ? "Original Schedule" : "Optimized Schedule"}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      Routes Modified
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(40,95%,55%)" }}>
                      {result.recommendedChanges.filter(c => c.shiftMinutes > 0).length} / {result.recommendedChanges.length}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      Max Shift
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {Math.max(...result.recommendedChanges.map(c => c.shiftMinutes))} min
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      Improvement
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(145,60%,45%)" }}>
                      +{result.after.successRate - result.before.successRate}%
                    </div>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1rem",
                  marginBottom: "1rem",
                  padding: "1rem",
                  background: mapMode === "after" ? "rgba(255,193,7,0.08)" : "var(--bg-secondary)",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  border: `1px solid ${mapMode === "after" ? "rgba(255,193,7,0.2)" : "var(--glass-border)"}`,
                  transition: "all 0.3s ease",
                }}
              >
                {mapMode === "before" ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "24px",
                          height: "3px",
                          background: "hsl(25,90%,55%)",
                          borderRadius: "2px",
                          opacity: 0.65,
                        }}
                      />
                      <span style={{ color: "var(--text-secondary)" }}>Original Schedule</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "12px",
                          height: "20px",
                          background: "hsl(210,100%,45%)",
                          clipPath: "polygon(50% 0%, 100% 40%, 50% 100%, 0% 40%)",
                        }}
                      />
                      <span style={{ color: "var(--text-secondary)" }}>Station</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "16px",
                          height: "26px",
                          background: "hsl(210,100%,45%)",
                          clipPath: "polygon(50% 0%, 100% 40%, 50% 100%, 0% 40%)",
                        }}
                      />
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                        Junction Station
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "24px",
                          height: "6px",
                          background: "hsl(40,95%,55%)",
                          borderRadius: "2px",
                          backgroundImage: "repeating-linear-gradient(90deg, hsl(40,95%,55%) 0px, hsl(40,95%,55%) 10px, transparent 10px, transparent 16px)",
                        }}
                      />
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>⚡ Optimized Route</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "24px",
                          height: "3px",
                          background: "hsl(25,90%,55%)",
                          borderRadius: "2px",
                          opacity: 0.65,
                        }}
                      />
                      <span style={{ color: "var(--text-secondary)" }}>Unchanged Route</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "16px",
                          height: "26px",
                          background: "hsl(210,100%,45%)",
                          clipPath: "polygon(50% 0%, 100% 40%, 50% 100%, 0% 40%)",
                        }}
                      />
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                        Junction Station
                      </span>
                    </div>
                  </>
                )}
              </div>

              <RouteMap
                junctionStationCode={result.stationCode}
                trains={result.recommendedChanges}
                mode={mapMode}
              />
            </div>

            {/* Recommended Changes */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--glass-border)",
                borderRadius: "16px",
                padding: "1.5rem",
                marginBottom: "2rem",
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
                <Zap size={20} color="hsl(40,95%,55%)" />
                <h2
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  Recommended Timetable Changes
                </h2>
              </div>
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
                        }}
                      >
                        Train
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "0.75rem",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                        }}
                      >
                        Current
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "0.75rem",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                        }}
                      >
                        Recommended
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "0.75rem",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                        }}
                      >
                        Shift
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "0.75rem",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                        }}
                      >
                        Reason
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "0.75rem",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                        }}
                      >
                        Impact
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.recommendedChanges.map((change, i) => (
                      <tr
                        key={change.trainNumber}
                        style={{
                          borderBottom:
                            i < result.recommendedChanges.length - 1
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
                          <div>{change.trainNumber}</div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              fontWeight: 400,
                            }}
                          >
                            {change.trainName}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "1rem 0.75rem",
                            fontSize: "0.9rem",
                            color: "var(--text-secondary)",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {change.currentDeparture}
                        </td>
                        <td
                          style={{
                            padding: "1rem 0.75rem",
                            fontSize: "0.9rem",
                            color: "hsl(145,60%,45%)",
                            fontWeight: 600,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {change.recommendedDeparture}
                        </td>
                        <td
                          style={{
                            padding: "1rem 0.75rem",
                            fontSize: "0.9rem",
                            color: "hsl(40,95%,55%)",
                            fontWeight: 600,
                          }}
                        >
                          +{change.shiftMinutes} min
                        </td>
                        <td
                          style={{
                            padding: "1rem 0.75rem",
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                            maxWidth: "250px",
                          }}
                        >
                          {change.reason}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "1rem 0.75rem",
                            fontSize: "0.9rem",
                            color: "var(--text-primary)",
                            fontWeight: 600,
                          }}
                        >
                          +{change.improvementScore}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function ComparisonCard({
  title,
  metrics,
  color,
}: {
  title: string;
  metrics: any;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        background: "var(--bg-card)",
        border: `1px solid var(--glass-border)`,
        borderRadius: "16px",
        padding: "1.5rem",
      }}
    >
      <h3
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color,
          marginBottom: "1.25rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <MetricRow label="Avg Waiting Time" value={`${metrics.avgWaitingTime} min`} />
        <MetricRow label="Success Rate" value={`${metrics.successRate}%`} />
        <MetricRow label="Total Transfers" value={metrics.totalTransfers} />
        <MetricRow label="Problematic" value={metrics.problematicConnections} />
      </div>
    </motion.div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: "0.75rem",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      <span
        style={{
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "1.1rem",
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function MetadataItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          marginBottom: "4px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "1.1rem",
          fontWeight: 700,
          color: color || "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
