"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Train, Menu, X, ChevronDown, Wrench } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Railway Utilities", href: "/utilities" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 150,
          transition: "all 0.25s ease",
          background: scrolled
            ? "rgba(255, 255, 255, 0.92)"
            : "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: scrolled
            ? "1px solid #ECECEC"
            : "1px solid transparent",
        }}
      >
        <div className="container" style={{ padding: "0 1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: "64px",
            }}
          >
            {/* Logo */}
            <Link
              href="/"
              style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "#111111",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                }}
              >
                <Train size={20} color="white" />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 800,
                    fontSize: "1.25rem",
                    color: "#111111",
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                  }}
                >
                  Prayan
                </div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: "#6B7280",
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginTop: "2px",
                  }}
                >
                  Railway
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              className="desktop-nav"
            >
              {navLinks.map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "10px 18px",
                      borderRadius: "10px",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "all 0.2s ease",
                      color: active ? "#111111" : "#374151",
                      background: active
                        ? "#F3F4F6"
                        : "transparent",
                      border: active
                        ? "1px solid #E5E7EB"
                        : "1px solid transparent",
                    }}
                  >
                    {link.href === "/utilities" && <Wrench size={15} />}
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="mobile-menu-btn"
              aria-label="Toggle menu"
              style={{
                background: "#FFFFFF",
                border: "1.5px solid #ECECEC",
                borderRadius: "10px",
                padding: "8px",
                cursor: "pointer",
                color: "#111111",
                display: "none",
              }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              top: "64px",
              left: 0,
              right: 0,
              zIndex: 140,
              background: "rgba(255, 255, 255, 0.97)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid #ECECEC",
              padding: "1rem 1.5rem",
            }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  color:
                    pathname === link.href
                      ? "#111111"
                      : "#374151",
                  marginBottom: "4px",
                  background:
                    pathname === link.href
                      ? "#F3F4F6"
                      : "transparent",
                  border: pathname === link.href
                      ? "1px solid #E5E7EB"
                      : "1px solid transparent",
                }}
              >
                {link.href === "/utilities" && <Wrench size={18} />}
                {link.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media (max-width: 640px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
