/**
 * First-Mile Logistics Engine — City-to-Port Intelligence
 * 
 * Calculates ground transportation from ANY origin city to its nearest
 * international exit port, with infrastructure-quality buffers.
 * 
 * Features:
 * 1. 30+ global city coordinates
 * 2. City → Nearest Port mapping with distance estimates
 * 3. Infrastructure buffer database (per-country road/rail quality)
 * 4. Multi-modal auto-suggestion based on sector, urgency, weather
 */

// ============================================================
// TYPES
// ============================================================

export interface FirstMileResult {
    origin_city: string;
    origin_country: string;
    nearest_port: string;
    distance_km: number;
    transit_hours: number;
    buffer_hours: number;
    total_first_mile_hours: number;
    infrastructure_note: string;
    transport_mode: 'Road' | 'Rail' | 'Air';
    coordinates: { lat: number; lng: number };
}

export interface ModeRecommendation {
    recommended_mode: 'Sea' | 'Air' | 'Rail' | 'Road';
    reason: string;
    estimated_total_days: number;
    cost_multiplier: number; // 1.0 = Sea baseline
}

// ============================================================
// GLOBAL CITY DATABASE — 30+ cities with coordinates
// ============================================================

export const CITY_COORDINATES: Record<string, {
    lat: number;
    lng: number;
    country: string;
    nearest_port: string;
    distance_to_port_km: number;
    base_transit_hours: number;
}> = {
    // Bangladesh
    'sylhet': { lat: 24.8949, lng: 91.8687, country: 'Bangladesh', nearest_port: 'Chittagong', distance_to_port_km: 340, base_transit_hours: 10 },
    'dhaka': { lat: 23.8103, lng: 90.4125, country: 'Bangladesh', nearest_port: 'Chittagong', distance_to_port_km: 260, base_transit_hours: 7 },
    'rajshahi': { lat: 24.3636, lng: 88.6241, country: 'Bangladesh', nearest_port: 'Mongla', distance_to_port_km: 280, base_transit_hours: 9 },
    'khulna': { lat: 22.8456, lng: 89.5403, country: 'Bangladesh', nearest_port: 'Mongla', distance_to_port_km: 80, base_transit_hours: 3 },
    'narayanganj': { lat: 23.6238, lng: 90.5000, country: 'Bangladesh', nearest_port: 'Chittagong', distance_to_port_km: 250, base_transit_hours: 7 },
    // India
    'mumbai': { lat: 19.0760, lng: 72.8777, country: 'India', nearest_port: 'Nhava Sheva', distance_to_port_km: 30, base_transit_hours: 2 },
    'delhi': { lat: 28.7041, lng: 77.1025, country: 'India', nearest_port: 'Mundra', distance_to_port_km: 950, base_transit_hours: 18 },
    'kolkata': { lat: 22.5726, lng: 88.3639, country: 'India', nearest_port: 'Kolkata', distance_to_port_km: 20, base_transit_hours: 1 },
    'chennai': { lat: 13.0827, lng: 80.2707, country: 'India', nearest_port: 'Chennai', distance_to_port_km: 10, base_transit_hours: 1 },
    'tiruppur': { lat: 11.1085, lng: 77.3411, country: 'India', nearest_port: 'Chennai', distance_to_port_km: 500, base_transit_hours: 10 },
    // China
    'shenzhen': { lat: 22.5431, lng: 114.0579, country: 'China', nearest_port: 'Shenzhen', distance_to_port_km: 15, base_transit_hours: 1 },
    'guangzhou': { lat: 23.1291, lng: 113.2644, country: 'China', nearest_port: 'Shenzhen', distance_to_port_km: 140, base_transit_hours: 2 },
    'shanghai': { lat: 31.2304, lng: 121.4737, country: 'China', nearest_port: 'Shanghai', distance_to_port_km: 30, base_transit_hours: 1 },
    'yiwu': { lat: 29.3065, lng: 120.0750, country: 'China', nearest_port: 'Ningbo', distance_to_port_km: 200, base_transit_hours: 3 },
    'beijing': { lat: 39.9042, lng: 116.4074, country: 'China', nearest_port: 'Tianjin', distance_to_port_km: 130, base_transit_hours: 2 },
    // Vietnam
    'ho chi minh': { lat: 10.8231, lng: 106.6297, country: 'Vietnam', nearest_port: 'Ho Chi Minh', distance_to_port_km: 20, base_transit_hours: 1 },
    'hanoi': { lat: 21.0278, lng: 105.8342, country: 'Vietnam', nearest_port: 'Haiphong', distance_to_port_km: 120, base_transit_hours: 3 },
    // USA
    'ohio': { lat: 39.9612, lng: -82.9988, country: 'USA', nearest_port: 'New York', distance_to_port_km: 780, base_transit_hours: 10 },
    'los angeles': { lat: 34.0522, lng: -118.2437, country: 'USA', nearest_port: 'Los Angeles', distance_to_port_km: 30, base_transit_hours: 1 },
    'chicago': { lat: 41.8781, lng: -87.6298, country: 'USA', nearest_port: 'New York', distance_to_port_km: 1270, base_transit_hours: 14 },
    'houston': { lat: 29.7604, lng: -95.3698, country: 'USA', nearest_port: 'Houston', distance_to_port_km: 40, base_transit_hours: 1 },
    'new york': { lat: 40.7128, lng: -74.0060, country: 'USA', nearest_port: 'New York', distance_to_port_km: 15, base_transit_hours: 1 },
    // Europe
    'lyon': { lat: 45.7640, lng: 4.8357, country: 'France', nearest_port: 'Marseille', distance_to_port_km: 320, base_transit_hours: 3 },
    'paris': { lat: 48.8566, lng: 2.3522, country: 'France', nearest_port: 'Le Havre', distance_to_port_km: 200, base_transit_hours: 2 },
    'berlin': { lat: 52.5200, lng: 13.4050, country: 'Germany', nearest_port: 'Hamburg', distance_to_port_km: 290, base_transit_hours: 3 },
    'munich': { lat: 48.1351, lng: 11.5820, country: 'Germany', nearest_port: 'Hamburg', distance_to_port_km: 780, base_transit_hours: 6 },
    'london': { lat: 51.5074, lng: -0.1278, country: 'UK', nearest_port: 'Felixstowe', distance_to_port_km: 130, base_transit_hours: 2 },
    'manchester': { lat: 53.4808, lng: -2.2426, country: 'UK', nearest_port: 'Liverpool', distance_to_port_km: 55, base_transit_hours: 1 },
    'istanbul': { lat: 41.0082, lng: 28.9784, country: 'Turkey', nearest_port: 'Istanbul', distance_to_port_km: 20, base_transit_hours: 1 },
    'milan': { lat: 45.4642, lng: 9.1900, country: 'Italy', nearest_port: 'Genoa', distance_to_port_km: 150, base_transit_hours: 2 },
    // Middle East / Africa
    'dubai': { lat: 25.2048, lng: 55.2708, country: 'UAE', nearest_port: 'Dubai', distance_to_port_km: 20, base_transit_hours: 1 },
    'nairobi': { lat: -1.2921, lng: 36.8219, country: 'Kenya', nearest_port: 'Mombasa', distance_to_port_km: 480, base_transit_hours: 10 },
    'johannesburg': { lat: -26.2041, lng: 28.0473, country: 'South Africa', nearest_port: 'Durban', distance_to_port_km: 570, base_transit_hours: 7 },
    // Oceania
    'sydney': { lat: -33.8688, lng: 151.2093, country: 'Australia', nearest_port: 'Sydney', distance_to_port_km: 15, base_transit_hours: 1 },
    'melbourne': { lat: -37.8136, lng: 144.9631, country: 'Australia', nearest_port: 'Melbourne', distance_to_port_km: 10, base_transit_hours: 1 },
    // South America
    'sao paulo': { lat: -23.5505, lng: -46.6333, country: 'Brazil', nearest_port: 'Santos', distance_to_port_km: 70, base_transit_hours: 2 },
    // Southeast Asia
    'bangkok': { lat: 13.7563, lng: 100.5018, country: 'Thailand', nearest_port: 'Laem Chabang', distance_to_port_km: 120, base_transit_hours: 2 },
    'jakarta': { lat: -6.2088, lng: 106.8456, country: 'Indonesia', nearest_port: 'Tanjung Priok', distance_to_port_km: 15, base_transit_hours: 1 },
    'kuala lumpur': { lat: 3.1390, lng: 101.6869, country: 'Malaysia', nearest_port: 'Port Klang', distance_to_port_km: 50, base_transit_hours: 1 },
};

