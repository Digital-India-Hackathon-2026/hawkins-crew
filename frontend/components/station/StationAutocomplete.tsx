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
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {label && (
        <label
          htmlFor={id}
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
          {label}
        </label>
      )}

      <div style={{ position: "relative" }}>
        <MapPin
          size={16}
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: value ? "hsl(25,90%,60%)" : "var(--text-muted)",
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
            padding: "0.85rem 2.5rem 0.85rem 2.5rem",
            background: "rgba(255,255,255,0.05)",
            border: `1.5px solid ${isOpen ? "hsl(25,90%,55%)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "12px",
            color: "var(--text-primary)",
            fontSize: "0.95rem",
            fontFamily: "'Inter', sans-serif",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxShadow: isOpen ? "0 0 0 3px rgba(220,100,30,0.15)" : "none",
            cursor: disabled ? "not-allowed" : "text",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {stationsLoading ? (
            <Loader2 size={16} style={{ color: "var(--text-muted)" }} className="animate-spin" />
          ) : value ? (
            <button
              onClick={handleClear}
              aria-label="Clear station"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={16} />
            </button>
          ) : (
            <Search size={16} style={{ color: "var(--text-muted)" }} />
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
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              zIndex: 200,
              background: "hsl(222, 22%, 11%)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              maxHeight: "280px",
              overflow: "hidden",
            }}
          >
            <ul
              ref={listRef}
              id={`${id}-listbox`}
              role="listbox"
              style={{
                listStyle: "none",
                padding: "6px",
                margin: 0,
                maxHeight: "268px",
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
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background:
                      activeIndex === i
                        ? "rgba(220,100,30,0.12)"
                        : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "8px",
                      background:
                        activeIndex === i
                          ? "rgba(220,100,30,0.2)"
                          : "rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      color:
                        activeIndex === i
                          ? "hsl(25,90%,62%)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {station.code}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        color: "var(--text-primary)",
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
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
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
