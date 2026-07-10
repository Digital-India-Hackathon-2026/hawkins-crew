"use client";

import { Polyline, Tooltip } from "react-leaflet";
import { useMemo } from "react";
import type { NormalizedTrainSegment } from "@/lib/map/normalizeRoute";
import { LatLngExpression } from "leaflet";

interface RailwayPolylineProps {
  segment: NormalizedTrainSegment;
  routeColor: string;
  opacity: number;
  weight: number;
  zIndexOffset?: number;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
  onClick?: () => void;
}

export function RailwayPolyline({
  segment,
  routeColor,
  opacity,
  weight,
  zIndexOffset = 0,
  onMouseOver,
  onMouseOut,
  onClick,
}: RailwayPolylineProps) {
  const positions: LatLngExpression[] = useMemo(() => {
    return segment.coordinates.map(coord => [coord.lat, coord.lng]);
  }, [segment.coordinates]);

  const pathOptions = useMemo(
    () => ({
      color: routeColor,
      weight,
      opacity,
      lineCap: "round" as const,
      lineJoin: "round" as const,
    }),
    [routeColor, weight, opacity]
  );

  return (
    <Polyline
      positions={positions}
      pathOptions={pathOptions}
      eventHandlers={{
        mouseover: onMouseOver,
        mouseout: onMouseOut,
        click: onClick,
      }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem" }}>
          <div style={{ fontWeight: 700, marginBottom: "4px" }}>
            Train {segment.trainNumber}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
            {segment.fromStationCode} → {segment.toStationCode}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: "4px" }}>
            {segment.departureTime} - {segment.arrivalTime}
          </div>
        </div>
      </Tooltip>
    </Polyline>
  );
}
