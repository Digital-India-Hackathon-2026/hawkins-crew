"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, Search, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { StationAutocomplete } from "@/components/station/StationAutocomplete";
import { Station } from "@/lib/api";

interface SearchCardProps {
  onSearch: (from: string, to: string, date: string) => void;
  isLoading: boolean;
}

export function SearchCard({ onSearch, isLoading }: SearchCardProps) {
  const [from, setFrom] = useState<Station | null>(null);
  const [to, setTo] = useState<Station | null>(null);
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [error, setError] = useState<string | null>(null);

  const handleSwap = useCallback(() => {
    setFrom(to);
    setTo(from);
  }, [from, to]);

  const handleSearch = () => {
    setError(null);
    if (!from || !to) {
      setError("Please select both source and destination stations.");
      return;
    }
    if (from.code === to.code) {
      setError("Source and destination cannot be the same station.");
      return;
    }
    if (!date) {
      setError("Please select a travel date.");
      return;
    }
    onSearch(from.code, to.code, date);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      style={{
        background: "rgba(10, 14, 26, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "20px",
        padding: "2rem",
        boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
        width: "100%",
        maxWidth: "640px",
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: "1.25rem" }}>
        <h2
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: "1rem",
            fontWeight: 700,
            color: "white",
            marginBottom: "4px",
          }}
        >
          Find Your Journey
        </h2>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
          Discover optimal multi-train routes across India
        </p>
      </div>

      {/* Station inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ position: "relative" }}>
          <StationAutocomplete
            id="from-station"
            label="From"
            value={from}
            onChange={setFrom}
            placeholder="Source station..."
          />
        </div>

        {/* Swap button */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleSwap}
            aria-label="Swap source and destination"
            style={{
              background: "rgba(220,100,30,0.15)",
              border: "1px solid rgba(220,100,30,0.25)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
              color: "hsl(25,90%,60%)",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = "rgba(220,100,30,0.25)";
              (e.target as HTMLButtonElement).style.transform = "rotate(180deg)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = "rgba(220,100,30,0.15)";
              (e.target as HTMLButtonElement).style.transform = "rotate(0deg)";
            }}
          >
            <ArrowLeftRight size={16} />
          </button>
        </div>

        <StationAutocomplete
          id="to-station"
          label="To"
          value={to}
          onChange={setTo}
          placeholder="Destination station..."
        />

        {/* Date input */}
        <div>
          <label
            htmlFor="travel-date"
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
            Travel Date
          </label>
          <div style={{ position: "relative" }}>
            <Calendar
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              id="travel-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              style={{
                width: "100%",
                padding: "0.85rem 1rem 0.85rem 2.5rem",
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "var(--text-primary)",
                fontSize: "0.95rem",
                fontFamily: "'Inter', sans-serif",
                outline: "none",
                colorScheme: "dark",
              }}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "1rem",
            padding: "10px 14px",
            background: "rgba(220,50,50,0.1)",
            border: "1px solid rgba(220,50,50,0.2)",
            borderRadius: "10px",
            fontSize: "0.85rem",
            color: "hsl(0,80%,65%)",
          }}
        >
          <AlertCircle size={14} />
          {error}
        </motion.div>
      )}

      {/* Search button */}
      <motion.button
        onClick={handleSearch}
        disabled={isLoading}
        whileHover={{ scale: isLoading ? 1 : 1.02 }}
        whileTap={{ scale: isLoading ? 1 : 0.98 }}
        style={{
          marginTop: "1.25rem",
          width: "100%",
          padding: "0.95rem",
          background: isLoading
            ? "rgba(220,100,30,0.5)"
            : "linear-gradient(135deg, hsl(25,90%,55%), hsl(20,85%,45%))",
          border: "none",
          borderRadius: "12px",
          color: "white",
          fontSize: "1rem",
          fontWeight: 700,
          fontFamily: "'Sora', sans-serif",
          cursor: isLoading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          boxShadow: "0 4px 20px rgba(220,100,30,0.3)",
          transition: "box-shadow 0.2s",
          letterSpacing: "-0.01em",
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Finding Routes...
          </>
        ) : (
          <>
            <Search size={18} />
            Find Routes
          </>
        )}
      </motion.button>
    </motion.div>
  );
}
