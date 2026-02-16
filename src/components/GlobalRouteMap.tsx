'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon, DivIcon } from 'leaflet';
import { useEffect, useMemo } from 'react';

// Fix for default marker icons in Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const originIcon = new Icon({
    iconUrl: iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

const destIcon = new Icon({
    iconUrl: iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

// Comprehensive port coordinates (global)
const PORT_COORDINATES: Record<string, { lat: number; lng: number; label: string }> = {
    // Bangladesh
    'chittagong': { lat: 22.3569, lng: 91.7832, label: 'Chittagong Port' },
    'chattogram': { lat: 22.3569, lng: 91.7832, label: 'Chattogram Port' },
    'mongla': { lat: 22.4717, lng: 89.5972, label: 'Mongla Port' },
    // USA
    'los angeles': { lat: 33.7361, lng: -118.2642, label: 'Port of Los Angeles' },
    'la': { lat: 33.7361, lng: -118.2642, label: 'Port of Los Angeles' },
    'long beach': { lat: 33.7544, lng: -118.2173, label: 'Port of Long Beach' },
    'new york': { lat: 40.6840, lng: -74.0169, label: 'Port of New York' },
    'savannah': { lat: 32.0809, lng: -81.0912, label: 'Port of Savannah' },
    'houston': { lat: 29.7277, lng: -95.0097, label: 'Port of Houston' },
    'charleston': { lat: 32.8012, lng: -79.9535, label: 'Port of Charleston' },
    // Europe
    'rotterdam': { lat: 51.9036, lng: 4.4635, label: 'Port of Rotterdam' },
    'hamburg': { lat: 53.5357, lng: 9.9760, label: 'Port of Hamburg' },
    'antwerp': { lat: 51.2665, lng: 4.3393, label: 'Port of Antwerp' },
    'felixstowe': { lat: 51.9549, lng: 1.3510, label: 'Port of Felixstowe' },
    // Asia
    'singapore': { lat: 1.2644, lng: 103.8200, label: 'Port of Singapore' },
    'shanghai': { lat: 30.6340, lng: 122.0652, label: 'Port of Shanghai' },
    'busan': { lat: 35.1028, lng: 129.0403, label: 'Port of Busan' },
    'hong kong': { lat: 22.3374, lng: 114.1362, label: 'Port of Hong Kong' },
    'colombo': { lat: 6.9485, lng: 79.8439, label: 'Port of Colombo' },
    'dubai': { lat: 25.2681, lng: 55.2963, label: 'Jebel Ali Port, Dubai' },
    'port klang': { lat: 3.0006, lng: 101.3887, label: 'Port Klang' },
};

// City/country coordinates for origin — 30+ global cities
const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number; label: string }> = {
    // Bangladesh
    'bangladesh': { lat: 23.8103, lng: 90.4125, label: 'Dhaka, Bangladesh' },
    'dhaka': { lat: 23.8103, lng: 90.4125, label: 'Dhaka, Bangladesh' },
    'sylhet': { lat: 24.8949, lng: 91.8687, label: 'Sylhet, Bangladesh' },
    'narayanganj': { lat: 23.6238, lng: 90.5000, label: 'Narayanganj, Bangladesh' },
    'rajshahi': { lat: 24.3636, lng: 88.6241, label: 'Rajshahi, Bangladesh' },
    'khulna': { lat: 22.8456, lng: 89.5403, label: 'Khulna, Bangladesh' },
    // India
    'india': { lat: 19.0760, lng: 72.8777, label: 'Mumbai, India' },
    'mumbai': { lat: 19.0760, lng: 72.8777, label: 'Mumbai, India' },
    'delhi': { lat: 28.7041, lng: 77.1025, label: 'Delhi, India' },
    'kolkata': { lat: 22.5726, lng: 88.3639, label: 'Kolkata, India' },
    'chennai': { lat: 13.0827, lng: 80.2707, label: 'Chennai, India' },
    'tiruppur': { lat: 11.1085, lng: 77.3411, label: 'Tiruppur, India' },
    // China
    'china': { lat: 31.2304, lng: 121.4737, label: 'Shanghai, China' },
    'shenzhen': { lat: 22.5431, lng: 114.0579, label: 'Shenzhen, China' },
    'guangzhou': { lat: 23.1291, lng: 113.2644, label: 'Guangzhou, China' },
    'shanghai': { lat: 31.2304, lng: 121.4737, label: 'Shanghai, China' },
    'yiwu': { lat: 29.3065, lng: 120.0750, label: 'Yiwu, China' },
    'beijing': { lat: 39.9042, lng: 116.4074, label: 'Beijing, China' },
    // Vietnam
    'vietnam': { lat: 10.8231, lng: 106.6297, label: 'Ho Chi Minh City, Vietnam' },
    'hanoi': { lat: 21.0278, lng: 105.8342, label: 'Hanoi, Vietnam' },
    // USA
    'usa': { lat: 40.7128, lng: -74.0060, label: 'New York, USA' },
    'ohio': { lat: 39.9612, lng: -82.9988, label: 'Ohio, USA' },
    'chicago': { lat: 41.8781, lng: -87.6298, label: 'Chicago, USA' },
    // Europe
    'germany': { lat: 53.5511, lng: 9.9937, label: 'Hamburg, Germany' },
    'uk': { lat: 51.5074, lng: -0.1278, label: 'London, UK' },
    'european union': { lat: 50.8503, lng: 4.3517, label: 'Brussels, EU' },
    'lyon': { lat: 45.7640, lng: 4.8357, label: 'Lyon, France' },
    'paris': { lat: 48.8566, lng: 2.3522, label: 'Paris, France' },
    'berlin': { lat: 52.5200, lng: 13.4050, label: 'Berlin, Germany' },
    'london': { lat: 51.5074, lng: -0.1278, label: 'London, UK' },
    'istanbul': { lat: 41.0082, lng: 28.9784, label: 'Istanbul, Turkey' },
    'milan': { lat: 45.4642, lng: 9.1900, label: 'Milan, Italy' },
    // Middle East & Africa
    'turkey': { lat: 41.0082, lng: 28.9784, label: 'Istanbul, Turkey' },
    'dubai': { lat: 25.2048, lng: 55.2708, label: 'Dubai, UAE' },
    'nairobi': { lat: -1.2921, lng: 36.8219, label: 'Nairobi, Kenya' },
    'johannesburg': { lat: -26.2041, lng: 28.0473, label: 'Johannesburg, South Africa' },
    // Oceania & S. America
    'sydney': { lat: -33.8688, lng: 151.2093, label: 'Sydney, Australia' },
    'melbourne': { lat: -37.8136, lng: 144.9631, label: 'Melbourne, Australia' },
    'sao paulo': { lat: -23.5505, lng: -46.6333, label: 'São Paulo, Brazil' },
    // Southeast Asia
    'bangkok': { lat: 13.7563, lng: 100.5018, label: 'Bangkok, Thailand' },
    'jakarta': { lat: -6.2088, lng: 106.8456, label: 'Jakarta, Indonesia' },
    'kuala lumpur': { lat: 3.1390, lng: 101.6869, label: 'Kuala Lumpur, Malaysia' },
};

function resolveCoords(name: string, lookup: Record<string, { lat: number; lng: number; label: string }>): { lat: number; lng: number; label: string } | null {
    if (!name) return null;
    const normalized = name.toLowerCase().trim();

    // Direct match
    if (lookup[normalized]) return lookup[normalized];

    // Partial match
    for (const [key, val] of Object.entries(lookup)) {
        if (normalized.includes(key) || key.includes(normalized)) return val;
    }
    return null;
}

// Create a curved line of points (great circle approximation)
function createCurvedPath(start: [number, number], end: [number, number], numPoints: number = 50): [number, number][] {
    const points: [number, number][] = [];

    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const lat = start[0] + t * (end[0] - start[0]);
        let lng: number;

        // Handle date line crossing
        const dLng = end[1] - start[1];
        if (Math.abs(dLng) > 180) {
            // Go the other way around
            const adjustedEnd = dLng > 0 ? end[1] - 360 : end[1] + 360;
            lng = start[1] + t * (adjustedEnd - start[1]);
            if (lng < -180) lng += 360;
            if (lng > 180) lng -= 360;
        } else {
            lng = start[1] + t * dLng;
        }

        // Add curve (arc above the straight line)
        const curveFactor = Math.sin(t * Math.PI) * Math.abs(end[0] - start[0]) * 0.3;
        const curvedLat = lat + curveFactor;

        points.push([curvedLat, lng]);
    }
    return points;
}

