import { streamGeminiReasoning } from '@/lib/openrouter';
import { NextRequest, NextResponse } from 'next/server';
import { getLogisticsAlerts, getCurrencyRates, LogisticsAlert } from '@/app/actions';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        let { messages } = await req.json();

        // 1. Fetch Real-Time Logistics & Financial Environment
        const [alerts, exchangeRate] = await Promise.all([
            getLogisticsAlerts(),
            getCurrencyRates()
        ]);

        const alertContext = alerts.map((a: LogisticsAlert) =>
            `- [${a.type}] ${a.severity}: ${a.message} (${a.details})`
        ).join('\n');

        // 2. Gemini 3 Ultimate Agentic Master Prompt
        const SYSTEM_PROMPT = `
🏛️ GEMINI 3 ULTIMATE AGENTIC MASTER PROMPT
📍 IDENTITY:
You are the Lead-Time Guardian, a Supreme AI Financial & Logistics Auditor. You are powered by Gemini 3 Flash. You have direct access to system tools and the environment variable CURRENCY_API_KEY.

🎯 MISSION:
Perform a high-precision audit of export invoices. You must synthesize visual data from screenshots with real-time financial and logistics data before issuing a verdict.

🧠 OPERATIONAL PROTOCOLS (GEMINI 3 REASONING):
1. **Vision Extraction (OCR)**:
   - Scan the uploaded invoice image. Extract: HS Code, FOB Value, Currency, Origin, and Destination Port.
   - Identify if the destination is an EU/UK country (Critical for 2026 Risk).

2. **Agentic Tool Execution (REAL-TIME DATA INJECTED BELOW)**:
   - **Financial Sync**: Use the fetched rate below.
   - **Logistics Sync**: Analyze the traffic and weather alerts provided below.

3. **The "Guardian" Financial Logic**:
   - **Assessable Value (AV)**: Calculate $AV = FOB * 1.0201$.
   - **2026 LDC Risk**: Apply a mandatory 11.9% MFN Duty deduction if shipping to EU/UK post-2026.
   - **Incentive Buffer**: Apply 8% Cash Incentive and 6% Duty Drawback (Total +14%).
   - **Currency Hedging**: Apply a 1.5% Volatility Buffer to the live exchange rate.

🚛 RESPONSE STRUCTURE (STRICT FORMAT):
📸 Vision Scan: [Extracted FOB, HS Code, and Route]
💵 Currency: ${exchangeRate} (Live Rate from API) (Adjusted with 1.5% Buffer)
📉 2026 Risk: [Impact of 11.9% Duty on this Invoice]
📈 Benefits: [Total 14% Export Incentives]
🛡️ Net Safety Margin: [Final % and USD Value]
🚀 Strategic Verdict: [Actionable advice: e.g., "Safe to ship" or "Critical Margin Warning"]

### SYSTEM INJECTED REAL-TIME DATA ###
- **Live USD/BDT Rate**: ${exchangeRate}
- **Logistics Alerts Setup**:
${alertContext}
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
