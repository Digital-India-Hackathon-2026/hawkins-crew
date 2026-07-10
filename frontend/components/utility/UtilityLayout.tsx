"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Info } from "lucide-react";

interface UtilityLayoutProps {
  title: string;
  icon: ReactNode;
  iconBg: string;
  description: string;
  children: ReactNode;
}

export function UtilityLayout({
  title,
  icon,
  iconBg,
  description,
  children,
}: UtilityLayoutProps) {
  return (
    <div style={{ paddingTop: "64px", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          padding: "2.5rem 0 2rem",
          borderBottom: "1px solid var(--glass-border)",
          background:
            "linear-gradient(to bottom, rgba(220,100,30,0.03), transparent)",
        }}
      >
        <div className="container">
          <Link
            href="/utilities"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              textDecoration: "none",
              marginBottom: "1.25rem",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "white")}
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.color = "var(--text-muted)")
            }
          >
            <ArrowLeft size={14} />
            Railway Utilities
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", alignItems: "center", gap: "14px" }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            <div>
              <h1
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {title}
              </h1>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginTop: "2px" }}>
                {description}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ padding: "2rem 1.5rem" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

export function LiveApiNotice({ feature }: { feature: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "1rem 1.25rem",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "10px",
      }}
    >
      <Info size={18} color="hsl(210,80%,60%)" style={{ flexShrink: 0, marginTop: "2px" }} />
      <div>
        <div
          style={{
            fontWeight: 600,
            fontSize: "0.9rem",
            color: "var(--text-primary)",
            marginBottom: "4px",
          }}
        >
          {feature} requires live railway API
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          This feature uses real-time data from Indian Railways' NTES system.
          Live API access is not configured in this deployment. To enable it,
          install and configure the{" "}
          <code
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: "rgba(255,255,255,0.08)",
              padding: "1px 6px",
              borderRadius: "4px",
              fontSize: "0.8rem",
            }}
          >
            ntes-client
          </code>{" "}
          package in the Flask backend.
        </p>
      </div>
    </div>
  );
}

export function SkeletonRow({ width = "100%" }: { width?: string }) {
  return (
    <div
      className="skeleton"
      style={{ height: "14px", width, borderRadius: "4px", marginBottom: "8px" }}
    />
  );
}

export function ResultCard({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--glass-border)",
        borderRadius: "14px",
        padding: "1.25rem",
        marginTop: "1.5rem",
      }}
    >
      {children}
    </div>
  );
}
