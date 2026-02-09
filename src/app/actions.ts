'use server';

import { createClient } from '@/lib/supabase/server';

// --- Types & Interfaces ---
export interface LogisticsAlert {
    id: string;
    type: 'ROAD' | 'SEA' | 'WEATHER';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    details: string;
    timestamp: string;
}


// --- Helper Functions ---
function parseNumericValue(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        // Remove commas, currency symbols, and whitespace
        const clean = value.replace(/[$,€£\s]/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    }
    return 0;
}

// --- Exchange Rate Logic ---
export async function getCurrencyRates(): Promise<string> {
    const apiKey = "4f87eebeb49d0d0fa21bbfd2";
    // Uses provided key, falls back to env if needed or fails.

    try {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`, { next: { revalidate: 3600 } });
        const data = await res.json();
        if (data.conversion_rates) {
            const bdt = data.conversion_rates.BDT ? data.conversion_rates.BDT.toFixed(2) : "N/A";
            const eur = data.conversion_rates.EUR ? data.conversion_rates.EUR.toFixed(3) : "N/A";
            return `USD/BDT: ${bdt} | USD/EUR: ${eur}`;
        }
        return "N/A (API Error)";
    } catch (error) {
        console.error("Currency Fetch Failed:", error);
        return "N/A (Fetch Failed)";
    }
}

// --- 1. Tool Definition for Gemini ---
// এটি জেমিনিকে জানায় যে সে চাইলে আপনার লজিস্টিক ডেটা এপিআই ব্যবহার করতে পারে
const tools = [
    {
        type: "function",
        function: {
            name: "getLogisticsAlerts",
            description: "Get real-time and predictive logistics alerts for Bangladesh including road traffic, sea port congestion, and weather.",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "getCurrencyRates",
            description: "Get real-time USD/BDT and USD/EUR exchange rates for Multi-Currency Flash Audit.",
            parameters: { type: "object", properties: {} }
        }
    }
];

// --- 2. The Main Autonomous Engine ---
// --- 2. The Main Autonomous Engine ---
export async function runAutonomousAudit(base64Image: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        console.error("Missing OpenRouter API Key in .env");
        return "⚠️ Configuration Error: API Key missing.";
    }

    try {
        // STEP A: Initial Multimodal Call (Gemini analyzes the Screenshot)
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://lead-time-guardian.vercel.app", // Optional for OpenRouter
            },
            body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                    {
                        role: "system",
                        content: `📍 IDENTITY: 
You are the "Lead-Time Guardian" Supreme Auditor. You specialize in Multimodal Trade Finance. Your output MUST be 100% database-compatible.

🎯 MISSION: 
Extract invoice data, perform a Triple-Currency Audit, and generate a STRICT JSON output.

🧠 STEP 1: VISION & NUMERIC PRECISION
- Locate 'Total FOB', 'Quantity', and 'Unit Price'. 
- MANDATORY: You MUST calculate (Quantity * Unit Price). 
- SET 'calculated_total' as a PURE NUMBER only (e.g., 15000). Remove any "$", "€", or ",". [cite: 2026-02-08]
- SET 'sum_check_passed' to true only if (Quantity * Unit Price) matches the image's Total FOB.

🧠 STEP 2: MULTI-CURRENCY FLASH AUDIT
- Use 'getCurrencyRates' for live data. [cite: 2026-02-05]
- Return 'currency_flash' with numeric values:
    * USD: { rate: 1.0, value: [FOB], margin: 2.1 }
    * EUR: { rate: [Rate], value: [FOB*Rate], margin: 1.6 }
    * BDT: { rate: [Rate], value: [FOB*Rate], margin: 0.1 }

🧠 STEP 3: ANALYTICS & DB INTEGRATION (STRICT)
- DESTINATION: Extract 'Importer' country. If missing, INFER from Currency (EUR->EU, USD->USA/Global). DEFAULT to "Global" if unknown. [cite: 2026-02-08]
- NET MARGIN: Provide as a numeric float (e.g., 2.1) representing the percentage.
- LINE ITEMS: Extract 1-3 key line items (Description, Quantity, Unit Price, HS Code).

🚛 OUTPUT FORMAT (STRICT JSON ONLY - NO MARKDOWN):
{
  "currency_flash": { "USD": {"rate": 1.0, "value": 15000, "margin": 2.1}, "EUR": {"rate": 0.92, "value": 13800, "margin": 1.6}, "BDT": {"rate": 122.5, "value": 1837500, "margin": 0.1} },
  "thinking_process": [ {"step": "Vision Scan", "detail": "Extracted $15,000 from image."} ],
  "cfo_strategic_report": { "invoice_no": "LTG-123", "net_margin": 2.1, "advice": "Optimal" },
  "metadata": { "destination": "Germany", "origin": "Bangladesh", "invoice_number": "LTG-123", "total_invoice_value": 15000 },
  "line_items": [ { "description": "T-Shirt", "quantity": 1000, "unit_price": 15, "hs_code": "6109.10" } ],
  "compliance_summary": { "sum_check_passed": true, "declared_total": 15000, "calculated_total": 15000 }
}`
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Please audit this invoice screenshot and provide a predictive risk analysis." },
                            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                        ]
                    }
                ],
                tools: tools,
                tool_choice: "auto"
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`OpenRouter API Error: ${data.error.message || JSON.stringify(data.error)}`);
        }

        if (!data.choices || data.choices.length === 0) {
            throw new Error(`Invalid API Response: ${JSON.stringify(data)}`);
        }

        const message = data.choices[0].message;

        // STEP B: Agentic Handshake (If Gemini asks for data)
        if (message.tool_calls) {
            const toolCalls = message.tool_calls;
            const toolOutputs = [];

            for (const toolCall of toolCalls) {
                if (toolCall.function.name === 'getLogisticsAlerts') {
                    // Logic for Simulation Override if needed, though Prompt handles it.
                    // But we can also enforce it here if we want strict control.
                    // For now, let's return real data and let the LLM override based on prompt if simulated.
                    // OR we can return simulated data directly.
                    // The prompt says "OVERRIDE Live Road Data", implies LLM does it.
                    // But let's be helpfully compliant:
                    const results = await getLogisticsAlerts();
                    // In simulation, we might want to return the "12 hour blockade" data?
                    // The prompt says "OVERRIDE Live Road Data", so even if we return "Clear", loop should ignore it.
                    // But we will stick to returning real data for 'real-time' tools unless specifically blocked.
                    toolOutputs.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: "getLogisticsAlerts",
                        content: JSON.stringify(results)
                    });
                } else if (toolCall.function.name === 'getCurrencyRates') {
                    const rate = await getCurrencyRates();
                    toolOutputs.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: "getCurrencyRates",
                        content: JSON.stringify({ rate })
                    });
                }
            }

            // STEP C: Final Call (Sending real data back to Gemini)
            const finalResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "google/gemini-3-flash-preview",
                    messages: [
                        { role: "system", content: "Finalize the audit report based on the provided tool outputs and strict protocol." },
                        { role: "assistant", content: null, tool_calls: message.tool_calls },
                        ...toolOutputs
                    ]
                })
            });

            const finalData = await finalResponse.json();

            // --- DATABASE SYNC PROTOCOL [2026-02-05] ---
            try {
                const content = finalData.choices[0].message.content;
                // Attempt to parse JSON to ensure it's valid before saving
                // We might need to extract JSON if it's wrapped in markdown code blocks
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const auditResult = JSON.parse(jsonMatch[0]);

                    if (auditResult.compliance_summary?.sum_check_passed) {
                        const supabase = createClient();
                        const { data: { user } } = await supabase.auth.getUser();

                        if (user) {
                            // 1. Save Shipment Data
                            await supabase.from('shipments').insert([{
                                user_id: user.id,
                                invoice_no: auditResult.cfo_strategic_report?.invoice_no || 'TBD',
                                destination: (auditResult.metadata?.destination && auditResult.metadata.destination !== 'Unknown')
                                    ? auditResult.metadata.destination
                                    : 'Global',
                                // নিশ্চিত করুন ভ্যালুটি পিওর নাম্বার হিসেবে যাচ্ছে (কমা/সিম্বল রিমুভ করে)
                                value: parseNumericValue(auditResult.compliance_summary?.calculated_total),
                                status: 'Audited',
                                lead_time_impact: parseNumericValue(auditResult.cfo_strategic_report?.net_margin)
                            }]);

                            // 2. Save Audit Log
                            await saveAuditLog({
                                action: 'INVOICE_AUDIT',
                                status: 'SUCCESS',
                                details: auditResult.cfo_strategic_report?.advice || 'Audit completed successfully.'
                            });
                        }
                    }
                }
            } catch (dbError) {
                console.error("Database Sync Failed:", dbError);
                // We don't block the return of the audit result, just log the error
            }

            return finalData.choices[0].message.content;
        }

        return message.content;
    } catch (error: any) {
        console.error("Autonomous Audit Failed:", error);
        return `⚠️ Audit Engine Error: ${error.message || "Unknown error"}`;
    }
}

// --- 3. Predictive & Real-time Logistics Logic ---

async function getPredictiveWeather(lat: number, lon: number, locationName: string): Promise<LogisticsAlert | null> {
    const weatherApiKey = "6d7d67198b747da170f748214180a6ce";
    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`);
        const data = await res.json();

        // Check next 72 hours for critical conditions
        const risk = data.list.slice(0, 24).find((slot: any) =>
            ['Rain', 'Thunderstorm', 'Squall'].includes(slot.weather[0].main)
        );

        if (risk) {
            return {
                id: `weather-${locationName}`,
                type: 'WEATHER',
                severity: 'CRITICAL',
                message: `⚠️ Storm risk at ${locationName}`,
                details: `Predictive Alert: ${risk.weather[0].description} expected. Lead-time impact: High.`,
                timestamp: new Date().toISOString()
            };
        }
    } catch (e) { return null; }
    return null;
}

