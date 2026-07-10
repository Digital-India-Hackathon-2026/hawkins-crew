"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  GitMerge,
  Building2,
  Settings2,
  Lightbulb
} from "lucide-react";

const adminNavLinks = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    description: "Key metrics and overview"
  },
  {
    label: "Transfer Analytics",
    href: "/admin/transfer-analytics",
    icon: GitMerge,
    description: "Transfer success rates and patterns"
  },
  {
    label: "Station Details",
    href: "/admin/station",
    icon: Building2,
    description: "Per-station performance"
  },
  {
    label: "Timetable Optimizer",
    href: "/admin/optimizer",
    icon: Settings2,
    description: "Optimize train schedules"
  },
  {
    label: "Recommendations",
    href: "/admin/recommendations",
    icon: Lightbulb,
    description: "System recommendations"
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", minHeight: "100vh", paddingTop: "64px" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "280px",
          borderRight: "1px solid var(--glass-border)",
          background: "var(--bg-secondary)",
          padding: "2rem 1rem",
          position: "fixed",
          height: "calc(100vh - 64px)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "2rem", paddingLeft: "0.75rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 14px",
              borderRadius: "100px",
              background: "rgba(220,100,30,0.12)",
              border: "1px solid rgba(220,100,30,0.2)",
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "hsl(25,90%,55%)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}
          >
            Government
          </div>
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              marginBottom: "0.25rem",
            }}
          >
            Admin Dashboard
          </h2>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            Railway operations & optimization
          </p>
        </div>

        {/* Navigation */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {adminNavLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href ||
              (link.href !== "/admin/dashboard" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  background: isActive ? "var(--bg-card)" : "transparent",
                  border: isActive ? "1px solid var(--glass-border)" : "1px solid transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                <Icon size={18} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: isActive ? 600 : 500,
                      marginBottom: "2px",
                    }}
                  >
                    {link.label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      lineHeight: 1.3,
                    }}
                  >
                    {link.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          marginLeft: "280px",
          background: "var(--bg-primary)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
