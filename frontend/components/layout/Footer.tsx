"use client";

import Link from "next/link";
import { Train, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--glass-border)",
        background: "var(--bg-secondary)",
        padding: "2.5rem 0",
        marginTop: "4rem",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background:
                  "linear-gradient(135deg, hsl(25,90%,55%), hsl(20,85%,45%))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Train size={16} color="white" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 800,
                  fontSize: "1rem",
                  color: "white",
                }}
              >
                Prayan
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Intelligent Railway Journey Planner
              </div>
            </div>
          </div>

          {/* Links */}
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Home", href: "/" },
              { label: "Railway Utilities", href: "/utilities" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  fontSize: "0.88rem",
                  transition: "color 0.2s",
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Attribution */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.82rem",
              color: "var(--text-muted)",
            }}
          >
            <span>Made with</span>
            <Heart size={13} color="hsl(0,70%,60%)" fill="hsl(0,70%,60%)" />
            <span>by</span>
            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
              Hawkins Crew
            </span>
            <span>· Digital India Hackathon 2026</span>
          </div>
        </div>

        <div
          style={{
            marginTop: "1.5rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--glass-border)",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          Prayan uses a time-expanded graph engine to find optimal multi-train
          journeys. Data from Indian Railways public schedules. Not affiliated
          with Indian Railways or IRCTC.
        </div>
      </div>
    </footer>
  );
}
