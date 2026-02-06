'use client';

import { TrendingUp, DollarSign, Activity, Package } from 'lucide-react';
import { CommandCenterShell } from '@/components/CommandCenterShell';
import { useEffect, useState } from 'react';
import { getAnalyticsData } from '@/app/actions';

export default function AnalyticsPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [data, setData] = useState<{ shipments: any[], auditLogs: any[] }>({ shipments: [], auditLogs: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const res = await getAnalyticsData();
            setData(res);
            setLoading(false);
        }
        fetchData();
    }, []);

    // Calculate Metrics
    const totalSavings = data.auditLogs.reduce((sum, log) => sum + (log.incentive_amount || 0), 0);
    const avgLeadTimeRaw = data.shipments.reduce((sum, s) => sum + (s.lead_time_days || 0), 0);
    const avgLeadTime = data.shipments.length ? Math.round(avgLeadTimeRaw / data.shipments.length) : 0;
    const onTimeCount = data.shipments.filter(s => s.status === 'Delivered').length; // Mock status check logic
    const onTimeRate = data.shipments.length ? ((onTimeCount / data.shipments.length) * 100).toFixed(1) : 0;

    return (
        <CommandCenterShell title="Logistics Analytics" subtitle="Performance Metrics & Forecasting (Supabase Connected)">
            <div className="h-full overflow-y-auto pr-2 pb-8">
                <div className="flex justify-end mb-6">
                    <select className="bg-navy border border-gold/20 text-gold rounded px-3 py-1 text-sm focus:outline-none">
                        <option>Last 30 Days</option>
                        <option>This Quarter</option>
                        <option>YTD</option>
                    </select>
                </div>

                {/* Top Metrics */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                    <MetricCard title="Total Savings" value={`$${(totalSavings / 1000).toFixed(1)}K`} change="+Live" isPositive icon={DollarSign} />
                    <MetricCard title="Avg Lead Time" value={`${avgLeadTime} Days`} change="-Realtime" isPositive icon={Activity} />
                    <MetricCard title="On-Time Delivery" value={`${onTimeRate}%`} change="+Live" isPositive icon={Package} />
                    <MetricCard title="Carbon Offset" value="450 Tons" change="Target: 500" isPositive={false} icon={TrendingUp} />
                </div>

                <div className="grid grid-cols-3 gap-8 mb-8">
                    {/* Main Inteactive Chart Area (Mock for now, but layout ready) */}
                    <div className="col-span-2 bg-navy/50 border border-white/5 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-6">Cost Efficiency Trend</h3>
                        <div className="h-64 flex items-end justify-between gap-2 px-4 pb-2 border-b border-white/10">
                            {[45, 60, 55, 70, 65, 80, 75, 85, 90, 80, 95, 100].map((h, i) => (
                                <div key={i} className="w-full bg-gold/20 hover:bg-gold/40 transition-all relative group rounded-t" style={{ height: `${h}%` }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        ${h}k
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-2 px-2">
                            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                            <span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                        </div>
                    </div>

                    {/* Regional Breakdown */}
                    <div className="bg-navy/50 border border-white/5 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-white mb-6">Export Destinations</h3>
                        <div className="space-y-6">
                            <ProgressRow label="Germany (Hamburg)" percent={45} color="bg-gold" />
                            <ProgressRow label="USA (New York)" percent={30} color="bg-blue-500" />
                            <ProgressRow label="UK (Southampton)" percent={15} color="bg-alertRed" />
                            <ProgressRow label="Others" percent={10} color="bg-gray-500" />
                        </div>
                    </div>
                </div>

                {/* Bottom Table: Shipments */}
                <div className="bg-navy/50 border border-white/5 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h3 className="text-lg font-bold text-white">Recent Shipment Performance</h3>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-gold">Loading Shipments...</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-gray-400">
                                <tr>
                                    <th className="p-4 font-medium">Shipment ID</th>
                                    <th className="p-4 font-medium">Destination</th>
                                    <th className="p-4 font-medium">Value</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium">Lead Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-gray-300">
                                {data.shipments.length > 0 ? (
                                    data.shipments.map((s, idx) => (
                                        <TableRow
                                            key={idx}
                                            id={s.shipment_id || s.id || 'N/A'}
                                            dest={s.destination || 'Unknown'}
                                            val={`$${s.value?.toLocaleString() || 0}`}
                                            status={s.status || 'Pending'}
                                            time={`${s.lead_time_days || 0} Days`}
                                            isError={s.status === 'Delayed'}
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-gray-500">No shipments found for Synthetic Steps Ltd.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </CommandCenterShell>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MetricCard({ title, value, change, isPositive, icon: Icon }: any) {
    return (
        <div className="bg-navy p-6 rounded-xl border border-white/5">
            <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg bg-white/5 ${isPositive !== false ? 'text-gold' : 'text-gray-400'}`}>
                    <Icon size={20} />
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {change}
                </span>
            </div>
            <h3 className="text-2xl font-bold text-white mt-4">{value}</h3>
            <p className="text-xs text-gray-400">{title}</p>
        </div>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProgressRow({ label, percent, color }: any) {
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">{label}</span>
                <span className="text-gray-500">{percent}%</span>
            </div>
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TableRow({ id, dest, val, status, time, isError }: any) {
    return (
        <tr className="hover:bg-white/5 transition-colors">
            <td className="p-4 font-mono text-gold">{id}</td>
            <td className="p-4">{dest}</td>
            <td className="p-4">{val}</td>
            <td className="p-4">
                <span className={`px-2 py-1 rounded text-xs ${isError ? 'bg-alertRed/10 text-alertRed' : (status === 'Delivered' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400')}`}>
                    {status}
                </span>
            </td>
            <td className="p-4 text-gray-400">{time}</td>
        </tr>
    )
}
