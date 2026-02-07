'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, RefreshCw, Download } from 'lucide-react';
import { generateCFOReport, generateAuditPDF } from '@/utils/pdfGenerator';
import { AuditTable } from './AuditTable';

interface AuditHistoryProps {
    onSelectAudit: (audit: any) => void;
}

export function AuditHistory({ onSelectAudit }: AuditHistoryProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            // Fetch shipment AND the linked audit log (which has the JSON)
            const { data, error } = await supabase
                .from('shipments')
                .select('*, audit_logs(audit_json)')
                .eq('user_id', user.id) // Explicitly filter by user_id even if RLS is off
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setHistory(data || []);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();

        // Listen for new inserts if real-time is needed, or just poll/manual refresh
        // For now, we'll simple load on mount.
        // The DocumentAuditor could potentially trigger a refresh via a context or prop, 
        // but for simplicity we'll add a refresh button for the user.
    }, []);

    const handleRowClick = (item: any) => {
        // The audit_json is inside the nested audit_logs array (since it's a one-to-many relation, conceptually)
        // or one-to-one depending on how Supabase sees it. Usually returns array.
        const log = item.audit_logs?.[0];
        if (log?.audit_json) {
            onSelectAudit(log.audit_json);

            // Scroll to top to see the result
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleDownload = async (item: any) => {
        if (downloadingId) return; // Prevent multiple clicks
        setDownloadingId(item.id);

        // Small delay to allow UI to update (React batching)
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const log = item.audit_logs?.[0];
            const auditJson = log?.audit_json || {};

            // Extract nested data safely
            const report = auditJson.cfo_strategic_report || {};
            const health = report.shipment_health || {};
            const profit = report.profit_protection || {};
            const summary = auditJson.metadata || {};

            const pdfData = {
                invoice_no: item.invoice_no || summary.invoice_number || 'N/A',
                fob_value: item.fob_value || summary.total_invoice_value || 0,
                av_value: report.tax_summary?.total_assessable_value || ((item.fob_value || 0) * 1.01 * 1.01).toFixed(2),
                risk_value: report.tax_summary?.total_revenue_risk || ((item.fob_value || 0) * 0.119).toFixed(2),
                benefit_value: profit.total_incentives || ((item.fob_value || 0) * 0.14).toFixed(2),
                road_delay: health.road || 'Scanning...',
                port_status: health.sea || 'Scanning...'
            };

            generateAuditPDF(pdfData);
        } catch (e) {
            console.error("PDF Generation failed", e);
        } finally {
            setDownloadingId(null);
        }
    };

    // Prepare data for AuditTable
    const tableLogs = history.map(item => {
        const log = item.audit_logs?.[0] || {};
        const auditJson = log.audit_json || {};
        const profit = auditJson.cfo_strategic_report?.profit_protection || {};

        // Extract Net Margin
        // Strategy: Use 'net_safety_margin' if available, otherwise calculate or infer
        // The prompt says "Net Safety Margin: [Final % and USD Value]"
        // We'll look for a percentage in the data, or default to a safe/risk calculation
        // If profit.ldc_graduation_risk_score is high, margin is lower.
        // Let's assume there is a stored net_margin or we calculate: (Incentives - Risk) / FOB

        let margin = 0;
        // Try to find explicit margin field
        if (typeof profit.net_margin_percent === 'number') {
            margin = profit.net_margin_percent;
        } else {
            // Fallback Calculation: 14% (Benefit) - 11.9% (Risk if applicable)
            // This is a rough heuristic if the AI didn't return an explicit field
            margin = 2.1;
        }

        return {
            id: item.id,
            invoice_no: item.invoice_no,
            route: `${item.origin || 'Unknown'} to ${item.destination || 'Unknown'}`,
            fob_value: item.fob_value || 0,
            net_margin: margin,
            is_hedged: margin >= 2.1
        };
    });

    return (
        <div className="mt-8 mb-8">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-lg font-bold text-gold">Recent Audit History</h3>
                <button
                    onClick={fetchHistory}
                    className="p-2 hover:bg-white/5 rounded-full text-gold transition-colors"
                    title="Refresh History"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {loading ? (
                <div className="py-8 text-center flex justify-center bg-navy/30 rounded-xl border border-white/5">
                    <Loader2 className="animate-spin text-gold" size={24} />
                </div>
            ) : (
                <AuditTable
                    logs={tableLogs}
                    onRowClick={(id) => {
                        const item = history.find(h => h.id === id);
                        if (item) handleRowClick(item);
                    }}
                />
            )}
        </div>
    );
}
