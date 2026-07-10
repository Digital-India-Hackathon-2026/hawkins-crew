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
          zIndex: 100,
          transition: "all 0.3s ease",
          background: scrolled
            ? "rgba(10, 14, 26, 0.92)"
            : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled
            ? "1px solid rgba(255,255,255,0.08)"
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
              style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, hsl(25,90%,55%), hsl(20,85%,45%))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(220,100,30,0.3)",
                }}
              >
                <Train size={20} color="white" />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    fontWeight: 800,
                    fontSize: "1.2rem",
                    color: "white",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  Prayan
                </div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "hsl(25,90%,60%)",
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Railway Planner
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
                      padding: "8px 16px",
                      borderRadius: "10px",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      textDecoration: "none",
                      transition: "all 0.2s ease",
                      color: active ? "hsl(25,90%,62%)" : "rgba(255,255,255,0.75)",
                      background: active
                        ? "rgba(220,100,30,0.12)"
                        : "transparent",
                      border: active
                        ? "1px solid rgba(220,100,30,0.2)"
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
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "8px",
                cursor: "pointer",
                color: "white",
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
              zIndex: 99,
              background: "rgba(10, 14, 26, 0.97)",
              backdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
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
                  fontWeight: 500,
                  textDecoration: "none",
                  color:
                    pathname === link.href
                      ? "hsl(25,90%,62%)"
                      : "rgba(255,255,255,0.85)",
                  marginBottom: "4px",
                  background:
                    pathname === link.href
                      ? "rgba(220,100,30,0.1)"
                      : "transparent",
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
