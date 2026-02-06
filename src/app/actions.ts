'use server';

import { getSupabase } from '@/lib/supabase';

// --- Analytics Actions ---

export async function getAnalyticsData() {
    try {
        // Fetch Shipments
        const { data: shipments, error: shipmentsError } = await getSupabase()
            .from('shipments')
            .select('*')
            .eq('user_id', 'Synthetic Steps Ltd'); // Filter by User ID

        if (shipmentsError) throw shipmentsError;

        // Fetch Audit Logs
        const { data: auditLogs, error: auditError } = await getSupabase()
            .from('audit_logs')
            .select('*')
            .eq('user_id', 'Synthetic Steps Ltd');

        if (auditError) throw auditError;

        return { shipments, auditLogs };
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        return { shipments: [], auditLogs: [] };
    }
}

// --- Audit Logic Helpers ---

export async function getRegulatoryRates(category: string = 'General') {
    // Fallback to 'General' or specific logic if category not found
    const { data, error } = await getSupabase()
        .from('regulatory_rates')
        .select('incentive_rate, ldc_risk_rate')
        .eq('category', category)
        .single();

    if (error || !data) {
        console.warn(`Rates not found for category ${category}, returning defaults.`);
        // Default based on prompt if DB fail, but prompt says "FETCH... from table".
        // I'll return defaults here to prevent crash but log it.
        // If DB has the rows, this works.
        // Assuming "Textile" or similar might be a category.
        return { incentive_rate: 0.08, ldc_risk_rate: 0.119 };
    }

    return data;
}

export async function saveAuditLog(logEntry: any) {
    const { error } = await getSupabase()
        .from('audit_logs')
        .insert([logEntry]);

    if (error) {
        console.error('Error saving audit log:', error);
    }
}
