'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, RefreshCw, Download } from 'lucide-react';
import { generateCFOReport } from '@/utils/pdfGenerator';

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
            const compliance = auditJson.compliance_summary || {};

            const pdfData = {
                invoiceNo: item.invoice_no || summary.invoice_number || 'N/A',
                invoiceTotal: item.fob_value || summary.total_invoice_value || 0,
                auditDate: new Date(item.created_at).toLocaleDateString(),

                // 1. Logistics
                logistics: {
                    road: health.road || 'Scanning...',
                    sea: health.sea || 'Scanning...',
                    weather: health.weather || 'Scanning...',
                },

                // 2. Math Integrity
                mathIntegrity: {
                    fob: item.fob_value || summary.total_invoice_value || 0,
                    av: report.tax_summary?.total_assessable_value || 0,
                    incentive: profit.total_incentives || 0,
                    revenueRisk: report.tax_summary?.total_revenue_risk || 0,
                },

                // 3. Strategic Findings (Text)
                strategicFindings: auditJson.strategic_audit_report || "No strategic findings recorded.",

                // 4. CA Strategic Advice (Cards)
                caAdvice: report.ca_recommendations?.map((rec: any) => ({
                    advice: rec.advice,
                    type: rec.type,
                    savings: rec.savings || 0
                })) || [],

                // 5. Profit Protection
                profitProtection: {
                    cashIncentive: profit.total_incentives || 0,
                    dutyDrawback: profit.duty_drawback || 0,
                    revenueRisk: profit.revenue_risk || 0,
                    ldcRiskScore: profit.ldc_graduation_risk_score || 0,
                    cbamLiability: profit.cbam_liability_eur || 0,
                },

                // 6. Line Items
                lineItems: (auditJson.line_items || []).map((line: any, idx: number) => ({
                    format: idx + 1,
                    description: line.description,
                    qty: line.quantity || 0,
                    price: line.unit_price || 0,
                    hsCode: line.hs_code || 'N/A',
                    ldcImpact: line.ldc_impact?.impacted || false,
                    status: line.compliance?.valid ? 'Valid' : 'Check',
                })),

                // Sum Check
                sumCheck: {
                    declared: compliance.declared_total || 0,
                    calculated: compliance.calculated_total || 0,
                    passed: compliance.sum_check_passed || false,
                },

                // 8. Sustainability (New)
                sustainability: {
                    score: item.carbon_score || item.audit_logs?.[0]?.carbon_score || 'Low',
                    intensity: report.sustainability?.intensity || '5.5 kg CO2e/unit',
                    advice: report.sustainability?.mitigation_advice || 'Maintain current sustainable practices.'
                },

                rexStatus: summary.rex_status || 'N/A'
            };

            generateCFOReport(pdfData);
        } catch (e) {
            console.error("PDF Generation failed", e);
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="mt-8 bg-navy/30 p-6 rounded-xl border border-white/5 mb-8">
            <div className="flex items-center justify-between mb-4">
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
                <div className="py-8 text-center flex justify-center">
                    <Loader2 className="animate-spin text-gold" size={24} />
                </div>
            ) : history.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">
                    No previous audits found.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-500 uppercase bg-black/20 border-b border-white/5">
                            <tr>
                                <th className="px-4 py-3">Invoice #</th>
                                <th className="px-4 py-3">FOB Value</th>
                                <th className="px-4 py-3">HS Code</th>
                                <th className="px-4 py-3 text-right">Date</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((item) => (
                                <tr
                                    key={item.id}
                                    onClick={() => handleRowClick(item)}
                                    className="border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                                >
                                    <td className="px-4 py-3 font-mono text-white group-hover:text-gold transition-colors">
                                        {item.invoice_no}
                                    </td>
                                    <td className="px-4 py-3 text-gold">${item.fob_value?.toLocaleString()}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{item.hs_code}</td>
                                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownload(item);
                                            }}
                                            disabled={downloadingId === item.id}
                                            className="p-2 hover:bg-white/10 rounded-full text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                                            title="Download CFO Report"
                                        >
                                            {downloadingId === item.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Download size={16} />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