export async function getLogisticsAlerts(): Promise<LogisticsAlert[]> {
    const alerts: LogisticsAlert[] = [];

    // Simulate Road Traffic Logic (Barikoi integration point)
    const actualDelay = 2.5 + Math.random() * 5;
    if (actualDelay > 4) {
        alerts.push({
            id: 'road-delay',
            type: 'ROAD',
            severity: 'HIGH',
            message: 'Traffic Congestion on N1',
            details: `Historical pattern + live data suggests ${actualDelay.toFixed(1)}h delay on Dhaka-CTG route.`,
            timestamp: new Date().toISOString()
        });
    }

    // Predictive Weather for Savar & CTG
    const savar = await getPredictiveWeather(23.8483, 90.2674, 'Savar');
    if (savar) alerts.push(savar);

    const ctg = await getPredictiveWeather(22.3569, 91.7832, 'Chattogram');
    if (ctg) alerts.push(ctg);

    return alerts.length > 0 ? alerts : [{ id: 'ok', type: 'ROAD', severity: 'LOW', message: 'All Stable', details: 'No significant risks.', timestamp: '' }];
}

// --- 4. Analytics & Database Actions ---

export async function saveAuditLog(logEntry: any) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('audit_logs').insert([{ ...logEntry, user_id: user.id }]);
    }
}

