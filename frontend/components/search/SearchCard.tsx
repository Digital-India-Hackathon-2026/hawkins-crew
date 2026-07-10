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
        background: "#FFFFFF",
        border: "1px solid #ECECEC",
        borderRadius: "20px",
        padding: "2rem 2.5rem",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
        width: "100%",
        maxWidth: "1200px",
        margin: "0 auto",
        position: "relative",
        zIndex: 200,
      }}
    >
      {/* All inputs in one line */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap", position: "static", zIndex: 200 }}>
        <div style={{ position: "relative", flex: "1", minWidth: "200px", zIndex: 200 }}>
          <StationAutocomplete
            id="from-station"
            label="FROM"
            value={from}
            onChange={setFrom}
            placeholder="Source stat..."
          />
        </div>

        {/* Swap button */}
        <div style={{ display: "flex", alignItems: "center", paddingBottom: "2px" }}>
          <button
            onClick={handleSwap}
            aria-label="Swap source and destination"
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #ECECEC",
              borderRadius: "50%",
              width: "42px",
              height: "42px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
              color: "#111111",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = "#F9F9F9";
              (e.target as HTMLButtonElement).style.borderColor = "#D1D5DB";
              (e.target as HTMLButtonElement).style.transform = "rotate(180deg)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = "#FFFFFF";
              (e.target as HTMLButtonElement).style.borderColor = "#ECECEC";
              (e.target as HTMLButtonElement).style.transform = "rotate(0deg)";
            }}
          >
            <ArrowLeftRight size={16} />
          </button>
        </div>

        <div style={{ position: "relative", flex: "1", minWidth: "200px", zIndex: 200 }}>
          <StationAutocomplete
            id="to-station"
            label="TO"
            value={to}
            onChange={setTo}
            placeholder="Destination"
          />
        </div>

        {/* Date input */}
        <div style={{ flex: "0 0 200px", minWidth: "180px" }}>
          <label
            htmlFor="travel-date"
            style={{
              display: "block",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#6B7280",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "8px",
            }}
          >
            TRAVEL DATE
          </label>
          <div style={{ position: "relative" }}>
            <Calendar
              size={16}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9CA3AF",
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
                padding: "0.7rem 1rem 0.7rem 2.75rem",
                background: "#F9FAFB",
                border: "1.5px solid #D1D5DB",
                borderRadius: "12px",
                color: "#111111",
                fontSize: "0.95rem",
                fontFamily: "'Inter', sans-serif",
                outline: "none",
                transition: "all 0.2s ease",
              }}
            />
          </div>
        </div>

        {/* Search button */}
        <motion.button
          onClick={handleSearch}
          disabled={isLoading}
          whileHover={{ scale: isLoading ? 1 : 1.01 }}
          whileTap={{ scale: isLoading ? 1 : 0.99 }}
          style={{
            flex: "0 0 auto",
            minWidth: "160px",
            padding: "0.7rem 1.5rem",
            background: isLoading
              ? "#9CA3AF"
              : "#111111",
            border: "none",
            borderRadius: "12px",
            color: "white",
            fontSize: "1rem",
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
            transition: "all 0.2s ease",
            letterSpacing: "-0.01em",
            height: "fit-content",
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Finding Routes
            </>
          ) : (
            <>
              <Search size={18} />
              Find Routes
            </>
          )}
        </motion.button>
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
            marginTop: "1.25rem",
            padding: "12px 16px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "10px",
            fontSize: "0.88rem",
            color: "hsl(0,70%,45%)",
          }}
        >
          <AlertCircle size={15} />
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}
