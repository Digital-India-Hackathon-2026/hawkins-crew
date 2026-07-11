"use client";

import { useState, useRef, useEffect } from "react";
import { X, Plus, MapPin } from "lucide-react";
import { useStations } from "@/contexts/StationsContext";
import Fuse from "fuse.js";

interface ViaStationSelectorProps {
  viaStations: string[];
  onViaStationsChange: (stations: string[]) => void;
  excludedStations?: string[]; // Source and destination to exclude
}

export function ViaStationSelector({
  viaStations,
  onViaStationsChange,
  excludedStations = [],
}: ViaStationSelectorProps) {
  const { stations } = useStations();
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof stations>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize Fuse.js for fuzzy search
  const fuse = useRef(
    new Fuse(stations, {
      keys: ["code", "name"],
      threshold: 0.3,
      includeScore: true,
    })
  );

  useEffect(() => {
    fuse.current = new Fuse(stations, {
      keys: ["code", "name"],
      threshold: 0.3,
      includeScore: true,
    });
  }, [stations]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const results = fuse.current.search(searchQuery).map((r) => r.item);
      // Filter out already selected and excluded stations
      const filtered = results.filter(
        (s) => !viaStations.includes(s.code) && !excludedStations.includes(s.code)
      );
      setSearchResults(filtered.slice(0, 8));
      setHighlightedIndex(0);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, viaStations, excludedStations]);

  const handleAddClick = () => {
    setIsAdding(true);
    setSearchQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleRemoveStation = (code: string) => {
    onViaStationsChange(viaStations.filter((s) => s !== code));
  };

  const handleSelectStation = (code: string) => {
    if (!viaStations.includes(code)) {
      onViaStationsChange([...viaStations, code]);
    }
    setIsAdding(false);
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && searchResults.length > 0) {
      e.preventDefault();
      handleSelectStation(searchResults[highlightedIndex].code);
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setSearchQuery("");
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsAdding(false);
        setSearchQuery("");
      }
    }, 200);
  };

  const getStationName = (code: string) => {
    const station = stations.find((s) => s.code === code);
    return station?.name || code;
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      {/* Label */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "#374151",
          marginBottom: "8px",
        }}
      >
        <MapPin size={16} />
        Via Station (Optional)
      </label>

      {/* Selected via stations */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
        {viaStations.map((code) => (
          <div
            key={code}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              background: "#EEF2FF",
              border: "1px solid #C7D2FE",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#4338CA",
            }}
          >
            <span>
              {getStationName(code)} ({code})
            </span>
            <button
              onClick={() => handleRemoveStation(code)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                color: "#6366F1",
              }}
              aria-label={`Remove ${code}`}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Add button */}
        {!isAdding && (
          <button
            onClick={handleAddClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "#F9FAFB",
              border: "1px dashed #D1D5DB",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#6B7280",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#F3F4F6";
              e.currentTarget.style.borderColor = "#9CA3AF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#F9FAFB";
              e.currentTarget.style.borderColor = "#D1D5DB";
            }}
          >
            <Plus size={14} />
            Add Via Station
          </button>
        )}
      </div>

      {/* Search input (when adding) */}
      {isAdding && (
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Search station code or name..."
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: "0.875rem",
              border: "2px solid #6366F1",
              borderRadius: "8px",
              outline: "none",
            }}
          />

          {/* Dropdown results */}
          {searchResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: "4px",
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                maxHeight: "240px",
                overflowY: "auto",
                zIndex: 1000,
              }}
            >
              {searchResults.map((station, idx) => (
                <button
                  key={station.code}
                  onClick={() => handleSelectStation(station.code)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    textAlign: "left",
                    background: highlightedIndex === idx ? "#F3F4F6" : "#FFFFFF",
                    border: "none",
                    borderBottom: idx < searchResults.length - 1 ? "1px solid #F3F4F6" : "none",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111111" }}>
                    {station.code}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: "2px" }}>
                    {station.name}
                    {station.state && ` • ${station.state}`}
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: "4px",
                padding: "12px",
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                fontSize: "0.875rem",
                color: "#6B7280",
                textAlign: "center",
              }}
            >
              No stations found
            </div>
          )}
        </div>
      )}

      {/* Helper text */}
      {viaStations.length === 0 && !isAdding && (
        <p style={{ fontSize: "0.75rem", color: "#9CA3AF", marginTop: "4px" }}>
          Add stations to force the route to pass through specific locations
        </p>
      )}
    </div>
  );
}
