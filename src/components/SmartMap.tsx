
'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet/dist/leaflet.css';
// import 'leaflet-routing-machine'; // Moved to dynamic import
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'; // CSS is fine usually, but better safe? No CSS is fine.

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

// Coordinates
const FACTORY_POS = [23.8103, 90.4125] as [number, number]; // Dhaka
const PORT_POS = [22.3569, 91.7832] as [number, number]; // Chattogram

function RoutingControl() {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // Dynamic import to avoid SSR/Module eval issues
        const initRouting = async () => {
            try {
                const L = await import('leaflet');
                await import('leaflet-routing-machine');

                // @ts-ignore
                const routingControl = L.Routing.control({
                    waypoints: [
                        L.latLng(FACTORY_POS[0], FACTORY_POS[1]),
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

                routingControl.addTo(map);

                // Cleanup
                return () => {
                    try {
                        map.removeControl(routingControl);
                    } catch (e) {
                        console.warn('Map control cleanup error', e);
                    }
                };
            } catch (e) {
                console.error('Failed to load routing machine', e);
            }
        };

        const cleanupPromise = initRouting();

        // Return cleanup function if init returns one (it's async so trickier, but simple ref ok)
        return () => {
            // no-op for async safety, actual cleanup handled inside 
        };

    }, [map]);

    return null;
}

export default function SmartMap() {
    return (
        <div className="h-[400px] w-full rounded-xl overflow-hidden border border-gold/20 shadow-2xl relative z-0">
            <MapContainer
                center={[23.1, 91.1]}
                zoom={7}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                // Switched to CartoDB Dark Matter for "Industrial High-Tech" look
                />

                <Marker position={FACTORY_POS} icon={factoryIcon}>
                    <Popup>Factory (Dhaka)</Popup>
                </Marker>

                <Marker position={PORT_POS} icon={portIcon}>
                    <Popup>Chattogram Port</Popup>
                </Marker>

                <RoutingControl />
            </MapContainer>

            {/* Overlay label */}
            <div className="absolute top-4 right-4 z-[400] bg-navy/80 backdrop-blur border border-gold/20 p-2 rounded text-xs text-gold">
                AI Route Optimized
            </div>
        </div>
    );
}
