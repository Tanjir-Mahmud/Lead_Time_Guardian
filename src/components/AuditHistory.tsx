'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Loader2, RefreshCw } from 'lucide-react';

export function AuditHistory() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await getSupabase()
                .from('shipments')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

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
                    No previous audits found in 'shipments'.
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
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((item) => (
                                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 font-mono text-white">{item.invoice_no}</td>
                                    <td className="px-4 py-3 text-gold">${item.fob_value?.toLocaleString()}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{item.hs_code}</td>
                                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                                        {new Date(item.created_at).toLocaleDateString()}
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
