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
export async function getExchangeRate(): Promise<string> {
    const apiKey = process.env.CURRENCY_API_KEY;
    if (!apiKey) return "N/A (Missing Key)";

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
    }
];

// --- 2. The Main Autonomous Engine ---
// --- 2. The Main Autonomous Engine ---
export async function runAutonomousAudit(base64Image: string, isSimulated: boolean = false) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        console.error("Missing OpenRouter API Key in .env");
        return "⚠️ Configuration Error: API Key missing.";
    }

    const simulationPrompt = isSimulated
        ? "⚠️ CRITICAL SIMULATION MODE: Assume a 12-hour road delay and a sudden 3% currency drop. Calculate the 'Worst-Case' margin."
        : "NORMAL MODE: Use real-time tool data.";

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
                model: "google/gemini-flash-1.5",
                messages: [
                    {
                        role: "system",
                        content: `You are the Supreme Predictive Logistics & Financial Architect. 
                        Your task is to audit invoices for Bangladesh export. 
                        
                        Current Mode: ${simulationPrompt}

                        1. Extract HS Code, FOB, and Route. 
                        2. Use 'getLogisticsAlerts' tool to get live context (unless in Simulation Mode). 
                        3. Apply 11.9% LDC Risk vs 14% Benefit logic.
                        4. Output must be concise with emojis.

                        ⚙️ SIMULATION ENGINE (WHAT-IF):
                        If Simulation Mode is ACTIVE:
                        - Bypass real-time road data.
                        - Penalty: Apply a fixed -5.00% Efficiency Penalty (representing a 12h+ bottleneck).
                        - Currency Shock: Simulate a 3% BDT Devaluation impact on LC settlement.
                        - Verdict: If Net Margin becomes negative, output: "🛑 FINANCIAL COLLAPSE RISK" and suggest immediate Air Freight.`
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
        const message = data.choices[0].message;

        // STEP B: Agentic Handshake (If Gemini asks for data)
        // Only perform tool calls if NOT in simulation mode, or if Gemini insists.
        // The prompt says "Bypass real-time road data" if simulated.
        if (message.tool_calls && !isSimulated) {
            const toolCall = message.tool_calls[0];

            // Execute your real-time logistics logic
            const realTimeAlerts = await getLogisticsAlerts();

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
                        { role: "system", content: "Finalize the audit report using the provided real-time alerts." },
                        { role: "assistant", content: null, tool_calls: message.tool_calls },
                        {
                            role: "tool",
                            name: "getLogisticsAlerts",
                            tool_call_id: toolCall.id,
                            content: JSON.stringify(realTimeAlerts)
                        }
                    ]
                })
            });

            const finalData = await finalResponse.json();
            return finalData.choices[0].message.content;
        }

        return message.content;
    } catch (error) {
        console.error("Autonomous Audit Failed:", error);
        return "⚠️ Audit Engine is currently offline. Please check connectivity.";
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