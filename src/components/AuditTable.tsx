import React from 'react';

export interface AuditLogItem {
    id: string;
    invoice_no: string;
    route: string;
    fob_value: number;
    net_margin: number;
    is_hedged: boolean;
}

interface AuditTableProps {
    logs: AuditLogItem[];
    onRowClick?: (id: string) => void;
}

export const AuditTable = ({ logs, onRowClick }: AuditTableProps) => {
    return (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-navy/30 shadow-sm">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="bg-white/5 text-gray-400 font-medium">
                    <tr>
                        <th className="px-6 py-3 uppercase tracking-wider text-xs">Invoice & Route</th>
                        <th className="px-6 py-3 uppercase tracking-wider text-xs">FOB Value</th>
                        <th className="px-6 py-3 uppercase tracking-wider text-xs">2026 Risk (11.9%)</th>
                        <th className="px-6 py-3 uppercase tracking-wider text-xs">Net Margin</th>
                        <th className="px-6 py-3 uppercase tracking-wider text-xs">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-transparent text-gray-300">
                    {logs.length > 0 ? (
                        logs.map((log) => (
                            <tr
                                key={log.id}
                                onClick={() => onRowClick && onRowClick(log.id)}
                                className="hover:bg-white/5 transition-colors cursor-pointer group"
                            >
                                <td className="px-6 py-4">
                                    <div className="text-white font-medium group-hover:text-gold transition-colors">
                                        {log.invoice_no}
                                    </div>
                                    <div className="text-xs text-gray-500">{log.route}</div>
                                </td>
                                <td className="px-6 py-4 text-gray-300">
                                    ${log.fob_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-red-400 font-medium">
                                    -${(log.fob_value * 0.119).toFixed(2)}
                                </td>
                                <td className={`px-6 py-4 font-bold ${log.net_margin >= 2.10 ? 'text-green-400' : 'text-orange-400'}`}>
                                    {log.net_margin.toFixed(2)}%
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${log.net_margin >= 2.10
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                        }`}>
                                        {log.net_margin >= 2.10 ? '✅ HEDGED' : '⚠️ AT RISK'}
                                    </span>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                No audit logs found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
