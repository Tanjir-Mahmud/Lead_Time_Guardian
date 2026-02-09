import { NextRequest, NextResponse } from 'next/server';
import { MAJOR_PORTS, calculateDistance, calculateETA } from '@/lib/vessel-utils';

/**
 * Vessel Tracking API Route
 * 
 * Priority:
 * 1. AISStream.io (Real-time WebSocket - FREE)
 * 2. Static Calculation (Fallback - Always works)
 * 
 * Usage: 
 *   GET /api/vessel-tracking?mmsi=477164400
 *   GET /api/vessel-tracking?destination=Philippines
 */

const CHATTOGRAM_PORT = {
    latitude: 22.3384,
    longitude: 91.8317
};

// AISStream.io WebSocket endpoint
const AISSTREAM_WS_URL = 'wss://stream.aisstream.io/v0/stream';

interface VesselPosition {
    mmsi: string;
    name?: string;
    latitude: number;
    longitude: number;
    speed: number;
    heading?: number;
    timestamp: string;
    provider: string;
}

// Fetch real-time vessel data from AISStream.io via WebSocket
async function fetchFromAISStream(mmsi: string): Promise<VesselPosition | null> {
    const apiKey = process.env.AISSTREAM_API_KEY;

    if (!apiKey) {
        console.log('[AISSTREAM] No API key configured');
        return null;
    }

    return new Promise((resolve) => {
        try {
            // Dynamic import for WebSocket (server-side)
            const WebSocket = require('ws');
            const ws = new WebSocket(AISSTREAM_WS_URL);

            let resolved = false;

            ws.on('open', () => {
                console.log('[AISSTREAM] WebSocket connected, subscribing to MMSI:', mmsi);

                const subscriptionMessage = {
                    APIKey: apiKey,
                    BoundingBoxes: [[[-180, -90], [180, 90]]], // World-wide
                    FiltersShipMMSI: [mmsi],
                    FilterMessageTypes: ["PositionReport"]
                };

                ws.send(JSON.stringify(subscriptionMessage));
            });

            ws.on('message', (data: Buffer) => {
                if (resolved) return;

                try {
                    const message = JSON.parse(data.toString());

                    if (message.MessageType === 'PositionReport') {
                        const posReport = message.Message?.PositionReport;
                        const metaData = message.MetaData;

                        if (posReport) {
                            resolved = true;
                            ws.close();

                            resolve({
                                mmsi: metaData?.MMSI?.toString() || mmsi,
                                name: metaData?.ShipName || 'Unknown Vessel',
                                latitude: posReport.Latitude,
                                longitude: posReport.Longitude,
                                speed: posReport.Sog || 0, // Speed Over Ground
                                heading: posReport.TrueHeading,
                                timestamp: metaData?.time_utc || new Date().toISOString(),
                                provider: 'AISStream.io'
                            });
                        }
                    }
                } catch (e) {
                    console.log('[AISSTREAM] Parse error:', e);
                }
            });

            ws.on('error', (error: Error) => {
                console.log('[AISSTREAM] WebSocket error:', error.message);
                if (!resolved) {
                    resolved = true;
                    resolve(null);
                }
            });

            ws.on('close', () => {
                if (!resolved) {
                    resolved = true;
                    resolve(null);
                }
            });

            // Timeout after 8 seconds
            setTimeout(() => {
                if (!resolved) {
                    console.log('[AISSTREAM] Timeout - vessel may not be broadcasting');
                    resolved = true;
                    ws.close();
                    resolve(null);
                }
            }, 8000);

        } catch (error) {
            console.log('[AISSTREAM] Connection error:', error);
            resolve(null);
        }
    });
}

