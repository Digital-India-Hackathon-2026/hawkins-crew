"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Route, ChevronDown, Train } from "lucide-react";
import { SearchCard } from "@/components/search/SearchCard";
import { JourneyCard } from "@/components/journey/JourneyCard";
import { findRoutes, Route as RouteType } from "@/lib/api";

export default function HomePage() {
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [lastSearch, setLastSearch] = useState<{
    from: string;
    to: string;
    date: string;
  } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (from: string, to: string, date: string) => {
    setIsLoading(true);
    setError(null);
    setSearched(false);

    try {
      const result = await findRoutes(from, to, date);
      console.log("🚂 Route search result:", JSON.stringify(result, null, 2));
      setRoutes(result.routes || []);
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

  return (
    <>
      {/* Hero Section */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Background image */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(/hero-bg.png)",
            backgroundSize: "cover",
            backgroundPosition: "center 60%",
            filter: "brightness(0.45) saturate(0.8)",
          }}
        />

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(10,14,26,0.3) 0%, rgba(10,14,26,0.2) 40%, rgba(10,14,26,0.85) 100%)",
          }}
        />

        {/* Content */}
        <div
          className="container"
          style={{
            position: "relative",
            zIndex: 10,
            padding: "6rem 1.5rem 3rem",
            textAlign: "center",
          }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ marginBottom: "1.5rem" }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 16px",
                borderRadius: "100px",
                background: "rgba(220,100,30,0.15)",
                border: "1px solid rgba(220,100,30,0.3)",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "hsl(25,90%,65%)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <Train size={13} />
              Intelligent Multi-Train Journey Planner
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "clamp(2.8rem, 7vw, 5rem)",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              marginBottom: "1.25rem",
            }}
          >
            Plan Your
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, hsl(35,95%,65%), hsl(25,90%,55%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Prayan
            </span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
              color: "rgba(255,255,255,0.7)",
              maxWidth: "520px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.6,
              fontWeight: 400,
            }}
          >
            Discover optimal multi-train routes across India's vast railway
            network. Smart transfers. Reliable connections. Every journey planned.
          </motion.p>

          {/* Search Card */}
          <SearchCard onSearch={handleSearch} isLoading={isLoading} />

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
                marginTop: "1rem",
                padding: "12px 20px",
                background: "rgba(220,50,50,0.15)",
                border: "1px solid rgba(220,50,50,0.25)",
                borderRadius: "12px",
                fontSize: "0.88rem",
                color: "hsl(0,80%,65%)",
                maxWidth: "640px",
                margin: "1rem auto 0",
              }}
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "2.5rem",
              marginTop: "3rem",
              flexWrap: "wrap",
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
                    fontFamily: "'Sora', sans-serif",
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: "hsl(35,95%,65%)",
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "rgba(255,255,255,0.5)",
                    marginTop: "4px",
                    fontWeight: 500,
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
              position: "absolute",
              bottom: "2rem",
              left: "50%",
              transform: "translateX(-50%)",
              color: "rgba(255,255,255,0.4)",
              animation: "bounce 1.5s ease-in-out infinite",
            }}
          >
            <ChevronDown size={24} />
          </div>
        )}

        <style jsx>{`
          @keyframes bounce {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(8px); }
          }
        `}</style>
      </section>

      {/* Results Section */}
      <div ref={resultsRef}>
        {searched && (
          <section
            style={{
              padding: "3rem 0 5rem",
              background: "var(--bg-primary)",
            }}
          >
            <div className="container">
              {/* Results header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: "1.5rem" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <Route size={20} color="hsl(25,90%,60%)" />
                  <h2
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      fontSize: "1.3rem",
                      fontWeight: 700,
                      color: "white",
                    }}
                  >
                    {routes.length > 0
                      ? `${routes.length} Route${routes.length > 1 ? "s" : ""} Found`
                      : "No Routes Found"}
                  </h2>
                </div>
                {lastSearch && (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
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
                    padding: "3rem",
                    textAlign: "center",
                    background: "var(--bg-card)",
                    borderRadius: "16px",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚂</div>
                  <h3
                    style={{
                      fontFamily: "'Sora', sans-serif",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: "8px",
                    }}
                  >
                    No routes found for this journey
                  </h3>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", maxWidth: "400px", margin: "0 auto" }}>
                    No connecting train combinations were found between these
                    stations on the selected date. Try a different date or
                    nearby stations.
                  </p>
                </motion.div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
                >
                  {routes.map((route) => (
                    <JourneyCard
                      key={route.rank}
                      route={route}
                      fromStation={lastSearch?.from || ""}
                      toStation={lastSearch?.to || ""}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
