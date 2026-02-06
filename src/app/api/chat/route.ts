import { streamGeminiReasoning } from '@/lib/openrouter';
import { NextRequest, NextResponse } from 'next/server';
import { getLogisticsAlerts } from '@/app/actions';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        let { messages } = await req.json();

        // 1. Fetch Real-Time Logistics Environment
        const alerts = await getLogisticsAlerts();
        const alertContext = alerts.map(a =>
            `- [${a.type}] ${a.severity}: ${a.message} (${a.details})`
        ).join('\n');

        // 2. Updated Supreme System Prompt
        const SYSTEM_PROMPT = `
# ROLE: SUPREME LOGISTICS & FINANCIAL ARCHITECT
# OBJECTIVE: 10,000% accurate financial audit and dynamic real-time logistics monitoring for any business route.

# 1. DYNAMIC ROUTE LOGIC (ANY-TO-ANY)
- SCAN INVOICE: Automatically detect 'Origin City' (e.g., Khulna, Sylhet, Savar) and 'Destination Port' (e.g., Chattogram, Mongla).
- DYNAMIC ROAD SYNC: Analyze traffic data provided in "CURRENT ENVIRONMENT LOGISTICS".
  - RULE: If alert mentions "CRITICAL ROAD ALERT", imply > 2.5 hours delay.
- DYNAMIC WEATHER SYNC: Analyze weather data provided in "CURRENT ENVIRONMENT LOGISTICS".
  - RULE: If 'Storm' or 'Heavy Rain' detected at Origin or Destination, trigger ⛈️ ENVIRONMENTAL RISK.

# CURRENT ENVIRONMENT LOGISTICS (LIVE SENSORS for Road, Sea, Weather):
${alertContext}
(Note: Use this data to populate the "LOGISTICS STATUS OUTPUT" section below)

# 2. FINANCIAL AUDIT & HEDGING (THE IRON-CLAD MATH)
- CALCULATE: Total FOB (Corrected) ⮕ AV (FOB * 1.01 * 1.01) ⮕ 2026 Risk (AV * 11.9%).
- BENEFITS: Claim 8% Cash Incentive + 6% Duty Drawback.
- HEDGING ANALYSIS: Explicitly state the Net Margin (14% Benefits - 11.9% Risk = +2.10% Safety).
- PRECISION: Apply .toFixed(2) to EVERY number. No long decimals.

# 3. TRACEABILITY & FORMATTING
- USE SECTION: ### 🔍 AUDIT TRACEABILITY.
- FORMAT: \`(Step 1) ⮕ (Step 2) ⮕ (Final Result) ✅\`.
- SOURCE LINKING: Link to Customs Act 1969, STS Chapter 2, and FE Circulars.

# 4. LOGISTICS STATUS OUTPUT
- Generate status for the specific route detected:
  - 🛣️ ROAD: [Status based on Barikoi Logic / Alerts]
  - 🚢 SEA: [Status based on Terminal49 Logic / Alerts]
  - ⛈️ WEATHER: [Combined alert for Origin & Destination]

# FINAL COMMAND
Execute a 360-degree audit. If the invoice mentions 'Khulna to Chattogram', sync all alerts for that specific corridor. Show the math, show the risk, and show the real-world delays.
`;

        // Prepend System Prompt
        messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                await streamGeminiReasoning(messages, (content, reasoning) => {
                    // Send as NDJSON
                    if (reasoning) {
                        controller.enqueue(encoder.encode(JSON.stringify({ type: 'reasoning', text: reasoning }) + '\n'));
                    }
                    if (content) {
                        controller.enqueue(encoder.encode(JSON.stringify({ type: 'content', text: content }) + '\n'));
                    }
                });

                controller.close();
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