// Component to auto-fit map bounds
function FitBounds({ origin, destination }: { origin: [number, number]; destination: [number, number] }) {
    const map = useMap();

    useEffect(() => {
        const L = require('leaflet');
        const bounds = L.latLngBounds([origin, destination]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
    }, [map, origin, destination]);

    return null;
}

export interface GlobalRouteMapProps {
    originCountry?: string;
    originCity?: string;
    destinationCountry?: string;
    destinationCity?: string;
    portOfLoading?: string;
    portOfDischarge?: string;
    congestionIndex?: number;
    riskLevel?: string;
    leadTime?: string;
    winningMove?: string;
    firstMileHours?: number;
}

export default function GlobalRouteMap({
    originCountry = 'Bangladesh',
    originCity,
    destinationCountry = 'USA',
    destinationCity,
    portOfLoading = 'Chittagong',
    portOfDischarge = 'Los Angeles',
    congestionIndex = 0,
    riskLevel = 'Low',
    leadTime,
    winningMove,
    firstMileHours,
}: GlobalRouteMapProps) {

    // Resolve coordinates — priority: city > port > country
    const originCityCoord = originCity ? resolveCoords(originCity, COUNTRY_COORDINATES) : null;
    const originPort = resolveCoords(portOfLoading, PORT_COORDINATES);
    const destPort = resolveCoords(portOfDischarge, PORT_COORDINATES);
    const destCityCoord = destinationCity ? resolveCoords(destinationCity, COUNTRY_COORDINATES) : null;
    const originFallback = resolveCoords(originCountry, COUNTRY_COORDINATES);
    const destFallback = resolveCoords(destinationCountry, COUNTRY_COORDINATES);

    // Multi-leg coordinates
    const startCoord: [number, number] = originCityCoord
        ? [originCityCoord.lat, originCityCoord.lng]
        : originPort ? [originPort.lat, originPort.lng]
            : originFallback ? [originFallback.lat, originFallback.lng] : [23.8103, 90.4125];

    const loadingCoord: [number, number] = originPort
        ? [originPort.lat, originPort.lng]
        : startCoord;

    const dischargeCoord: [number, number] = destPort
        ? [destPort.lat, destPort.lng]
        : destFallback ? [destFallback.lat, destFallback.lng] : [33.7361, -118.2642];

    const endCoord: [number, number] = destCityCoord
        ? [destCityCoord.lat, destCityCoord.lng]
        : dischargeCoord;

    // Is multi-leg? (city is different from port)
    const hasFirstMile = originCityCoord && originPort &&
        (Math.abs(originCityCoord.lat - originPort.lat) > 0.1 || Math.abs(originCityCoord.lng - originPort.lng) > 0.1);
    const hasLastMile = destCityCoord && destPort &&
        (Math.abs(destCityCoord.lat - destPort.lat) > 0.1 || Math.abs(destCityCoord.lng - destPort.lng) > 0.1);

    const originLabel = originCityCoord?.label || originPort?.label || originFallback?.label || originCountry;
    const destLabel = destCityCoord?.label || destPort?.label || destFallback?.label || destinationCountry;

    // Generate route paths
    const mainRoutePath = useMemo(
        () => createCurvedPath(loadingCoord, dischargeCoord),
        [loadingCoord[0], loadingCoord[1], dischargeCoord[0], dischargeCoord[1]]
    );

    // Route color based on risk
    const routeColor = riskLevel.toLowerCase().includes('critical') || riskLevel.toLowerCase().includes('high')
        ? '#ef4444'
        : riskLevel.toLowerCase().includes('moderate') || riskLevel.toLowerCase().includes('elevated')
            ? '#f59e0b'
            : '#22c55e';

    // Center between the two extreme points
    const centerLat = (startCoord[0] + endCoord[0]) / 2;
    const centerLng = (startCoord[1] + endCoord[1]) / 2;

    return (
        <div className="relative">
            {/* Winning Move Banner */}
            {winningMove && (
                <div className="mb-3 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
                    <span className="text-lg">🏆</span>
                    <div>
                        <div className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">Winning Move</div>
                        <div className="text-xs text-amber-100 font-medium">{winningMove}</div>
                    </div>
                </div>
            )}

            <div className="h-[400px] w-full rounded-xl overflow-hidden border border-gold/20 shadow-2xl relative z-0">
                <MapContainer
                    center={[centerLat, centerLng]}
                    zoom={3}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />

                    <FitBounds origin={startCoord} destination={endCoord} />

                    {/* First-Mile Leg: City → Loading Port (dashed blue) */}
                    {hasFirstMile && (
                        <Polyline
                            positions={[startCoord, loadingCoord]}
                            pathOptions={{
                                color: '#3b82f6',
                                weight: 3,
                                opacity: 0.9,
                                dashArray: '6, 8',
                            }}
                        />
                    )}

                    {/* Main Sea Route: Loading Port → Discharge Port (solid/curved) */}
                    <Polyline
                        positions={mainRoutePath}
                        pathOptions={{
                            color: routeColor,
                            weight: 3,
                            opacity: 0.8,
                            dashArray: '10, 6',
                        }}
                    />

                    {/* Last-Mile Leg: Discharge Port → Destination City (dashed green) */}
                    {hasLastMile && (
                        <Polyline
                            positions={[dischargeCoord, endCoord]}
                            pathOptions={{
                                color: '#22c55e',
                                weight: 3,
                                opacity: 0.9,
                                dashArray: '6, 8',
                            }}
                        />
                    )}

                    {/* Origin City Marker (if different from port) */}
                    {hasFirstMile && (
                        <Marker position={startCoord} icon={new DivIcon({
                            className: 'custom-marker',
                            html: '<div style="background:#3b82f6;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>',
                            iconSize: [12, 12],
                            iconAnchor: [6, 6],
                        })}>
                            <Popup>
                                <div style={{ color: '#000', fontSize: '12px' }}>
                                    <strong>🏭 Origin: {originCityCoord?.label}</strong>
                                    <br />
                                    First-Mile: {firstMileHours ? `${firstMileHours}h` : 'Calculating...'} → {portOfLoading}
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Origin Port Marker */}
                    <Marker position={loadingCoord} icon={originIcon}>
                        <Popup>
                            <div style={{ color: '#000', fontSize: '12px' }}>
                                <strong>⚓ {originPort?.label || portOfLoading}</strong>
                                <br />
                                Port of Loading
                            </div>
                        </Popup>
                    </Marker>

                    {/* Destination Port Marker */}
                    <Marker position={dischargeCoord} icon={destIcon}>
                        <Popup>
                            <div style={{ color: '#000', fontSize: '12px' }}>
                                <strong>🚢 {destPort?.label || portOfDischarge}</strong>
                                <br />
                                Port of Discharge
                                {congestionIndex > 0 && (
                                    <>
                                        <br />
                                        Congestion: {congestionIndex}%
                                    </>
                                )}
                            </div>
                        </Popup>
                    </Marker>

                    {/* Destination City Marker (if different from port) */}
                    {hasLastMile && (
                        <Marker position={endCoord} icon={new DivIcon({
                            className: 'custom-marker',
                            html: '<div style="background:#22c55e;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>',
                            iconSize: [12, 12],
                            iconAnchor: [6, 6],
                        })}>
                            <Popup>
                                <div style={{ color: '#000', fontSize: '12px' }}>
                                    <strong>📍 Destination: {destCityCoord?.label}</strong>
                                </div>
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>

                {/* Overlay badges */}
                <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
                    <div className="bg-navy/90 backdrop-blur border border-gold/20 px-3 py-1.5 rounded-lg text-[11px]">
                        <span className="text-gray-400">Route: </span>
                        <span className="text-white font-medium">{originLabel}</span>
                        <span className="text-gold mx-1">→</span>
                        <span className="text-white font-medium">{destLabel}</span>
                    </div>
                    {leadTime && (
                        <div className="bg-navy/90 backdrop-blur border border-gold/20 px-3 py-1.5 rounded-lg text-[11px]">
                            <span className="text-gray-400">ETA: </span>
                            <span className="text-gold font-bold">{leadTime}</span>
                        </div>
                    )}
                    {hasFirstMile && firstMileHours && (
                        <div className="bg-blue-500/10 backdrop-blur border border-blue-500/30 px-3 py-1.5 rounded-lg text-[11px]">
                            <span className="text-blue-300">🚛 First-Mile: </span>
                            <span className="text-blue-100 font-bold">{firstMileHours}h</span>
                        </div>
                    )}
                </div>

                <div className="absolute top-4 right-4 z-[400] bg-navy/90 backdrop-blur border border-gold/20 px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${riskLevel.toLowerCase().includes('critical') || riskLevel.toLowerCase().includes('high') ? 'bg-red-500' :
                        riskLevel.toLowerCase().includes('moderate') || riskLevel.toLowerCase().includes('elevated') ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></span>
                    <span className="text-gold">{riskLevel} Risk</span>
                </div>

                {congestionIndex > 0 && (
                    <div className="absolute bottom-4 left-4 z-[400] bg-navy/90 backdrop-blur border border-gold/20 px-3 py-1.5 rounded-lg text-[11px]">
                        <span className="text-gray-400">Port Congestion: </span>
                        <span className={`font-bold ${congestionIndex > 60 ? 'text-red-400' : congestionIndex > 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {congestionIndex}%
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
