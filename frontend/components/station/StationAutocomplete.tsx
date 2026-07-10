"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, X, Loader2 } from "lucide-react";
import { Station } from "@/lib/api";
import { useStations } from "@/contexts/StationsContext";

interface StationAutocompleteProps {
  value: Station | null;
  onChange: (station: Station | null) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  disabled?: boolean;
}

export function StationAutocomplete({
  value,
  onChange,
  placeholder = "Search station...",
  label,
  id,
  disabled = false,
}: StationAutocompleteProps) {
  const { search, loading: stationsLoading } = useStations();
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<Station[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input with selected value
  useEffect(() => {
    if (value) {
      setInputValue(`${value.name} (${value.code})`);
    } else {
      setInputValue("");
    }
  }, [value]);

  // Handle clicks outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = useCallback(
    (raw: string) => {
      setInputValue(raw);
      setActiveIndex(-1);

      if (!raw.trim()) {
        onChange(null);
        setResults(search("").slice(0, 20));
        setIsOpen(true);
        return;
      }

      setIsOpen(true);

      // Debounce search
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setResults(search(raw).slice(0, 20));
      }, 150);
    },
    [onChange, search]
  );

  const handleSelect = (station: Station) => {
    onChange(station);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleClear = () => {
    onChange(null);
    setInputValue("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (!value) {
      setResults(search(inputValue).slice(0, 20));
    }
    setIsOpen(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          handleSelect(results[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLLIElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", zIndex: 200 }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            display: "block",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#111111",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "8px",
            position: "relative",
            zIndex: 200,
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: "relative" }}>
        <MapPin
          size={16}
          style={{
            position: "absolute",
            left: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            color: value ? "#111111" : "#9CA3AF",
            pointerEvents: "none",
          }}
        />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={stationsLoading ? "Loading stations..." : placeholder}
          disabled={disabled || stationsLoading}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-activedescendant={
            activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
          }
          style={{
            width: "100%",
            padding: "0.7rem 2.75rem 0.7rem 2.75rem",
            background: "#F9FAFB",
            border: `1.5px solid ${isOpen ? "#111111" : "#D1D5DB"}`,
            borderRadius: "12px",
            color: "#111111",
            fontSize: "0.95rem",
            fontFamily: "'Inter', sans-serif",
            outline: "none",
            transition: "all 0.2s ease",
            boxShadow: isOpen ? "0 0 0 1px #111111" : "none",
            cursor: disabled ? "not-allowed" : "text",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "14px",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {stationsLoading ? (
            <Loader2 size={16} style={{ color: "#9CA3AF" }} className="animate-spin" />
          ) : value ? (
            <button
              onClick={handleClear}
              aria-label="Clear station"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6B7280",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                transition: "color 0.2s ease",
              }}
            >
              <X size={16} />
            </button>
          ) : (
            <Search size={16} style={{ color: "#9CA3AF" }} />
          )}
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              zIndex: 2000,
              background: "#FFFFFF",
              border: "1px solid #ECECEC",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              maxHeight: "300px",
              overflow: "hidden",
            }}
          >
            <ul
              ref={listRef}
              id={`${id}-listbox`}
              role="listbox"
              style={{
                listStyle: "none",
                padding: "8px",
                margin: 0,
                maxHeight: "284px",
                overflowY: "auto",
              }}
            >
              {results.map((station, i) => (
                <li
                  key={station.code}
                  id={`${id}-option-${i}`}
                  role="option"
                  aria-selected={activeIndex === i}
                  onMouseDown={() => handleSelect(station)}
                  onMouseEnter={() => setActiveIndex(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background:
                      activeIndex === i
                        ? "#F9F9F9"
                        : "transparent",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "8px",
                      background:
                        activeIndex === i
                          ? "#111111"
                          : "#F3F4F6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      color:
                        activeIndex === i
                          ? "#FFFFFF"
                          : "#6B7280",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {station.code}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        color: "#111111",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {station.name}
                    </div>
                    {station.state && (
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#9CA3AF",
                          marginTop: "2px",
                        }}
                      >
                        {station.state}
                        {station.zone ? ` · ${station.zone}` : ""}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
