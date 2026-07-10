"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L, { LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Route, Station } from "@/lib/api";
import { normalizeAllRoutes, findSharedStations } from "@/lib/map/normalizeRoute";
import { getRouteColor, TRAIN_COLORS } from "@/lib/map/routeColors";
import { RouteLayer } from "./RouteLayer";
import { RouteLegend } from "./RouteLegend";
import { RouteControls } from "./RouteControls";
import { RouteSummary } from "./RouteSummary";
import { RouteSelector } from "./RouteSelector";
import { AlertCircle, Map as MapIcon } from "lucide-react";

interface MultiRouteMapProps {
  routes: Route[];
  stations: Station[];
  selectedRouteIndex: number;
  onRouteSelect: (index: number) => void;
  className?: string;
}

// Component to handle map bounds fitting
function MapBoundsFitter({ bounds, shouldFit }: { bounds: LatLngBounds | null; shouldFit: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (bounds && shouldFit) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10, animate: true });
    }
  }, [bounds, shouldFit, map]);

  return null;
}

export function MultiRouteMap({
  routes,
  stations,
  selectedRouteIndex,
  onRouteSelect,
  className,
}: MultiRouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [visibleRoutes, setVisibleRoutes] = useState<Set<number>>(
    () => new Set(routes.map((_, idx) => idx))
  );
  const [shouldFitBounds, setShouldFitBounds] = useState(true);
  const [focusedStation, setFocusedStation] = useState<string | null>(null);

  // Prepare route colors
  const routeColors = useMemo(() => {
    return routes.map((_, idx) => getRouteColor(idx));
  }, [routes]);

  // Normalize all routes
  const normalizedRoutes = useMemo(() => {
    return normalizeAllRoutes(routes, stations, routeColors, TRAIN_COLORS);
  }, [routes, stations, routeColors]);

  // Find shared stations
  const sharedStations = useMemo(() => {
    return findSharedStations(normalizedRoutes);
  }, [normalizedRoutes]);

  const sharedStationCodes = useMemo(() => {
    return new Set(sharedStations.map(s => s.code));
  }, [sharedStations]);

  // Calculate bounds - use selected route if fitting, otherwise all visible routes
  const bounds = useMemo(() => {
    // If fitting bounds, use only the selected route
    const routesToFit = shouldFitBounds
      ? [normalizedRoutes[selectedRouteIndex]].filter(Boolean)
      : normalizedRoutes.filter(r => visibleRoutes.has(r.routeIndex));

    if (routesToFit.length === 0) return null;

    const allCoords = routesToFit.flatMap(r => r.stations);
    if (allCoords.length === 0) return null;

    const lats = allCoords.map(s => s.latitude);
    const lngs = allCoords.map(s => s.longitude);

    return new LatLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
  }, [normalizedRoutes, visibleRoutes, shouldFitBounds, selectedRouteIndex]);

  // Calculate bounds for selected route only
  const selectedRouteBounds = useMemo(() => {
    const selectedRoute = normalizedRoutes[selectedRouteIndex];
    if (!selectedRoute || selectedRoute.stations.length === 0) return null;

    const lats = selectedRoute.stations.map(s => s.latitude);
    const lngs = selectedRoute.stations.map(s => s.longitude);

    return new LatLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
  }, [normalizedRoutes, selectedRouteIndex]);

  // Prepare legend data
  const legendRoutes = useMemo(() => {
    return routes.map((route, idx) => ({
      label: idx === 0 ? "Best Route" : `Route ${idx + 1}`,
      color: routeColors[idx],
    }));
  }, [routes, routeColors]);

  // Prepare train colors for legend
  const trainColorsForLegend = useMemo(() => {
    const selectedRoute = normalizedRoutes[selectedRouteIndex];
    if (!selectedRoute) return [];
    return selectedRoute.trainSegments.map(seg => ({
      trainNumber: seg.trainNumber,
      color: seg.color,
    }));
  }, [normalizedRoutes, selectedRouteIndex]);

  // Handlers
  const handleToggleRoute = useCallback((routeIndex: number) => {
    setVisibleRoutes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(routeIndex)) {
        newSet.delete(routeIndex);
      } else {
        newSet.add(routeIndex);
      }
      return newSet;
    });
    setShouldFitBounds(true);
  }, []);

  const handleFocusBest = useCallback(() => {
    onRouteSelect(0);
    setVisibleRoutes(new Set([0]));
    setShouldFitBounds(true);
  }, [onRouteSelect]);

  const handleShowAll = useCallback(() => {
    setVisibleRoutes(new Set(routes.map((_, idx) => idx)));
    setShouldFitBounds(true);
  }, [routes]);

  const handleFitMap = useCallback(() => {
    setShouldFitBounds(true);
  }, []);

  const handleReset = useCallback(() => {
    onRouteSelect(0);
    setVisibleRoutes(new Set(routes.map((_, idx) => idx)));
    setShouldFitBounds(true);
    setFocusedStation(null);
  }, [routes, onRouteSelect]);

  const handleRouteClick = useCallback((routeIndex: number) => {
    onRouteSelect(routeIndex);
    if (!visibleRoutes.has(routeIndex)) {
      setVisibleRoutes(prev => new Set([...prev, routeIndex]));
    }
    // Fit bounds to selected route when clicking from map
    setShouldFitBounds(true);
  }, [onRouteSelect, visibleRoutes]);

  const handleRouteSelect = useCallback((routeIndex: number) => {
    onRouteSelect(routeIndex);
    // Ensure selected route is visible
    if (!visibleRoutes.has(routeIndex)) {
      setVisibleRoutes(prev => new Set([...prev, routeIndex]));
    }
    // Fit bounds to show selected route when selecting from selector
    setShouldFitBounds(true);
  }, [onRouteSelect, visibleRoutes]);

  const handleStationClick = useCallback((stationCode: string) => {
    setFocusedStation(stationCode);
    // Zoom to station
    const station = normalizedRoutes[selectedRouteIndex]?.stations.find(
      s => s.code === stationCode
    );
    if (station && mapRef.current) {
      mapRef.current.setView([station.latitude, station.longitude], 12, { animate: true });
      setShouldFitBounds(false);
    }
  }, [normalizedRoutes, selectedRouteIndex]);

  // Empty state
  if (normalizedRoutes.length === 0 || normalizedRoutes.every(r => r.stations.length === 0)) {
    return (
      <div
        className={className}
        style={{
          minHeight: "600px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAFA",
          borderRadius: "12px",
          border: "1px solid #E5E7EB",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center", color: "#6B7280" }}>
          <AlertCircle size={32} style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>
            Unable to display map: No station coordinates available
          </p>
        </div>
      </div>
    );
  }

  const defaultCenter = normalizedRoutes[0].stations[0]
    ? [normalizedRoutes[0].stations[0].latitude, normalizedRoutes[0].stations[0].longitude]
    : [20.5937, 78.9629];

  const selectedRoute = normalizedRoutes[selectedRouteIndex];

  return (
    <div className={className}>
      {/* Warning for missing coordinates */}
      {normalizedRoutes.some(r => r.missingStations.length > 0) && (
        <div
          style={{
            marginBottom: "12px",
            padding: "10px 14px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "8px",
            fontSize: "0.8rem",
            color: "hsl(0,70%,45%)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={14} />
          <span>
            Some stations could not be plotted due to missing coordinates
          </span>
        </div>
      )}

      {/* Desktop Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: "16px",
        }}
        className="desktop-layout"
      >
        {/* Map Container */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              height: "600px",
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid #E5E7EB",
              position: "relative",
            }}
          >
            <MapContainer
              center={defaultCenter as [number, number]}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
              ref={mapRef}
              scrollWheelZoom={true}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Fit bounds */}
              <MapBoundsFitter bounds={bounds} shouldFit={shouldFitBounds} />

              {/* Render all visible routes */}
              {normalizedRoutes
                .filter(route => visibleRoutes.has(route.routeIndex))
                .map(route => (
                  <RouteLayer
                    key={route.routeIndex}
                    route={route}
                    selectedRouteIndex={selectedRouteIndex}
                    sharedStationCodes={sharedStationCodes}
                    onRouteClick={() => handleRouteClick(route.routeIndex)}
                    onStationClick={handleStationClick}
                  />
                ))}
            </MapContainer>

            {/* Best Route Badge */}
            {visibleRoutes.has(0) && selectedRouteIndex === 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "16px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 1000,
                  padding: "10px 16px",
                  background: "rgba(255, 255, 255, 0.98)",
                  border: "2px solid hsl(40, 95%, 55%)",
                  borderRadius: "100px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#111111",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>⭐</span>
                Best Recommended Route
              </div>
            )}

            {/* Controls - Top Right */}
            <div
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                zIndex: 1000,
              }}
            >
              <RouteControls
                routes={legendRoutes}
                visibleRoutes={visibleRoutes}
                onToggleRoute={handleToggleRoute}
                onFocusBest={handleFocusBest}
                onShowAll={handleShowAll}
                onFitMap={handleFitMap}
                onReset={handleReset}
              />
            </div>

            {/* Legend - Bottom Left */}
            <div
              style={{
                position: "absolute",
                bottom: "16px",
                left: "16px",
                zIndex: 1000,
              }}
            >
              <RouteLegend
                routeColors={legendRoutes}
                showTrainColors={true}
                trainColors={trainColorsForLegend}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Route Selector */}
          <RouteSelector
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRoute={handleRouteSelect}
          />

          {/* Route Summary */}
          {selectedRoute && (
            <RouteSummary route={selectedRoute} isBest={selectedRouteIndex === 0} />
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <style jsx>{`
        @media (max-width: 1024px) {
          .desktop-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
