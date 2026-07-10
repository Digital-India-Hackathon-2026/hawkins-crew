/**
 * Calculate geographic distance between two points using Haversine formula
 */

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate total distance for a route
 */
export function calculateRouteDistance(
  coordinates: Array<{ lat: number; lng: number }>
): number {
  let totalDistance = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const distance = calculateDistance(
      coordinates[i].lat,
      coordinates[i].lng,
      coordinates[i + 1].lat,
      coordinates[i + 1].lng
    );
    totalDistance += distance;
  }

  return Math.round(totalDistance);
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(0)}km`;
}