// ============================================================
// INFRASTRUCTURE BUFFER DATABASE — country-level road/rail quality
// ============================================================

const INFRASTRUCTURE_BUFFERS: Record<string, {
    road_buffer_hours: number;
    rail_buffer_hours: number;
    quality_note: string;
}> = {
    'bangladesh': { road_buffer_hours: 18, rail_buffer_hours: 12, quality_note: 'Single-lane highways, monsoon risk, frequent congestion near Dhaka' },
    'india': { road_buffer_hours: 14, rail_buffer_hours: 8, quality_note: 'Mixed highway quality, toll plazas, rail network extensive but slow' },
    'china': { road_buffer_hours: 4, rail_buffer_hours: 2, quality_note: 'World-class expressways, high-speed rail available' },
    'vietnam': { road_buffer_hours: 10, rail_buffer_hours: 8, quality_note: 'Improving highways, rail limited to north-south corridor' },
    'usa': { road_buffer_hours: 8, rail_buffer_hours: 6, quality_note: 'Interstate highway system, intermodal rail hubs' },
    'france': { road_buffer_hours: 4, rail_buffer_hours: 3, quality_note: 'Autoroute network, TGV freight options' },
    'germany': { road_buffer_hours: 4, rail_buffer_hours: 3, quality_note: 'Autobahn + Deutsche Bahn freight network' },
    'uk': { road_buffer_hours: 5, rail_buffer_hours: 4, quality_note: 'Motorway network, Channel Tunnel rail freight' },
    'turkey': { road_buffer_hours: 8, rail_buffer_hours: 6, quality_note: 'New motorways, rail under expansion' },
    'italy': { road_buffer_hours: 6, rail_buffer_hours: 4, quality_note: 'Autostrada network, port-centric logistics hubs' },
    'uae': { road_buffer_hours: 2, rail_buffer_hours: 2, quality_note: 'Premium highway infrastructure, short distances' },
    'kenya': { road_buffer_hours: 16, rail_buffer_hours: 12, quality_note: 'SGR Nairobi-Mombasa operational, road quality variable' },
    'south africa': { road_buffer_hours: 10, rail_buffer_hours: 8, quality_note: 'N3 Durban corridor busy, Transnet rail available' },
    'australia': { road_buffer_hours: 6, rail_buffer_hours: 4, quality_note: 'Long distances, reliable infrastructure' },
    'brazil': { road_buffer_hours: 12, rail_buffer_hours: 10, quality_note: 'Road-dependent, limited rail freight' },
    'thailand': { road_buffer_hours: 6, rail_buffer_hours: 5, quality_note: 'Motorway network expanding, Laem Chabang well-connected' },
    'indonesia': { road_buffer_hours: 10, rail_buffer_hours: 8, quality_note: 'Java toll roads, inter-island logistics complex' },
    'malaysia': { road_buffer_hours: 4, rail_buffer_hours: 3, quality_note: 'PLUS highway, efficient port connections' },
    'japan': { road_buffer_hours: 3, rail_buffer_hours: 2, quality_note: 'Premium expressways, bullet train freight' },
    'south korea': { road_buffer_hours: 3, rail_buffer_hours: 2, quality_note: 'KTX rail network, excellent highway system' },
    'cambodia': { road_buffer_hours: 16, rail_buffer_hours: 14, quality_note: 'Limited highway infrastructure, Sihanoukville port access improving' },
    'myanmar': { road_buffer_hours: 20, rail_buffer_hours: 18, quality_note: 'Poor road quality, limited rail' },
    'pakistan': { road_buffer_hours: 14, rail_buffer_hours: 10, quality_note: 'CPEC motorways improving, Karachi congestion' },
    'sri lanka': { road_buffer_hours: 8, rail_buffer_hours: 6, quality_note: 'Colombo Expressway operational, compact distances' },
    'mexico': { road_buffer_hours: 10, rail_buffer_hours: 7, quality_note: 'Cuotas (toll highways), KCSM rail network' },
    'canada': { road_buffer_hours: 6, rail_buffer_hours: 4, quality_note: 'Trans-Canada highway, CN/CP rail networks' },
};

