"use client";

import { motion } from "framer-motion";
import { Lightbulb, Clock, Wrench, TrendingUp, MapPin, AlertCircle } from "lucide-react";

const mockRecommendations = [
  {
    id: "1",
    type: "timing" as const,
    priority: "high" as const,
    title: "Adjust departure time for Train 12345 at NDLS",
    description:
      "Shifting departure by 5 minutes would improve 8 critical connections and reduce average waiting time from 45min to 28min.",
    estimatedImpact: "+12% success rate",
    affectedTrains: ["12345", "12346"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    type: "platform" as const,
    priority: "medium" as const,
    title: "Optimize platform allocation at CSMT",
    description:
      "Assigning adjacent platforms for high-frequency transfer pairs would reduce transfer time by 3 minutes on average.",
    estimatedImpact: "+8% success rate",
    affectedTrains: ["12347", "12348", "12349"],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "3",
    type: "timing" as const,
    priority: "high" as const,
    title: "Increase buffer time for Train 17234 at BCT",
    description:
      "Current 15-minute window is insufficient for 67% of passengers. Recommend increasing to 25 minutes.",
    estimatedImpact: "+15% success rate",
    affectedTrains: ["17234"],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "4",
    type: "route" as const,
    priority: "medium" as const,
    title: "Add alternative connection at PUNE",
    description:
      "High demand for PUNE-NDLS transfers. Consider adding an intermediate express service to reduce waiting time.",
    estimatedImpact: "+10% success rate",
    affectedTrains: ["12128", "12130"],
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: "5",
    type: "frequency" as const,
    priority: "low" as const,
    title: "Increase frequency on NDLS-AGC route",
    description:
      "Current 4-hour gap creates scheduling conflicts. Adding a mid-day service would improve connection options.",
    estimatedImpact: "+6% success rate",
    affectedTrains: ["12002", "12004"],
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
];

const typeIcons: Record<string, any> = {
  timing: Clock,
  platform: MapPin,
  frequency: TrendingUp,
  route: Wrench,
};

const typeColors: Record<string, { color: string; bg: string; border: string }> = {
  timing: {
    color: "hsl(25,90%,55%)",
    bg: "rgba(220,100,30,0.1)",
    border: "rgba(220,100,30,0.2)",
  },
  platform: {
    color: "hsl(210,80%,60%)",
    bg: "rgba(60,130,220,0.1)",
    border: "rgba(60,130,220,0.2)",
  },
  frequency: {
    color: "hsl(270,70%,65%)",
    bg: "rgba(130,60,220,0.1)",
    border: "rgba(130,60,220,0.2)",
  },
  route: {
    color: "hsl(185,70%,50%)",
    bg: "rgba(30,165,165,0.1)",
    border: "rgba(30,165,165,0.2)",
  },
};

const priorityColors: Record<string, { color: string; bg: string; border: string }> = {
  high: {
    color: "hsl(0,70%,60%)",
    bg: "rgba(220,50,50,0.1)",
    border: "rgba(220,50,50,0.2)",
  },
  medium: {
    color: "hsl(40,95%,55%)",
    bg: "rgba(255,170,50,0.1)",
    border: "rgba(255,170,50,0.2)",
  },
  low: {
    color: "hsl(145,60%,45%)",
    bg: "rgba(50,180,100,0.1)",
    border: "rgba(50,180,100,0.2)",
  },
};

export default function RecommendationsPage() {
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
          Recommendations
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "var(--text-secondary)",
            marginBottom: "2.5rem",
          }}
        >
          System-generated optimization recommendations based on transfer analytics
        </p>

        {/* Info Banner
        <div
          style={{
            display: "flex",
            alignItems: "start",
            gap: "12px",
            padding: "1rem 1.25rem",
            background: "rgba(60,130,220,0.08)",
            border: "1px solid rgba(60,130,220,0.15)",
            borderRadius: "12px",
            marginBottom: "2rem",
          }}
        >
          <AlertCircle size={20} color="hsl(210,80%,60%)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <div
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "4px",
              }}
            >
              Mock Data
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              These recommendations are generated from mock optimizer results. In production, they would be
              derived from actual CP-SAT optimization runs.
            </div>
          </div>
        </div> */}

        {/* Recommendations List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {mockRecommendations.map((rec, i) => {
            const TypeIcon = typeIcons[rec.type];
            const typeStyle = typeColors[rec.type];
            const priorityStyle = priorityColors[rec.priority];

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "start",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "start", gap: "12px", flex: 1 }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        background: typeStyle.bg,
                        border: `1px solid ${typeStyle.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <TypeIcon size={20} color={typeStyle.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          marginBottom: "0.5rem",
                          lineHeight: 1.4,
                        }}
                      >
                        {rec.title}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "100px",
                            background: typeStyle.bg,
                            border: `1px solid ${typeStyle.border}`,
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            color: typeStyle.color,
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {rec.type}
                        </span>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "100px",
                            background: priorityStyle.bg,
                            border: `1px solid ${priorityStyle.border}`,
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            color: priorityStyle.color,
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {rec.priority} priority
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "8px 14px",
                      borderRadius: "10px",
                      background: "rgba(50,180,100,0.1)",
                      border: "1px solid rgba(50,180,100,0.2)",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "hsl(145,60%,45%)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {rec.estimatedImpact}
                  </div>
                </div>

                {/* Description */}
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    marginBottom: "1rem",
                  }}
                >
                  {rec.description}
                </p>

                {/* Footer */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--glass-border)",
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <div>
                    Affected trains:{" "}
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                      {rec.affectedTrains.join(", ")}
                    </span>
                  </div>
                  <div>
                    {new Date(rec.createdAt).toLocaleString("en-IN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