// Static calculation fallback
function calculateStaticETA(destination: string, vesselSpeed: number = 15) {
    const destLower = destination?.toLowerCase() || '';
    let destPort = null;

    // Match destination to port
    for (const [key, port] of Object.entries(MAJOR_PORTS)) {
        if (destLower.includes(key.toLowerCase()) ||
            port.name.toLowerCase().includes(destLower)) {
            destPort = port;
            break;
        }
    }

    // Country-based fallbacks
    if (!destPort) {
        if (destLower.includes('india')) destPort = MAJOR_PORTS.Mumbai;
        else if (destLower.includes('china')) destPort = MAJOR_PORTS.Shanghai;
        else if (destLower.includes('brazil')) destPort = MAJOR_PORTS.Santos;
        else if (destLower.includes('germany')) destPort = MAJOR_PORTS.Hamburg;
        else if (destLower.includes('philippines') || destLower.includes('manila')) destPort = MAJOR_PORTS.Manila;
        else if (destLower.includes('indonesia') || destLower.includes('jakarta')) destPort = MAJOR_PORTS.Jakarta;
        else if (destLower.includes('malaysia')) destPort = MAJOR_PORTS.PortKlang;
        else if (destLower.includes('singapore')) destPort = MAJOR_PORTS.Singapore;
    }

    if (!destPort) {
        return null;
    }

    const distanceKm = calculateDistance(
        CHATTOGRAM_PORT.latitude,
        CHATTOGRAM_PORT.longitude,
        destPort.latitude,
        destPort.longitude
    );

    const etaDays = calculateETA(
        CHATTOGRAM_PORT.latitude,
        CHATTOGRAM_PORT.longitude,
        destPort.latitude,
        destPort.longitude,
        vesselSpeed
    );

    return {
        mode: 'static_calculation',
        origin: 'Chattogram Port, Bangladesh',
        destination: destPort.name,
        destination_coordinates: {
            latitude: destPort.latitude,
            longitude: destPort.longitude
        },
        distance_km: Math.round(distanceKm),
        distance_nautical_miles: Math.round(distanceKm * 0.539957),
        vessel_speed_knots: vesselSpeed,
        estimated_lead_time_days: etaDays,
        calculated_at: new Date().toISOString(),
        provider: 'Static Calculation'
    };
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const mmsi = searchParams.get('mmsi');
    const destination = searchParams.get('destination');

    console.log('[VESSEL TRACKING] Request:', { mmsi, destination });

    // If MMSI provided, try real-time tracking first
    if (mmsi) {
        console.log('[VESSEL TRACKING] Attempting real-time tracking for MMSI:', mmsi);

        const vesselData = await fetchFromAISStream(mmsi);

        if (vesselData) {
            console.log('[VESSEL TRACKING] Real-time data received:', vesselData.name);

            return NextResponse.json({
                success: true,
                mode: 'realtime',
                vessel: vesselData
            });
        }

        console.log('[VESSEL TRACKING] Real-time failed, using static fallback');
    }

    // Static calculation fallback
    if (destination) {
        const staticData = calculateStaticETA(destination);

        if (staticData) {
            return NextResponse.json({
                success: true,
                mode: 'static',
                vessel: staticData
            });
        }

        return NextResponse.json({
            error: 'Destination port not found',
            message: `Could not find port for: ${destination}`,
            availablePorts: Object.keys(MAJOR_PORTS)
        }, { status: 404 });
    }

    return NextResponse.json({
        error: 'Missing parameters',
        usage: {
            realtime: 'GET /api/vessel-tracking?mmsi=477164400',
            static: 'GET /api/vessel-tracking?destination=Philippines'
        },
        examples: [
            '/api/vessel-tracking?mmsi=477164400',
            '/api/vessel-tracking?destination=India',
            '/api/vessel-tracking?destination=Philippines'
        ]
    }, { status: 400 });
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { mmsi, destination, vesselSpeed } = body;

    // Reuse GET logic
    const url = new URL(req.url);
    if (mmsi) url.searchParams.set('mmsi', mmsi);
    if (destination) url.searchParams.set('destination', destination);

    return GET(new NextRequest(url));
}
