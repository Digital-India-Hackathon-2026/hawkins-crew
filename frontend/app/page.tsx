"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Route, ChevronDown, Train, Map as MapIcon } from "lucide-react";
import { SearchCard } from "@/components/search/SearchCard";
import { JourneyCard } from "@/components/journey/JourneyCard";
import { MultiRouteMapWrapper } from "@/components/map/MultiRouteMapWrapper";
import { useStations } from "@/contexts/StationsContext";
import { findRoutes, Route as RouteType } from "@/lib/api";

export default function HomePage() {
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [lastSearch, setLastSearch] = useState<{
    from: string;
    to: string;
    date: string;
  } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { stations } = useStations();

  const handleSearch = async (from: string, to: string, date: string) => {
    setIsLoading(true);
    setError(null);
    setSearched(false);

    try {
      const result = await findRoutes(from, to, date);
      console.log("🚂 Route search result:", JSON.stringify(result, null, 2));
      setRoutes(result.routes || []);
      setSelectedRouteIndex(0); // Select first route by default
      setLastSearch({ from, to, date });
      setSearched(true);

      // Fire and forget log saving
      fetch('/api/logs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceStation: { code: from, name: from },
          destinationStation: { code: to, name: to },
          dateOfJourney: new Date(date),
          dayOfWeek: new Date(date).getDay(),
          searchParameters: { optimizationObjective: 'DEFAULT' },
          performanceMetrics: { executionTimeMs: 0, candidateRoutesEvaluated: result.routes?.length || 0 },
          routes: (result.routes || []).map(r => ({
            rank: r.rank,
            totalTravelTime: r.score_breakdown?.travel_time || 0,
            totalWaitingTime: r.total_waiting || 0,
            numberOfTransfers: r.num_transfers || 0,
            overallScore: r.score || 0,
            isRecommended: r.rank === 1,
            legs: r.segments.filter(s => s.type === 'travel').map(s => {
              return {
                trainNumber: (s as any).train_number,
                fromStation: (s as any).from_station,
                toStation: (s as any).to_station
              };
            })
          })),
          status: { isSuccess: true },
          metadata: { apiVersion: '1.0' }
        })
      }).catch(err => console.error('Failed to save search log', err));

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setRoutes([]);
        setSelectedRouteIndex(0);
        setLastSearch({ from, to, date });
        setSearched(true);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      } else {
        setError(
          err?.response?.data?.error ||
            "Failed to connect to backend. Make sure the Flask server is running on port 5000."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRouteSelect = (index: number) => {
    setSelectedRouteIndex(index);
  };

  return (
    <>
      {/* Hero Section */}
      <section
        style={{
          position: "relative",
          minHeight: "55vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          //overflow: "hidden",
          backgroundImage: "url('/hero-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          paddingTop: "80px",
          paddingBottom: "0",
        }}
      >
        {/* Dark overlay for better text contrast */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.6))",
            zIndex: 1,
          }}
        />

        {/* Content */}
        <div
          className="container"
          style={{
            position: "relative",
            zIndex: 10,
            padding: "2rem 1.5rem 0",
            textAlign: "center",
          }}
        >
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "clamp(2.5rem, 7vw, 4.5rem)",
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              marginBottom: "1rem",
              textShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            Find Your Journey
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontSize: "clamp(1rem, 2.2vw, 1.15rem)",
              color: "rgba(255, 255, 255, 0.95)",
              maxWidth: "520px",
              margin: "0 auto 3rem",
              lineHeight: 1.6,
              fontWeight: 400,
              textShadow: "0 2px 12px rgba(0,0,0,0.4)",
            }}
          >
            Discover optimal multi-train routes across India
          </motion.p>

          {/* Search Card - Overlapping both sections */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              position: "relative",
              maxWidth: "1100px",
              margin: "0 auto",
              marginBottom: "-140px",
              paddingBottom: "1rem",
              zIndex: 200,
            }}
          >
            <SearchCard onSearch={handleSearch} isLoading={isLoading} />
          </motion.div>

        </div>
      </section>

      {/* Info Section */}
      <section
        style={{
          paddingTop: "180px",
          paddingBottom: "4rem",
          background: "#FFFFFF",
        }}
      >
        <div className="container">
          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginBottom: "2.5rem",
                padding: "14px 24px",
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "12px",
                fontSize: "0.9rem",
                color: "hsl(0,70%,45%)",
                maxWidth: "640px",
                margin: "0 auto 2.5rem",
              }}
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "clamp(2rem, 6vw, 5rem)",
              flexWrap: "wrap",
              padding: "1rem 0",
            }}
          >
            {[
              { value: "8,990+", label: "Stations" },
              { value: "5,200+", label: "Trains" },
              { value: "417K+", label: "Schedule Entries" },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                    fontWeight: 800,
                    color: "#111111",
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "clamp(0.8rem, 1.5vw, 0.9rem)",
                    color: "#6B7280",
                    marginTop: "8px",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        {searched && (
          <div
            style={{
              textAlign: "center",
              marginTop: "2rem",
              color: "#9CA3AF",
              animation: "bounce 1.5s ease-in-out infinite",
            }}
          >
            <ChevronDown size={24} />
          </div>
        )}

        <style jsx>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(8px); }
          }
        `}</style>
      </section>

      {/* Results Section */}
      <div ref={resultsRef}>
        {searched && (
          <section
            style={{
              padding: "4rem 0 6rem",
              background: "#FAFAFA",
              borderTop: "1px solid #ECECEC",
            }}
          >
            <div className="container">
              {/* Results header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: "2rem" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <Route size={22} color="var(--accent)" />
                  <h2
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "1.75rem",
                      fontWeight: 800,
                      color: "#111111",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {routes.length > 0
                      ? `${routes.length} Route${routes.length > 1 ? "s" : ""} Found`
                      : "No Routes Found"}
                  </h2>
                </div>
                {lastSearch && (
                  <p style={{ fontSize: "0.9rem", color: "#6B7280" }}>
                    {lastSearch.from} → {lastSearch.to} · {lastSearch.date}
                    {routes.length > 0 && " · Ranked by optimal score"}
                  </p>
                )}
              </motion.div>

              {routes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    padding: "4rem 3rem",
                    textAlign: "center",
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    border: "1px solid #ECECEC",
                  }}
                >
                  <div style={{ fontSize: "3.5rem", marginBottom: "1.5rem" }}>🚂</div>
                  <h3
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "#111111",
                      marginBottom: "12px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    No routes found for this journey
                  </h3>
                  <p style={{ fontSize: "0.95rem", color: "#6B7280", maxWidth: "440px", margin: "0 auto", lineHeight: 1.6 }}>
                    No connecting train combinations were found between these
                    stations on the selected date. Try a different date or
                    nearby stations.
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Interactive Multi-Route Map */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ marginBottom: "2rem" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                      <MapIcon size={20} color="var(--accent)" />
                      <div style={{ flex: 1 }}>
                        <h3
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "1.3rem",
                            fontWeight: 800,
                            color: "#111111",
                            letterSpacing: "-0.02em",
                            marginBottom: "4px",
                          }}
                        >
                          Interactive Route Map
                        </h3>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            color: "#6B7280",
                            fontWeight: 500,
                          }}
                        >
                          Comparing {routes.length} route{routes.length > 1 ? "s" : ""} · Click any route to explore · Zoom and pan to navigate
                        </p>
                      </div>
                    </div>
                    <MultiRouteMapWrapper
                      routes={routes}
                      stations={stations}
                      selectedRouteIndex={selectedRouteIndex}
                      onRouteSelect={setSelectedRouteIndex}
                    />
                  </motion.div>

                  {/* Route Cards */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                    <Train size={18} color="var(--accent)" />
                    <h3
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "#111111",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Available Routes
                    </h3>
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                  >
                    {routes.map((route, index) => (
                      <div
                        key={route.rank}
                        onClick={() => handleRouteSelect(index)}
                        style={{
                          cursor: "pointer",
                          outline: selectedRouteIndex === index ? "3px solid var(--accent)" : "none",
                          outlineOffset: "-3px",
                          borderRadius: "16px",
                          transition: "outline 0.2s ease",
                        }}
                      >
                        <JourneyCard
                          route={route}
                          fromStation={lastSearch?.from || ""}
                          toStation={lastSearch?.to || ""}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
