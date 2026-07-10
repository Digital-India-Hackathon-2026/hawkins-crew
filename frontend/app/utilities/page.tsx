"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CreditCard,
  Train,
  Radio,
  Search,
  Users,
  Building2,
  DollarSign,
  History,
  ArrowRight,
  Zap,
} from "lucide-react";

const utilities = [
  {
    id: "pnr",
    icon: CreditCard,
    title: "PNR Status",
    description: "Check booking status, passenger details, and journey information for a PNR number.",
    href: "/utilities/pnr",
    color: "hsl(145,60%,45%)",
    bg: "rgba(50,180,100,0.1)",
    border: "rgba(50,180,100,0.2)",
    badge: "Live",
    badgeColor: "hsl(145,60%,50%)",
  },
  {
    id: "train",
    icon: Train,
    title: "Train Information",
    description: "Get complete train details including route, all stops, timings, and class availability.",
    href: "/utilities/train",
    color: "hsl(25,90%,60%)",
    bg: "rgba(220,100,30,0.1)",
    border: "rgba(220,100,30,0.2)",
    badge: "Local Data",
    badgeColor: "hsl(25,90%,60%)",
  },
  {
    id: "live",
    icon: Radio,
    title: "Live Train Tracking",
    description: "Track real-time train position, delays, last passed station, and upcoming stops.",
    href: "/utilities/live",
    color: "hsl(0,70%,60%)",
    bg: "rgba(220,50,50,0.1)",
    border: "rgba(220,50,50,0.2)",
    badge: "Live",
    badgeColor: "hsl(0,70%,60%)",
  },
  {
    id: "search",
    icon: Search,
    title: "Train Search",
    description: "Find trains running between any two stations with departure times and availability.",
    href: "/utilities/search",
    color: "hsl(210,80%,60%)",
    bg: "rgba(60,130,220,0.1)",
    border: "rgba(60,130,220,0.2)",
    badge: "Local Data",
    badgeColor: "hsl(210,80%,60%)",
  },
  {
    id: "availability",
    icon: Users,
    title: "Seat Availability",
    description: "Check seat availability, class-wise quota, and fare information for any train.",
    href: "/utilities/availability",
    color: "hsl(270,70%,65%)",
    bg: "rgba(130,60,220,0.1)",
    border: "rgba(130,60,220,0.2)",
    badge: "Estimated",
    badgeColor: "hsl(270,70%,65%)",
  },
  {
    id: "station",
    icon: Building2,
    title: "Station Board",
    description: "View all arrivals and departures at any station, just like the station display board.",
    href: "/utilities/station",
    color: "hsl(185,70%,50%)",
    bg: "rgba(30,165,165,0.1)",
    border: "rgba(30,165,165,0.2)",
    badge: "Local Data",
    badgeColor: "hsl(185,70%,50%)",
  },
  {
    id: "fare",
    icon: DollarSign,
    title: "Fare Lookup",
    description: "Calculate estimated ticket fares for any class between stations on a specific train.",
    href: "/utilities/fare",
    color: "hsl(40,95%,55%)",
    bg: "rgba(255,170,50,0.1)",
    border: "rgba(255,170,50,0.2)",
    badge: "Estimated",
    badgeColor: "hsl(40,95%,55%)",
  },
  {
    id: "history",
    icon: History,
    title: "Train History",
    description: "View historical journey records and on-time performance for any train.",
    href: "/utilities/history",
    color: "hsl(320,70%,60%)",
    bg: "rgba(200,50,150,0.1)",
    border: "rgba(200,50,150,0.2)",
    badge: "Coming Soon",
    badgeColor: "hsl(320,70%,60%)",
  },
];

export default function UtilitiesPage() {
  return (
    <div style={{ paddingTop: "64px", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          padding: "3.5rem 0 2.5rem",
          borderBottom: "1px solid var(--glass-border)",
          background:
            "linear-gradient(to bottom, rgba(220,100,30,0.04), transparent)",
        }}
      >
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 14px",
                borderRadius: "100px",
                background: "rgba(220,100,30,0.12)",
                border: "1px solid rgba(220,100,30,0.2)",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "hsl(25,90%,65%)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              <Zap size={11} />
              Railway Utilities
            </div>
            <h1
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                marginBottom: "0.75rem",
              }}
            >
              Railway Tools & Services
            </h1>
            <p
              style={{
                fontSize: "1rem",
                color: "var(--text-secondary)",
                maxWidth: "500px",
                lineHeight: 1.6,
              }}
            >
              All the railway information you need in one place. From PNR status
              to live tracking, station boards to fare calculators.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Utilities Grid */}
      <div className="container" style={{ padding: "2.5rem 1.5rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {utilities.map((util, i) => {
            const Icon = util.icon;
            return (
              <motion.div
                key={util.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <Link
                  href={util.href}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div
                    style={{
                      background: "var(--bg-card)",
                      border: `1px solid ${util.border}`,
                      borderRadius: "16px",
                      padding: "1.5rem",
                      height: "100%",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      el.style.background = "var(--bg-card-hover)";
                      el.style.transform = "translateY(-3px)";
                      el.style.boxShadow = `0 12px 32px rgba(0,0,0,0.3), 0 0 0 1px ${util.border}`;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget;
                      el.style.background = "var(--bg-card)";
                      el.style.transform = "translateY(0)";
                      el.style.boxShadow = "none";
                    }}
                  >
                    {/* Icon + badge row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: "1rem",
                      }}
                    >
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "12px",
                          background: util.bg,
                          border: `1px solid ${util.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={22} color={util.color} />
                      </div>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "100px",
                          background: util.bg,
                          border: `1px solid ${util.border}`,
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          color: util.badgeColor,
                          letterSpacing: "0.03em",
                        }}
                      >
                        {util.badge}
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        fontFamily: "'Sora', sans-serif",
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        marginBottom: "6px",
                      }}
                    >
                      {util.title}
                    </h3>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.6,
                        marginBottom: "1rem",
                      }}
                    >
                      {util.description}
                    </p>

                    {/* CTA */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: util.color,
                      }}
                    >
                      Open Tool
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
