
'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

import { Icon } from 'leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icons in Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

const factoryIcon = new Icon({
    iconUrl: iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

const portIcon = new Icon({
    iconUrl: iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

// Bangladesh City Coordinates
const CITY_COORDINATES: Record<string, [number, number]> = {
    'dhaka': [23.8103, 90.4125],
    'gazipur': [24.0022, 90.4264],
    'mymensingh': [24.7471, 90.4203],
    'narayanganj': [23.6238, 90.5000],
    'chittagong': [22.3569, 91.7832],
    'chattogram': [22.3569, 91.7832],
    'sylhet': [24.8949, 91.8687],
    'rajshahi': [24.3745, 88.6042],
    'khulna': [22.8456, 89.5403],
    'comilla': [23.4607, 91.1809],
    'tongi': [23.9322, 90.4014],
    'bogra': [24.8465, 89.3773],
    'rangpur': [25.7439, 89.2752],
    'barisal': [22.7010, 90.3535],
    'savar': [23.8583, 90.2667],
    'ashulia': [23.9000, 90.3167],
};

// Default positions
const DEFAULT_FACTORY_POS: [number, number] = [23.8103, 90.4125]; // Dhaka
const PORT_POS: [number, number] = [22.3569, 91.7832]; // Chattogram

// Get coordinates from city name
function getCityCoordinates(cityName: string): [number, number] {
    if (!cityName) return DEFAULT_FACTORY_POS;

    const normalized = cityName.toLowerCase().trim();

    // Check for exact match
    if (CITY_COORDINATES[normalized]) {
        return CITY_COORDINATES[normalized];
    }

    // Check for partial match
    for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return coords;
        }
    }

    return DEFAULT_FACTORY_POS;
}

interface RoutingControlProps {
    originPos: [number, number];
}

function RoutingControl({ originPos }: RoutingControlProps) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        let routingControl: any = null;
        let isMounted = true;

        const initRouting = async () => {
            try {
                const L = await import('leaflet');
                await import('leaflet-routing-machine');

                if (!isMounted || !map) return;

                // @ts-ignore
                routingControl = L.Routing.control({
                    waypoints: [
                        L.latLng(originPos[0], originPos[1]),
                        L.latLng(PORT_POS[0], PORT_POS[1])
                    ],
                    routeWhileDragging: false,
                    show: false,
                    addWaypoints: false,
                    fitSelectedRoutes: true,
                    lineOptions: {
                        styles: [{ color: '#AA9568', opacity: 0.8, weight: 6 }],
                        extendToWaypoints: false,
                        missingRouteTolerance: 0
                    },
                    createMarker: function () { return null; }
                } as any);

                if (routingControl && map) {
                    routingControl.addTo(map);
                }
            } catch (e) {
                console.error('Failed to load routing machine', e);
            }
        };

        initRouting();

        return () => {
            isMounted = false;
            if (routingControl && map) {
                try {
                    if (routingControl._map) {
                        map.removeControl(routingControl);
                    }
                } catch (e) {
                    console.debug('Map control cleanup skipped', e);
                }
            }
        };

    }, [map, originPos]);

    return null;
}

interface SmartMapProps {
    originCity?: string;
}

export default function SmartMap({ originCity }: SmartMapProps) {
    const originPos = getCityCoordinates(originCity || '');
    const originLabel = originCity || 'Factory (Dhaka)';

    // Calculate center between origin and port
    const centerLat = (originPos[0] + PORT_POS[0]) / 2;
    const centerLng = (originPos[1] + PORT_POS[1]) / 2;

    return (
        <div className="h-[400px] w-full rounded-xl overflow-hidden border border-gold/20 shadow-2xl relative z-0">
            <MapContainer
                center={[centerLat, centerLng]}
                zoom={7}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <Marker position={originPos} icon={factoryIcon}>
                    <Popup>{originLabel}</Popup>
                </Marker>

                <Marker position={PORT_POS} icon={portIcon}>
                    <Popup>Chattogram Port</Popup>
                </Marker>

                <RoutingControl originPos={originPos} />
            </MapContainer>

            <div className="absolute top-4 right-4 z-[400] bg-navy/80 backdrop-blur border border-gold/20 p-2 rounded text-xs text-gold">
                AI Route Optimized
            </div>
        </div>
    );
}
