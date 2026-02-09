'use client';

import { AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAnalyticsData } from '@/app/actions';

export function LostRevenueMeter() {
    const [revenueLost, setRevenueLost] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Auto-fetch 2026 risk on component mount (always active since it's 2026)
        const fetchRisk = async () => {
            try {
                const data = await getAnalyticsData();
                // Sum up 'risk_amount' from audit_logs (11.9% MFN Duty)
                const totalRisk = data.auditLogs.reduce((sum: number, log: any) => sum + (log.risk_amount || 0), 0);
                setRevenueLost(totalRisk);
            } catch (e) {
                console.error("Failed to fetch risk data", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRisk();
    }, []);

    // Calculate progress (max 1L = 100,000 BDT)
    const percent = Math.min((revenueLost / 100000) * 100, 100);

    return (
        <div className="bg-navy p-6 rounded-xl border border-alertRed/30 shadow-[0_0_15px_rgba(254,19,2,0.1)]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-gray-300 font-bold flex items-center gap-2">
                    <AlertTriangle className="text-alertRed" size={20} />
                    2026 MFN Duty Impact
                </h3>
                <span className="text-xs text-green-400 font-mono flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    LIVE (11.9% Applied)
                </span>
            </div>

            <div className="relative pt-2">
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-white font-mono">
                        {isLoading ? '...' : `BDT ${revenueLost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                    <span className="text-xs text-gray-500">Total 2026 Revenue Risk</span>
                </div>

                {/* Meter Bar */}
                <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
                    <div
                        className="h-full bg-gradient-to-r from-orange-500 to-alertRed transition-all duration-500 ease-out"
                        style={{ width: `${percent}%` }}
                    />
                </div>

                <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                    <span>0 BDT</span>
                    <span>1.0L BDT Limit</span>
                </div>

                {/* Status badge instead of button */}
                <div className="w-full mt-4 py-2 bg-alertRed/10 border border-alertRed/30 text-alertRed rounded flex items-center justify-center gap-2 text-sm font-bold">
                    ⚠️ LDC Graduation Active - 11.9% MFN Duty Applied
                </div>
            </div>
        </div>
    );
}
