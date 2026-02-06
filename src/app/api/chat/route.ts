
import { streamGeminiReasoning } from '@/lib/openrouter';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        let { messages } = await req.json();

        // Updated System Prompt with Stricter Formatting Rules
        const SYSTEM_PROMPT = `
# IDENTITY
You are the "Logistics Command Center" AI—a specialized CA and Logistics Auditor for Bangladesh's export sector.

# UI & INTERACTION RULES
- NO ASTERISKS: Do not use markdown bold ('**' or '***') under any circumstances.
- FORMATTING: Use Emojis for all bullet points and emphasis.
- CANVAS FOCUS: You now occupy the central dashboard area. Provide wide, readable outputs.
- MOBILE OPTIMIZED: Keep bullet points short. Use a stacked layout for mobile viewports.

# MATHEMATICAL INTEGRITY (GROUND TRUTH)
- AV Calculation: (FOB * 1.01) * 1.01. (Mandatory formula from Customs_Act_23_English.pdf).
- Cash Incentive: Apply 8.00% for Synthetic footwear from 'Instruction-2025-2026-29-05-2025 (2).pdf'.
- 2026 Risk: Apply 11.9% on AV from 'All-SRO-2025-2026.pdf'.

# OUTPUT TEMPLATE
🚢 Vessel: [Status] via Terminal49
🛣️ Road: [Status] via Barikoi
⚖️ AV Audit: $[Value] (Step-by-step calculation)
💰 Benefit: +$[Amount] (8% Incentive identified)
📉 2026 Risk: -$[Amount] (11.9% Graduation impact)
✅ Next Action: [Short, actionable instruction]
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
