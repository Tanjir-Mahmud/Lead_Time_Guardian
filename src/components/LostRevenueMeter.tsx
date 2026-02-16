'use client';

import { AlertTriangle, Shield, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAnalyticsData } from '@/app/actions';

export function LostRevenueMeter() {
    const [standardTariffTotal, setStandardTariffTotal] = useState(0);
    const [optimizedTotal, setOptimizedTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isOptimized, setIsOptimized] = useState(false);

    useEffect(() => {
        const fetchRisk = async () => {
            try {
                const data = await getAnalyticsData();
                // Sum up 'risk_amount' = FOB * 19% (Reciprocal Tariff standard cost)
                const totalStandard = data.auditLogs.reduce((sum: number, log: any) => sum + (log.reciprocal_tariff_value || 0), 0);
                // Optimized = $0 when US Cotton detected / Preferential logic applied
                const totalOptimized = data.auditLogs.reduce((sum: number, log: any) => {
                    // If the audit has zero-tariff flag, optimized is 0
                    const auditJson = log.audit_json || {};
                    const isZero = auditJson?.financial?.is_us_cotton_optimized || auditJson?.guardian_report?.tariff_optimization?.zero_tariff_eligible;
                    return sum + (isZero ? 0 : (log.reciprocal_tariff_value || 0));
                }, 0);
                setStandardTariffTotal(totalStandard);
                setOptimizedTotal(totalOptimized);
                setIsOptimized(totalOptimized === 0 && totalStandard > 0);
            } catch (e) {
                console.error("Failed to fetch risk data", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRisk();
    }, []);

    const savingsGap = standardTariffTotal - optimizedTotal;
    // Progress bar: savings as percentage of standard cost
    const percent = standardTariffTotal > 0 ? Math.min((savingsGap / standardTariffTotal) * 100, 100) : 0;

    return (
        <div className="bg-navy p-6 rounded-xl border border-gold/30 shadow-[0_0_15px_rgba(218,165,32,0.08)]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-gray-300 font-bold flex items-center gap-2">
                    <TrendingUp className="text-gold" size={20} />
                    Reciprocal Tariff Savings Gap
                </h3>
                <span className="text-xs text-green-400 font-mono flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    LIVE (19% Reciprocal Tariff)
                </span>
            </div>

            <div className="relative pt-2">
                {/* Standard vs Optimized comparison */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                        <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold mb-1">Standard (19%)</p>
                        <p className="text-xl font-bold text-red-400 font-mono">
                            {isLoading ? '...' : `$${standardTariffTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </p>
                    </div>
                    <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                        <p className="text-[10px] text-green-400 uppercase tracking-wider font-bold mb-1">Optimized (0%)</p>
                        <p className="text-xl font-bold text-green-400 font-mono">
                            {isLoading ? '...' : `$${optimizedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </p>
                    </div>
                </div>

                {/* Savings amount */}
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-gold font-mono">
                        {isLoading ? '...' : `$${savingsGap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                    <span className="text-xs text-gray-500">Potential Bilateral Savings</span>
                </div>

                {/* Savings Gap Meter */}
                <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
                    <div
                        className="h-full bg-gradient-to-r from-gold/80 to-green-400 transition-all duration-500 ease-out"
                        style={{ width: `${percent}%` }}
                    />
                </div>

                <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                    <span>0% Gap</span>
                    <span>100% Saved</span>
                </div>

                {/* Dynamic Trade Policy Alert */}
                {!isLoading && (
                    isOptimized ? (
                        <div className="w-full mt-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded flex items-center justify-center gap-2 text-sm font-bold">
                            <Shield size={16} /> Preferential Logic Applied: 0% Duty Status Achieved
                        </div>
                    ) : (
                        <div className="w-full mt-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded flex items-center justify-center gap-2 text-sm font-bold">
                            <AlertTriangle size={16} /> Standard Reciprocal Tariff Active: 19% Duty Applied
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