// ============================================================
// LOGIC FUNCTIONS
// ============================================================

function normalize(s: string): string {
    return s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '');
}

/**
 * Find the best matching city from the database.
 * Supports fuzzy matching (e.g., "Sylhet City" matches "sylhet").
 */
function resolveCity(cityName: string): typeof CITY_COORDINATES[string] & { resolved_name: string } | null {
    const norm = normalize(cityName);

    // Exact match
    if (CITY_COORDINATES[norm]) {
        return { ...CITY_COORDINATES[norm], resolved_name: norm };
    }

    // Fuzzy match
    for (const [key, data] of Object.entries(CITY_COORDINATES)) {
        if (norm.includes(key) || key.includes(norm)) {
            return { ...data, resolved_name: key };
        }
    }

    return null;
}

/**
 * Get infrastructure buffer for a country.
 * Returns default moderate buffer if country not found.
 */
function getInfraBuffer(country: string): typeof INFRASTRUCTURE_BUFFERS[string] {
    const norm = normalize(country);
    if (INFRASTRUCTURE_BUFFERS[norm]) return INFRASTRUCTURE_BUFFERS[norm];

    // Fuzzy match
    for (const [key, data] of Object.entries(INFRASTRUCTURE_BUFFERS)) {
        if (norm.includes(key) || key.includes(norm)) return data;
    }

    // Default moderate buffer
    return { road_buffer_hours: 8, rail_buffer_hours: 6, quality_note: 'Standard infrastructure (no specific data)' };
}

