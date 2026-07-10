/**
 * Color palette for route visualization
 * Best route gets the primary color, alternatives get muted colors
 */

export const ROUTE_COLORS = {
  best: {
    primary: "hsl(215, 70%, 55%)",   // Vibrant blue
    glow: "rgba(66, 133, 244, 0.3)",
  },
  alternatives: [
    "hsl(280, 60%, 55%)",  // Purple
    "hsl(145, 60%, 45%)",  // Green
    "hsl(25, 80%, 50%)",   // Orange
    "hsl(0, 70%, 55%)",    // Red
    "hsl(180, 60%, 45%)",  // Teal
    "hsl(40, 95%, 50%)",   // Yellow
    "hsl(320, 60%, 55%)",  // Magenta
  ],
};

export const TRAIN_COLORS = [
  "hsl(215, 70%, 55%)", // Blue
  "hsl(145, 60%, 45%)", // Green
  "hsl(280, 60%, 55%)", // Purple
  "hsl(25, 80%, 50%)",  // Orange
  "hsl(0, 70%, 55%)",   // Red
  "hsl(180, 60%, 45%)", // Teal
  "hsl(40, 95%, 50%)",  // Yellow-Orange
  "hsl(320, 60%, 55%)", // Magenta
  "hsl(190, 70%, 50%)", // Cyan
  "hsl(160, 60%, 45%)", // Sea Green
];

export const MARKER_COLORS = {
  origin: "hsl(145, 60%, 45%)",      // Green
  destination: "hsl(0, 70%, 55%)",   // Red
  transfer: "hsl(40, 95%, 50%)",     // Orange
  shared: "hsl(280, 60%, 55%)",      // Purple (for shared stations)
};

/**
 * Get color for a specific route
 */
export function getRouteColor(routeIndex: number): string {
  if (routeIndex === 0) {
    return ROUTE_COLORS.best.primary;
  }
  return ROUTE_COLORS.alternatives[(routeIndex - 1) % ROUTE_COLORS.alternatives.length];
}

/**
 * Get color for a specific train
 */
export function getTrainColor(trainIndex: number): string {
  return TRAIN_COLORS[trainIndex % TRAIN_COLORS.length];
}

/**
 * Get opacity for a route based on selection state
 */
export function getRouteOpacity(
  routeIndex: number,
  selectedRouteIndex: number,
  isHovered: boolean
): number {
  // Best route is always prominent
  if (routeIndex === 0 && selectedRouteIndex === 0) {
    return 1.0;
  }

  // Selected route
  if (routeIndex === selectedRouteIndex) {
    return isHovered ? 1.0 : 0.9;
  }

  // Hovered route
  if (isHovered) {
    return 0.8;
  }

  // Other routes when best is selected
  if (selectedRouteIndex === 0) {
    return 0.4;
  }

  // Other routes
  return 0.5;
}

/**
 * Get line weight for a route
 */
export function getRouteWeight(
  routeIndex: number,
  selectedRouteIndex: number,
  isHovered: boolean
): number {
  // Best route
  if (routeIndex === 0 && selectedRouteIndex === 0) {
    return isHovered ? 6 : 5;
  }

  // Selected route
  if (routeIndex === selectedRouteIndex) {
    return isHovered ? 5 : 4;
  }

  // Hovered route
  if (isHovered) {
    return 4;
  }

  // Other routes
  return 3;
}

/**
 * Get z-index for a route layer
 */
export function getRouteZIndex(
  routeIndex: number,
  selectedRouteIndex: number,
  isHovered: boolean
): number {
  // Hovered route goes to top
  if (isHovered) {
    return 1000;
  }

  // Selected route
  if (routeIndex === selectedRouteIndex) {
    return 500;
  }

  // Best route
  if (routeIndex === 0) {
    return 400;
  }

  // Other routes
  return 100 - routeIndex;
}
