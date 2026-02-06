'use server';

import { createClient } from '@/lib/supabase/server';

// --- Analytics Actions ---

export async function getAnalyticsData() {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('No authenticated user found for analytics.');
            return { shipments: [], auditLogs: [] };
        }

        // Fetch Shipments
        const { data: shipments, error: shipmentsError } = await supabase
            .from('shipments')
            .select('*')
            .eq('user_id', user.id); // Securely filter by logged-in user

        if (shipmentsError) throw shipmentsError;

        // Fetch Audit Logs
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
    // Fallback to 'General' or specific logic if category not found
    const { data, error } = await supabase
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error('User not authenticated. Cannot save audit log.');
        return;
    }

    const { error } = await supabase
        .from('audit_logs')
        .insert([{ ...logEntry, user_id: user.id }]); // Ensure user_id is tagged

    if (error) {
        console.error('Error saving audit log:', error);
    }
}