/**
 * Calculate first-mile logistics from an origin city to its nearest port.
 */
export function calculateFirstMile(
    originCity: string,
    preferredMode: 'Road' | 'Rail' | 'Air' = 'Road'
): FirstMileResult {
    const city = resolveCity(originCity);

    if (!city) {
        // Unknown city — return a safe fallback
        return {
            origin_city: originCity,
            origin_country: 'Unknown',
            nearest_port: 'Chittagong',
            distance_km: 200,
            transit_hours: 8,
            buffer_hours: 10,
            total_first_mile_hours: 18,
            infrastructure_note: `City "${originCity}" not in database — using moderate estimate`,
            transport_mode: preferredMode,
            coordinates: { lat: 23.8, lng: 90.4 },
        };
    }

    const infra = getInfraBuffer(city.country);
    const bufferHours = preferredMode === 'Rail' ? infra.rail_buffer_hours
        : preferredMode === 'Air' ? Math.round(infra.road_buffer_hours * 0.3)
            : infra.road_buffer_hours;

    const transitHours = preferredMode === 'Air'
        ? Math.max(1, Math.round(city.base_transit_hours * 0.3))
        : preferredMode === 'Rail'
            ? Math.round(city.base_transit_hours * 0.7)
            : city.base_transit_hours;

    return {
        origin_city: city.resolved_name.charAt(0).toUpperCase() + city.resolved_name.slice(1),
        origin_country: city.country,
        nearest_port: city.nearest_port,
        distance_km: city.distance_to_port_km,
        transit_hours: transitHours,
        buffer_hours: bufferHours,
        total_first_mile_hours: transitHours + bufferHours,
        infrastructure_note: infra.quality_note,
        transport_mode: preferredMode,
        coordinates: { lat: city.lat, lng: city.lng },
    };
}

/**
 * Auto-suggest the best transport mode for a shipment.
 * Considers: sector urgency, port congestion, distance, cost.
 */
export function suggestBestMode(
    originCity: string,
    sector: string,
    portCongestionIndex: number = 40,
    fobValue: number = 10000,
): ModeRecommendation {
    const city = resolveCity(originCity);
    const distanceKm = city?.distance_to_port_km || 200;
    const sectorNorm = normalize(sector);

    // Urgency factor by sector
    const highUrgency = ['perishables', 'pharmaceuticals', 'agriculture'].some(s => sectorNorm.includes(s));
    const mediumUrgency = ['electronics', 'automotive', 'chemicals'].some(s => sectorNorm.includes(s));

    // High-value + perishable + congested → Air
    if (highUrgency && (portCongestionIndex > 50 || fobValue > 50000)) {
        return {
            recommended_mode: 'Air',
            reason: `${sector} requires fast transit. Port congestion at ${portCongestionIndex}% makes Air the safest option.`,
            estimated_total_days: Math.max(3, Math.round(distanceKm / 800) + 2),
            cost_multiplier: 4.5,
        };
    }

    // Long distance + medium urgency → Rail if available
    const railCountries = ['china', 'germany', 'france', 'uk', 'india', 'south korea', 'japan', 'usa', 'canada', 'turkey', 'malaysia'];
    const hasRail = city && railCountries.includes(normalize(city.country));

    if (hasRail && distanceKm > 300 && (mediumUrgency || portCongestionIndex > 55)) {
        return {
            recommended_mode: 'Rail',
            reason: `Rail available in ${city!.country}. Faster than road for ${distanceKm}km distance. Congestion: ${portCongestionIndex}%.`,
            estimated_total_days: Math.max(5, Math.round(distanceKm / 500) + 8),
            cost_multiplier: 1.8,
        };
    }

    // Default → Sea (most cost-effective)
    if (distanceKm < 100 || portCongestionIndex < 45) {
        return {
            recommended_mode: 'Sea',
            reason: `Sea freight is optimal — short first-mile (${distanceKm}km) and manageable port congestion (${portCongestionIndex}%).`,
            estimated_total_days: Math.max(14, Math.round(distanceKm / 400) + 20),
            cost_multiplier: 1.0,
        };
    }

    // Moderate congestion → Sea with early booking advisory
    return {
        recommended_mode: 'Sea',
        reason: `Sea freight recommended with early booking. Port congestion at ${portCongestionIndex}% — plan for buffer days.`,
        estimated_total_days: Math.max(18, Math.round(distanceKm / 400) + 25),
        cost_multiplier: 1.0,
    };
}
