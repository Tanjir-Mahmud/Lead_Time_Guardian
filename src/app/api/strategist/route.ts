/**
 * POST /api/strategist
 * Risk & Opportunity Report API — Lead-Time Guardian Trade Strategist
 * 
 * Request: { origin_country, destination_country, port_of_loading, port_of_discharge,
 *            sector, fob_value_usd, uses_destination_raw_materials, shipment_mode }
 * Response: RiskOpportunityReport JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateRiskOpportunityReport, ShipmentInput, IndustrySector } from '@/lib/trade-strategist';

export async function POST(req: NextRequest) {
    try {
        // Auth check
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Validate and normalize input
        const validSectors: IndustrySector[] = ['Garments', 'Electronics', 'Perishables', 'Chemicals', 'Automotive', 'General'];
        const sector = validSectors.includes(body.sector) ? body.sector : 'General';

        const input: ShipmentInput = {
            origin_country: body.origin_country || 'Bangladesh',
            destination_country: body.destination_country || 'USA',
            port_of_loading: body.port_of_loading || 'Chittagong',
            port_of_discharge: body.port_of_discharge || 'Los Angeles',
            sector,
            fob_value_usd: Number(body.fob_value_usd) || 10000,
            uses_destination_raw_materials: Boolean(body.uses_destination_raw_materials),
            hs_code: body.hs_code,
            weight_kg: body.weight_kg ? Number(body.weight_kg) : undefined,
            shipment_mode: body.shipment_mode || 'Sea',
        };

        // Generate report
        const report = generateRiskOpportunityReport(input);

        return NextResponse.json({
            success: true,
            report,
        });

    } catch (error) {
        console.error('[Strategist API] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: `Risk & Opportunity Report failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}
