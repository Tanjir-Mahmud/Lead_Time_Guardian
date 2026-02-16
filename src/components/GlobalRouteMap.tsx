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

// City/country coordinates for origin
const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number; label: string }> = {
    'bangladesh': { lat: 23.8103, lng: 90.4125, label: 'Dhaka, Bangladesh' },
    'dhaka': { lat: 23.8103, lng: 90.4125, label: 'Dhaka, Bangladesh' },
    'india': { lat: 19.0760, lng: 72.8777, label: 'Mumbai, India' },
    'china': { lat: 31.2304, lng: 121.4737, label: 'Shanghai, China' },
    'vietnam': { lat: 10.8231, lng: 106.6297, label: 'Ho Chi Minh City, Vietnam' },
    'turkey': { lat: 41.0082, lng: 28.9784, label: 'Istanbul, Turkey' },
    'usa': { lat: 40.7128, lng: -74.0060, label: 'New York, USA' },
    'germany': { lat: 53.5511, lng: 9.9937, label: 'Hamburg, Germany' },
    'uk': { lat: 51.5074, lng: -0.1278, label: 'London, UK' },
    'european union': { lat: 50.8503, lng: 4.3517, label: 'Brussels, EU' },
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
    destinationCountry?: string;
    portOfLoading?: string;
    portOfDischarge?: string;
    congestionIndex?: number;
    riskLevel?: string;
    leadTime?: string;
}

export default function GlobalRouteMap({
    originCountry = 'Bangladesh',
    destinationCountry = 'USA',
    portOfLoading = 'Chittagong',
    portOfDischarge = 'Los Angeles',
    congestionIndex = 0,
    riskLevel = 'Low',
    leadTime,
}: GlobalRouteMapProps) {

    // Resolve coordinates
    const originPort = resolveCoords(portOfLoading, PORT_COORDINATES);
    const destPort = resolveCoords(portOfDischarge, PORT_COORDINATES);
    const originCity = resolveCoords(originCountry, COUNTRY_COORDINATES);
    const destCity = resolveCoords(destinationCountry, COUNTRY_COORDINATES);

    // Use port coords first, city as fallback
    const originCoord: [number, number] = originPort
        ? [originPort.lat, originPort.lng]
        : originCity
            ? [originCity.lat, originCity.lng]
            : [23.8103, 90.4125]; // Default Dhaka

    const destCoord: [number, number] = destPort
        ? [destPort.lat, destPort.lng]
        : destCity
            ? [destCity.lat, destCity.lng]
            : [33.7361, -118.2642]; // Default LA

    const originLabel = originPort?.label || originCity?.label || originCountry;
    const destLabel = destPort?.label || destCity?.label || destinationCountry;

    // Generate curved shipping route
    const routePath = useMemo(
        () => createCurvedPath(originCoord, destCoord),
        [originCoord[0], originCoord[1], destCoord[0], destCoord[1]]
    );

    // Route color based on risk
    const routeColor = riskLevel.toLowerCase().includes('critical') || riskLevel.toLowerCase().includes('high')
        ? '#ef4444'
        : riskLevel.toLowerCase().includes('moderate') || riskLevel.toLowerCase().includes('elevated')
            ? '#f59e0b'
            : '#22c55e';

    // Center between the two points
    const centerLat = (originCoord[0] + destCoord[0]) / 2;
    const centerLng = (originCoord[1] + destCoord[1]) / 2;

    return (
        <div className="relative">
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

                    <FitBounds origin={originCoord} destination={destCoord} />

                    {/* Origin Port Marker */}
                    <Marker position={originCoord} icon={originIcon}>
                        <Popup>
                            <div style={{ color: '#000', fontSize: '12px' }}>
                                <strong>🏭 Origin: {originLabel}</strong>
                                <br />
                                Port of Loading: {portOfLoading}
                            </div>
                        </Popup>
                    </Marker>

                    {/* Destination Port Marker */}
                    <Marker position={destCoord} icon={destIcon}>
                        <Popup>
                            <div style={{ color: '#000', fontSize: '12px' }}>
                                <strong>🚢 Destination: {destLabel}</strong>
                                <br />
                                Port of Discharge: {portOfDischarge}
                                {congestionIndex > 0 && (
                                    <>
                                        <br />
                                        Congestion: {congestionIndex}%
                                    </>
                                )}
                            </div>
                        </Popup>
                    </Marker>

                    {/* Shipping Route Line */}
                    <Polyline
                        positions={routePath}
                        pathOptions={{
                            color: routeColor,
                            weight: 3,
                            opacity: 0.8,
                            dashArray: '10, 6',
                        }}
                    />
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
