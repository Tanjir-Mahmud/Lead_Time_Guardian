/**
 * POST /api/guardian
 * Global Guardian Report API — Powered by You.com + Gemini
 * 
 * Request: { origin: string, destination: string, sector: string, fobValue: number }
 * Response: GlobalGuardianReport JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateGlobalGuardianReport } from '@/lib/global-guardian';

export async function POST(req: NextRequest) {
    try {
        // Auth check
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            origin = 'Bangladesh',
            destination = 'European Union',
            sector = 'Textile',
            fobValue = 10000,
        } = body;

        // Generate report
        const report = await generateGlobalGuardianReport(
            origin,
            destination,
            sector,
            Number(fobValue) || 10000
        );

        return NextResponse.json({
            success: true,
            report,
            generated_at: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[Guardian API] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: `Guardian Report failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}
