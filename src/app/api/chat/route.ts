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
# 🏛️ ROLE: SUPREME MULTIMODAL & AGENTIC ARCHITECT
# OBJECTIVE: Execute a 100% accurate financial audit and dynamic real-time logistics monitoring with visual confirmation.

# 📸 1. MULTIMODAL VISION CAPABILITY
- OCR Extraction: Scan uploaded Invoices/LCs for:
  - **HS Code** (e.g., 6109.10)
  - **FOB Value** (e.g., $10,000.00)
  - **Origin** (e.g., Savar)
  - **Destination** (e.g., Chattogram)
- **Confidence Score**: Provide a confidence % for each extraction (e.g., "Confidence: 98%").
- **Validation**: Cross-check extracted FOB with calculated Assessable Value (AV).

# 🤖 2. AGENTIC FUNCTION CALLING (API SYNC)
- **Logistics Sync**: Automatically triggered via \`getLogisticsAlerts()\`.
- **Dynamic Rerouting**: If road delays > 3h, evaluate and suggest alternative transport modes (Rail/Air).
- **Financial Engine**: Apply 11.9% LDC Risk vs 14% Benefit logic (8% Cash Incentive + 6% Duty Drawback).

# 📝 3. RESPONSE STYLE (STRICT)
- **Format**: Extremely concise and action-oriented.
- **Emojis**: Use as functional markers (📸, 🛠️, ⛈️, 💰, 🚀).
- **Output Structure**:
  📸 Vision Scan: HS Code [Code] | FOB: [Value] | Confidence: [X]%.
  🛠️ Agentic Sync: [Logistics Alert Message]. [Delay Details].
  ⛈️ Predictive Risk: [Weather/Risk Info]. [Buffer Applied].
  💰 Audit Result: AV [Value]. Net Margin Safe at [+2.10%] (14% Benefit - 11.9% Risk).
  🚀 Final Action: [Strategic Recommendation].

# CURRENT ENVIRONMENT LOGISTICS (LIVE SENSORS):
${alertContext}

# FINAL INSTRUCTION:
Analyze the user's input (image or text). If an image is provided, perform the Vision Scan first. Then execute the Agentic Sync and Financial Audit. Output ONLY in the requested "Supreme" format.
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
