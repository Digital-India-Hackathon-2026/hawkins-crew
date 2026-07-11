import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { StationsProvider } from "@/contexts/StationsContext";

export const metadata: Metadata = {
  title: "railfix. — Intelligent Railway Journey Planner",
  description:
    "Plan multi-train railway journeys across India's vast rail network. Find optimal routes, transfers, and timings with railfix.'s intelligent journey planning engine.",
  keywords: [
    "Indian Railways",
    "train journey planner",
    "multi-train routes",
    "railway booking",
    "IRCTC",
    "railfix.",
  ],
  openGraph: {
    title: "railfix. — Intelligent Railway Journey Planner",
    description:
      "Discover optimal multi-train routes across Indian Railways with intelligent transfer recommendations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <StationsProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </StationsProvider>
      </body>
    </html>
  );
}
