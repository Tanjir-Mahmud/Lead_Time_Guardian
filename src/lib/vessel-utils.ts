/**
 * Vessel Tracking Utilities
 * Distance calculation and ETA prediction for maritime shipments
 */

export interface VesselPosition {
    latitude: number;
    longitude: number;
    speed: number; // knots
    timestamp: Date;
}

export interface PortCoordinates {
    name: string;
    latitude: number;
    longitude: number;
}

/**
 * Major port coordinates database
 */
export const MAJOR_PORTS: Record<string, PortCoordinates> = {
    // Bangladesh
    'Chattogram': { name: 'Chattogram Port', latitude: 22.3384, longitude: 91.8317 },

    // India
    'Mumbai': { name: 'Mumbai Port', latitude: 18.9404, longitude: 72.8348 },
    'Chennai': { name: 'Chennai Port', latitude: 13.0827, longitude: 80.2707 },

    // Southeast Asia
    'Singapore': { name: 'Singapore Port', latitude: 1.2644, longitude: 103.8228 },
    'Bangkok': { name: 'Bangkok Port', latitude: 13.7563, longitude: 100.5018 },

    // East Asia
    'Shanghai': { name: 'Shanghai Port', latitude: 31.2304, longitude: 121.4737 },
    'Tokyo': { name: 'Tokyo Port', latitude: 35.6532, longitude: 139.8070 },

    // Middle East
    'Dubai': { name: 'Jebel Ali Port', latitude: 24.9857, longitude: 55.0272 },

    // Europe
    'Hamburg': { name: 'Hamburg Port', latitude: 53.5511, longitude: 9.9937 },
    'Rotterdam': { name: 'Rotterdam Port', latitude: 51.9244, longitude: 4.4777 },

    // Americas
    'NewYork': { name: 'New York Port', latitude: 40.6700, longitude: -74.0400 },
    'Santos': { name: 'Santos Port (Brazil)', latitude: -23.9608, longitude: -46.3336 },
};

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in kilometers

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

/**
 * Calculate ETA in days based on vessel position, destination, and speed
 */
export function calculateETA(
    vesselLat: number,
    vesselLon: number,
    destLat: number,
    destLon: number,
    speedKnots: number
): number {
    // Calculate distance in kilometers
    const distanceKm = calculateDistance(vesselLat, vesselLon, destLat, destLon);

    // Convert to nautical miles (1 km = 0.539957 nautical miles)
    const distanceNauticalMiles = distanceKm * 0.539957;

    // Calculate time in hours (distance / speed)
    const etaHours = distanceNauticalMiles / speedKnots;

    // Convert to days and round up
    return Math.ceil(etaHours / 24);
}

/**
 * Find closest port to a given country/city name
 */
export function findClosestPort(location: string): PortCoordinates | null {
    const locationLower = location.toLowerCase();

    // Direct match
    for (const [key, port] of Object.entries(MAJOR_PORTS)) {
        if (locationLower.includes(key.toLowerCase())) {
            return port;
        }
    }

    // Country-based fallbacks
    if (locationLower.includes('india')) return MAJOR_PORTS.Mumbai;
    if (locationLower.includes('china')) return MAJOR_PORTS.Shanghai;
    if (locationLower.includes('japan')) return MAJOR_PORTS.Tokyo;
    if (locationLower.includes('singapore')) return MAJOR_PORTS.Singapore;
    if (locationLower.includes('uae') || locationLower.includes('dubai')) return MAJOR_PORTS.Dubai;
    if (locationLower.includes('germany')) return MAJOR_PORTS.Hamburg;
    if (locationLower.includes('netherlands')) return MAJOR_PORTS.Rotterdam;
    if (locationLower.includes('usa') || locationLower.includes('united states')) return MAJOR_PORTS.NewYork;
    if (locationLower.includes('brazil')) return MAJOR_PORTS.Santos;

    // Default to Chattogram (origin)
    return MAJOR_PORTS.Chattogram;
}

/**
 * Calculate accuracy score comparing predicted vs actual lead time
 * @returns Accuracy percentage (0-100)
 */
export function calculateAccuracy(predicted: number, actual: number): number {
    if (!predicted || !actual) return 0;

    const difference = Math.abs(predicted - actual);
    const accuracy = Math.max(0, 100 - (difference / predicted) * 100);

    return Math.round(accuracy);
}
