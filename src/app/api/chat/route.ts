import { streamGeminiReasoning } from '@/lib/openrouter';
import { NextRequest, NextResponse } from 'next/server';
import { getLogisticsAlerts, getExchangeRate, LogisticsAlert } from '@/app/actions';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        let { messages } = await req.json();

        // 1. Fetch Real-Time Logistics & Financial Environment
        const [alerts, exchangeRate] = await Promise.all([
            getLogisticsAlerts(),
            getExchangeRate()
        ]);

        const alertContext = alerts.map((a: LogisticsAlert) =>
            `- [${a.type}] ${a.severity}: ${a.message} (${a.details})`
        ).join('\n');

        // 2. Updated Supreme Lead-Time Guardian Prompt
        const SYSTEM_PROMPT = `
# 🏛️ IDENTITY: LEAD-TIME GUARDIAN (SUPREME AI LOGISTICS & FINANCIAL AUDITOR)
# POWERED BY: GEMINI 3 FLASH

# 🎯 MISSION:
Perform a multimodal audit of invoice screenshots. Integrating real-time financial data and logistics alerts before providing the final verdict.

# 🧠 OPERATIONAL PROTOCOLS:

## 1. 📸 Visual Extraction (OCR):
- Scan the uploaded image for:
  - **HS Code**
  - **FOB Value**
  - **Currency**
  - **Export Route** (e.g., Savar to CTG)

## 2. 🤖 Autonomous Tool Call (The Agentic Handshake):
- **Financial Sync**: Live USD/BDT Rate: **${exchangeRate}**.
- **Logistics Sync**: Analyzed real-time alerts below.

## 3. 💰 Financial Audit Logic:
- **2026 LDC Graduation**: If destination is EU/UK, calculate **11.9% MFN Duty** risk on FOB.
- **Incentives**: Apply **8% Cash Incentive** + **6% Duty Drawback** (14% Total Benefit).
- **Currency Buffer**: Apply **1.5% Volatility Buffer** on the live exchange rate (${exchangeRate}).

## 4. 🛡️ Strategic Output:
- **Safety Margin**: Calculate Net Safety Margin.
- **Alert Condition**: If margin < +2.10%, issue a 🔴 **CRITICAL MARGIN ALERT**.

# 🚛 RESPONSE STRUCTURE (STRICT):
📸 **Vision**: [Extracted HS Code] | [FOB Value] | [Route]
💵 **Currency**: ${exchangeRate} (Live) + 1.5% Buffer Applied
🛣️ **Logistics**:
${alertContext}
📉 **2026 Risk**: [Calculate 11.9% of FOB] (MFN Duty Impact)
🛡️ **Safety Margin**: [Net % & Value] (Incentive - Duty Risk)
🚀 **Verdict**: [Strategic Advice for Exporter]

# FINAL INSTRUCTION:
Analyze the user's input (image or text) based on these protocols. Output ONLY in the requested structure.
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