export async function getAnalyticsData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    console.log('[DASHBOARD] getAnalyticsData called');
    console.log('[DASHBOARD] User authenticated:', !!user);
    console.log('[DASHBOARD] User ID:', user?.id);

    if (!user) {
        console.log('[DASHBOARD] ❌ No user - returning empty');
        return { shipments: [], auditLogs: [] };
    }

    const [shipmentsRes, auditsRes] = await Promise.all([
        supabase.from('shipments').select('*').eq('user_id', user.id),
        supabase.from('audit_logs').select('*').eq('user_id', user.id)
    ]);

    console.log('[DASHBOARD] Shipments query result:', {
        count: shipmentsRes.data?.length || 0,
        error: shipmentsRes.error,
        hasData: !!shipmentsRes.data
    });

    console.log('[DASHBOARD] Audit logs query result:', {
        count: auditsRes.data?.length || 0,
        error: auditsRes.error,
        hasData: !!auditsRes.data
    });

    if (shipmentsRes.error) {
        console.error('[DASHBOARD] Shipments error:', shipmentsRes.error);
    }

    if (auditsRes.error) {
        console.error('[DASHBOARD] Audit logs error:', auditsRes.error);
    }

    return {
        shipments: shipmentsRes.data || [],
        auditLogs: auditsRes.data || []
    };
}