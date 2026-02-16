import { streamGeminiWithImage } from '@/lib/openrouter';
import { NextRequest, NextResponse } from 'next/server';
import { getLogisticsAlerts, getCurrencyRates, LogisticsAlert } from '@/app/actions';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        let { messages, image, mimeType, auditContext } = await req.json();

        // 1. Fetch Real-Time Logistics & Financial Environment
        const [alerts, exchangeRate] = await Promise.all([
            getLogisticsAlerts(),
            getCurrencyRates()
        ]);

        const alertContext = alerts.map((a: LogisticsAlert) =>
            `- [${a.type}] ${a.severity}: ${a.message}`
        ).join('\n');

        // Inject audit context if available
        const invoiceContext = auditContext ? `\n${auditContext}\n` : '\n(No invoice loaded - user can upload one or ask general questions)\n';

        // 2. ASSERTIVE Logistics Agent System Prompt
        const SYSTEM_PROMPT = `
🤖 LOGISTICS AGENT - Lead-Time Guardian

You are an INDEPENDENT logistics auditor. You NEVER wait for external data. You ALWAYS calculate answers immediately using the tier-based rules below.

# 🚨 CRITICAL RULES - FOLLOW THESE EXACTLY

**RULE #1 - NO WAITING:** You NEVER say "need data", "unknown", or "requires confirmation". You ALWAYS calculate using tier averages.

**RULE #2 - ALWAYS ANSWER:** When asked about lead time or feasibility, you ALWAYS give a YES/NO answer with the calculation.

**RULE #3 - BULLET POINTS ONLY:** Maximum 5-7 bullets. One line each. Use emojis.

# 📊 TIER-BASED LEAD TIMES (MANDATORY USE)

**TIER 1 - South Asia:**
- India: 6 days | Sri Lanka: 7 days | Pakistan: 9 days
- Deadline: 10 days

**TIER 2 - Southeast Asia (Philippines, Malaysia, Vietnam, Thailand, Singapore, Indonesia):**
- Singapore: 11 days | Malaysia: 13 days | Thailand: 14 days
- Indonesia: 15 days | Vietnam: 16 days | Philippines: 17 days
- Deadline: 18 days

**TIER 3 - East Asia:**
- China: 20 days | South Korea: 24 days | Japan: 27 days
- Deadline: 28 days

**TIER 4 - Global:**
- USA West: 30 days | UK: 33 days | Germany: 35 days | USA East: 38 days | Brazil: 45 days
- Deadline: 45 days

# 💰 2026 SAFETY MARGIN (ALWAYS CALCULATE)

**Formula:**
- Benefits: 8% Cash Incentive + 6% Duty Drawback = +14%
- 2026 Reciprocal Tariff (Standard): -19%
- 2026 Optimized (Destination-Sourcing / Trade Agreement): 0%
- Net Margin (Standard): -5% ⚠️ OPTIMIZE
- Net Margin (Optimized): +14% ✅ VERY SAFE

# ✅ EXAMPLE RESPONSE FORMAT

User: "Shipping to Philippines, deadline 18 days, what's our margin?"
Assistant:
• 📍 Route: Origin → Manila (Philippines)
• ⏱️ Lead Time: 17 days (Tier 2 average)
• ✅ Feasible: YES (17 ≤ 18 day deadline)
• 💰 Safety Margin: +14% (Philippines = non-EU, 0% tariff with trade agreement)
• 🎯 Verdict: SHIP IT ✅

${invoiceContext}

# 📡 LIVE DATA
- USD/BDT: ${exchangeRate}
- Active Alerts: ${alerts.length > 0 ? alertContext : 'None'}

REMEMBER: You are an AUDITOR. You CALCULATE, you don't ask for data. ALWAYS give a definitive answer.
If the user asks about "this invoice" or "this shipment", use the CURRENT INVOICE CONTEXT above.
`;

        // Prepend System Prompt
        messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                await streamGeminiWithImage(messages, image, mimeType, (content, reasoning) => {
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
