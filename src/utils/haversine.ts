/**
 * utils/haversine.ts
 * -------------------
 * Haversine formula functions to calculate distances on Earth.
 * All angles (latitude/longitude) are in decimal degrees,
 * and distances are returned in meters (m).
 */

const EARTH_RADIUS = 6_371_000; // mean Earth radius in meters (m)

/**
 * Convert degrees to radians.
 * @param deg Angle in decimal degrees.
 */
function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate the great-circle distance between two points on Earth.
 *
 * @param lat1 Deg latitude of point 1
 * @param lon1 Deg longitude of point 1
 * @param lat2 Deg latitude of point 2
 * @param lon2 Deg longitude of point 2
 * @returns Distance in meters, using the haversine formula (±0.3% error) :contentReference[oaicite:1]{index=1}
 */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}
