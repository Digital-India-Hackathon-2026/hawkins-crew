"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/api";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardMetrics()
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load metrics");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: "3rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <div
          style={{
            fontSize: "1rem",
            color: "var(--text-secondary)",
          }}
        >
          Loading metrics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "3rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <div
          style={{
            padding: "2rem",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "12px",
            color: "hsl(0,70%,45%)",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  const metricCards = [
    {
      label: "Total Searches",
      value: metrics?.totalSearches || 0,
      icon: Users,
      color: "hsl(210,80%,60%)",
      bg: "rgba(60,130,220,0.1)",
      border: "rgba(60,130,220,0.2)",
    },
    {
      label: "Total Transfers",
      value: metrics?.totalTransfers || 0,
      icon: Users,
      color: "hsl(270,70%,65%)",
      bg: "rgba(130,60,220,0.1)",
      border: "rgba(130,60,220,0.2)",
    },
    {
      label: "Successful Transfers",
      value: metrics?.successfulTransfers || 0,
      icon: CheckCircle,
      color: "hsl(145,60%,45%)",
      bg: "rgba(50,180,100,0.1)",
      border: "rgba(50,180,100,0.2)",
    },
    {
      label: "Failed Transfers",
      value: metrics?.failedTransfers || 0,
      icon: XCircle,
      color: "hsl(0,70%,60%)",
      bg: "rgba(220,50,50,0.1)",
      border: "rgba(220,50,50,0.2)",
    },
    {
      label: "Success Rate",
      value: `${metrics?.successRate || 0}%`,
      icon: metrics && metrics.successRate >= 75 ? TrendingUp : TrendingDown,
      color: metrics && metrics.successRate >= 75 ? "hsl(145,60%,45%)" : "hsl(40,95%,55%)",
      bg: metrics && metrics.successRate >= 75 ? "rgba(50,180,100,0.1)" : "rgba(255,170,50,0.1)",
      border: metrics && metrics.successRate >= 75 ? "rgba(50,180,100,0.2)" : "rgba(255,170,50,0.2)",
    },
    {
      label: "Avg Waiting Time",
      value: `${metrics?.avgWaitingTime || 0} min`,
      icon: Clock,
      color: "hsl(185,70%,50%)",
      bg: "rgba(30,165,165,0.1)",
      border: "rgba(30,165,165,0.2)",
    },
  ];

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
          Dashboard
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "var(--text-secondary)",
            marginBottom: "2.5rem",
          }}
        >
          Overview of journey planning and transfer performance
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {metricCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                style={{
                  background: "var(--bg-card)",
                  border: `1px solid ${card.border}`,
                  borderRadius: "16px",
                  padding: "1.5rem",
                  transition: "all 0.2s ease",
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
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                    }}
                  >
                    {card.label}
                  </div>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: card.bg,
                      border: `1px solid ${card.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={20} color={card.color} />
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "2.25rem",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {card.value}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
