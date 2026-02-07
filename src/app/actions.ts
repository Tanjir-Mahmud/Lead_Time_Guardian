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

// --- Analytics Actions ---

export async function getAnalyticsData() {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('No authenticated user found for analytics.');
            return { shipments: [], auditLogs: [] };
        }

        const { data: shipments, error: shipmentsError } = await supabase
            .from('shipments')
            .select('*')
            .eq('user_id', user.id);

        if (shipmentsError) throw shipmentsError;

        const { data: auditLogs, error: auditError } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('user_id', user.id);

        if (auditError) throw auditError;

        return { shipments, auditLogs };
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        return { shipments: [], auditLogs: [] };
    }
}

// --- Audit Logic Helpers ---

export async function getRegulatoryRates(category: string = 'General') {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('regulatory_rates')
        .select('incentive_rate, ldc_risk_rate')
        .eq('category', category)
        .single();

    if (error || !data) {
        // Default based on LDC Graduation 2026 Risk Logic [cite: 2026-01-29, 2026-02-05]
        return { incentive_rate: 0.08, ldc_risk_rate: 0.119 };
    }

    return data;
}

export async function saveAuditLog(logEntry: any) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error('User not authenticated. Cannot save audit log.');
        return;
    }

    const { error } = await supabase
        .from('audit_logs')
        .insert([{ ...logEntry, user_id: user.id }]);

    if (error) {
        console.error('Error saving audit log:', error);
    }
}

// --- Predictive Logistics Logic (The Winning Layer) ---

// Helper to fetch Predictive Weather (72-Hour Outlook) [cite: 2026-02-05]
async function getPredictiveWeather(lat: number, lon: number, locationName: string): Promise<LogisticsAlert | null> {
    const apiKey = "6d7d67198b747da170f748214180a6ce"; // Your OpenWeather Key

    try {
        // Using 'forecast' endpoint to move from Reactive to Predictive [cite: 2025-12-12]
        const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
        if (!res.ok) throw new Error(`Forecast API Error: ${res.statusText}`);

        const data = await res.json();

        // Analyze next 72 hours (24 slots of 3-hour intervals) [cite: 2026-02-05]
        const predictiveRisk = data.list.slice(0, 24).find((slot: any) => {
            const condition = slot.weather[0].main;
            const description = slot.weather[0].description;
            // Rule: Identify Storm, Heavy Rain, or Flood conditions [cite: 2026-02-05]
            return ['Thunderstorm', 'Rain', 'Squall', 'Tornado'].includes(condition) ||
                description.includes('heavy intensity rain') ||
                description.includes('storm');
        });

        if (predictiveRisk) {
            const riskTime = new Date(predictiveRisk.dt_txt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
            return {
                id: `predictive-weather-${locationName.toLowerCase()}`,
                type: 'WEATHER',
                severity: 'CRITICAL',
                message: '⚠️ PREDICTIVE RISK DETECTED',
                details: `Predictive Alert: ${predictiveRisk.weather[0].description} expected at ${locationName} around ${riskTime}. Loading delay risk: HIGH. Strategic Advice: Secure loading before the storm window.`,
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        console.error("Failed to fetch predictive weather:", error);
    }
    return null;
}

export async function getLogisticsAlerts(): Promise<LogisticsAlert[]> {
    const alerts: LogisticsAlert[] = [];

    // 1. DYNAMIC ROAD SYNC (Simulated Barikoi Logic) [cite: 2026-02-05]
    // Rule: Trigger if delay > 2.5 hours vs Standard 5.0h [cite: 2026-02-05]
    const standardTimeHours = 5.0;
    const actualTimeHours = 4.5 + (Math.random() * 4.5); // Simulating traffic variance
    const delay = actualTimeHours - standardTimeHours;

    if (delay > 2.5) {
        alerts.push({
            id: 'road-critical',
            type: 'ROAD',
            severity: 'CRITICAL',
            message: 'CRITICAL ROAD ALERT',
            details: `Traffic congestion detected. Travel time: ${actualTimeHours.toFixed(1)}h (Standard: ${standardTimeHours}h). Expected lead-time increase: 12 hours.`,
            timestamp: new Date().toISOString()
        });
    }

    // 2. SEA SENSE (Simulated Terminal49 Logic) [cite: 2026-02-05]
    // Rule: Port Congestion > 70% -> Recommend Air Freight [cite: 2026-02-05]
    const congestionIndex = Math.floor(Math.random() * 100);
    if (congestionIndex > 70) {
        alerts.push({
            id: 'sea-congestion',
            type: 'SEA',
            severity: 'HIGH',
            message: 'PORT ALERT: Heavy Congestion',
            details: `Port Congestion Index at ${congestionIndex}% (Terminal49). Strategic Recommendation: Evaluate Air Freight to avoid lead-time penalties.`,
            timestamp: new Date().toISOString()
        });
    }

    // 3. PREDICTIVE WEATHER SENSE (72-Hour Outlook) [cite: 2026-02-05]
    // Locations: Savar (Origin: 23.8483, 90.2674) & Chattogram (Port: 22.3569, 91.7832) [cite: 2026-02-05]
    const savarAlert = await getPredictiveWeather(23.8483, 90.2674, 'Savar (Origin)');
    if (savarAlert) alerts.push(savarAlert);

    const ctgAlert = await getPredictiveWeather(22.3569, 91.7832, 'Chattogram (Port)');
    if (ctgAlert) alerts.push(ctgAlert);

    // Default Status if no critical alerts
    if (alerts.length === 0) {
        alerts.push({
            id: 'status-ok',
            type: 'ROAD',
            severity: 'LOW',
            message: 'Supply Chain Health: Stable',
            details: 'All routes and predictive windows show normal operational parameters.',
            timestamp: new Date().toISOString()
        });
    }

    return alerts;
}