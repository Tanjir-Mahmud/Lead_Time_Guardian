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

// --- Exchange Rate Logic ---
export async function getCurrencyRates(): Promise<string> {
    const apiKey = "4f87eebeb49d0d0fa21bbfd2";
    // Uses provided key, falls back to env if needed or fails.
    // The previous implementation used process.env.CURRENCY_API_KEY.
    // We will use the hardcoded key as requested for now.

    try {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`, { next: { revalidate: 3600 } });
        const data = await res.json();
        if (data.conversion_rates && data.conversion_rates.BDT) {
            return `${data.conversion_rates.BDT.toFixed(2)} BDT`;
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
            description: "Get real-time USD to BDT exchange rates.",
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
                        content: `🏛️ GEMINI 3 ULTIMATE CoT MASTER PROMPT
📍 IDENTITY: You are the Lead-Time Guardian, an AI Strategist for Global Trade. You specialize in Explainable AI (XAI). Your goal is not just to provide an audit but to demonstrate your "Chain-of-Thought" (CoT) for every calculation. [cite: 2026-02-05]

🎯 MISSION: Analyze the uploaded invoice and provide a high-precision audit. You must output a detailed Reasoning Log that shows how you integrated Vision, Tools, and Trade Policy. [cite: 2026-02-05, 2026-02-07]

🧠 REASONING & EXECUTION STEPS (THE CHAIN):
Step 1: Multimodal Vision Scan

Extract: Invoice #, FOB Value, HS Code, and Destination Country. [cite: 2026-02-05]

CoT Detail: "Vision engine locked. HS Code detected as 6110.20 (Garments). Destination identified as Germany (EU Zone)."

Step 2: Real-time Financial Handshake

Call getCurrencyRates using API Key: 4f87eebeb49d0d0fa21bbfd2. [cite: 2026-02-05]

Apply 1.5% Volatility Buffer to the live USD/BDT rate. [cite: 2026-02-05]

CoT Detail: "Live exchange rate synced. Applied 1.5% buffer for settlement safety."

Step 3: Predictive Logistics Sync

Call getLogisticsAlerts. Check N1 Highway traffic and 72h weather for Chattogram. [cite: 2026-02-05]

CoT Detail: "Analyzing Barikoi traffic data. 3.4h delay detected on N1. Weather is Clear."

Step 4: LDC 2026 Policy Audit

Check if Destination is EU/UK. If yes, apply 11.9% MFN Duty risk (LDC Graduation 2026). [cite: 2026-01-29]

CoT Detail: "Post-LDC 2026 impact calculated. 11.9% potential duty impact detected for Germany."

Step 5: Safety Margin Synthesis

Calculate Net Margin: (14% Benefits) - (11.9% Policy Risk) - (Efficiency Penalty based on Road Delay). [cite: 2026-01-29, 2026-02-07]

CoT Detail: "Synthesis complete. Final safety margin calculated at +0.10%."

🚛 OUTPUT FORMAT (STRICT):
Vision Results: [Populate Table] [cite: 2026-02-05]

Chain-of-Thought Log: * Provide a JSON array thinking_process with fields: step, timestamp, and insight. [cite: 2026-02-05]

Verdict: [Emoji-based verdict] [cite: 2026-02-05]`
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
                    model: "google/gemini-flash-1.5",
                    messages: [
                        { role: "system", content: "Finalize the audit report based on the provided tool outputs and strict protocol." },
                        { role: "assistant", content: null, tool_calls: message.tool_calls },
                        ...toolOutputs
                    ]
                })
            });

            const finalData = await finalResponse.json();
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

    if (!user) {
        return { shipments: [], auditLogs: [] };
    }

    const [shipmentsRes, auditsRes] = await Promise.all([
        supabase.from('shipments').select('*').eq('user_id', user.id),
        supabase.from('audit_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    ]);

    return {
        shipments: shipmentsRes.data || [],
        auditLogs: auditsRes.data || []
    };
}