"use client";

import { useMemo, useState } from "react";
import { Tooltip, Pane } from "react-leaflet";
import type { NormalizedRoute } from "@/lib/map/normalizeRoute";
import { RailwayPolyline } from "./RailwayPolyline";
import { StationMarker } from "./StationMarker";
import {
  getRouteOpacity,
  getRouteWeight,
  getRouteZIndex,
} from "@/lib/map/routeColors";
import { formatDuration } from "@/lib/api";

interface RouteLayerProps {
  route: NormalizedRoute;
  selectedRouteIndex: number;
  sharedStationCodes: Set<string>;
  onRouteClick: () => void;
  onStationClick?: (stationCode: string) => void;
}

export function RouteLayer({
  route,
  selectedRouteIndex,
  sharedStationCodes,
  onRouteClick,
  onStationClick,
}: RouteLayerProps) {
  const [isHovered, setIsHovered] = useState(false);

  const opacity = useMemo(
    () => getRouteOpacity(route.routeIndex, selectedRouteIndex, isHovered),
    [route.routeIndex, selectedRouteIndex, isHovered]
  );

  const weight = useMemo(
    () => getRouteWeight(route.routeIndex, selectedRouteIndex, isHovered),
    [route.routeIndex, selectedRouteIndex, isHovered]
  );

  const zIndex = useMemo(
    () => getRouteZIndex(route.routeIndex, selectedRouteIndex, isHovered),
    [route.routeIndex, selectedRouteIndex, isHovered]
  );

  const isSelected = route.routeIndex === selectedRouteIndex;
  const isBest = route.routeIndex === 0;

  return (
    <Pane name={`route-${route.routeIndex}`} style={{ zIndex }}>
      {/* Train segment polylines */}
      {route.trainSegments.map((segment, idx) => (
        <RailwayPolyline
          key={`${route.routeIndex}-segment-${idx}`}
          segment={segment}
          routeColor={route.color}
          opacity={opacity}
          weight={weight}
          onMouseOver={() => setIsHovered(true)}
          onMouseOut={() => setIsHovered(false)}
          onClick={onRouteClick}
        />
      ))}

      {/* Station markers - only show for selected route to avoid clutter */}
      {isSelected &&
        route.stations.map(station => {
          const isShared = sharedStationCodes.has(station.code);
          return (
            <StationMarker
              key={`${route.routeIndex}-station-${station.code}`}
              station={station}
              isShared={isShared}
              routeColor={route.color}
              onClick={() => onStationClick?.(station.code)}
            />
          );
        })}
    </Pane>
  );
}
