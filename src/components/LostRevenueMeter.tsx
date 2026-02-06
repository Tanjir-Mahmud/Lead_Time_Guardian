'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAnalyticsData } from '@/app/actions';

export function LostRevenueMeter() {
    const [revenueLost, setRevenueLost] = useState(14500); // Start with some mock data
    const [isSimulating, setIsSimulating] = useState(false);
    const [isLive, setIsLive] = useState(false); // Tracks if we are showing real DB data

    useEffect(() => {
        // Default Mock Ticker (stops if we are "Simulating" real data)
        let interval: NodeJS.Timeout;
        if (!isLive) {
            interval = setInterval(() => {
                setRevenueLost(prev => prev + (Math.random() * 50));
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isLive]);

    const handleSimulation = async () => {
        setIsSimulating(true);
        try {
            // Fetch real risk metrics from Supabase via Server Action
            const data = await getAnalyticsData();

            // Sum up 'risk_amount' from audit_logs
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const totalRisk = data.auditLogs.reduce((sum: number, log: any) => sum + (log.risk_amount || 0), 0);

            if (totalRisk > 0 || data.auditLogs.length > 0) {
                setRevenueLost(totalRisk);
                setIsLive(true); // Stop the random ticker, show real value
            } else {
                // If no data, stop ticker and show 0 implies "No Risk" or "No Data"
                setRevenueLost(0);
                setIsLive(true);
            }
        } catch (e) {
            console.error("Simulation failed", e);
        } finally {
            setIsSimulating(false);
        }
    };

    // Calculate generic progress (e.g. max 1M)
    const percent = Math.min((revenueLost / 100000) * 100, 100);

    return (
        <div className="bg-navy p-6 rounded-xl border border-alertRed/30 shadow-[0_0_15px_rgba(254,19,2,0.1)]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-gray-300 font-bold flex items-center gap-2">
                    <AlertTriangle className="text-alertRed" size={20} />
                    Lost Revenue Meter
                </h3>
                {isLive ? (
                    <span className="text-xs text-green-400 font-mono flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        SUPABASE LIVE
                    </span>
                ) : (
                    <span className="text-xs text-alertRed font-mono animate-pulse">ESTIMATING...</span>
                )}
            </div>

            <div className="relative pt-2">
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-white font-mono">
                        BDT {revenueLost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs text-gray-500">{isLive ? 'Total Verified 2026 Risk' : 'due to congestion'}</span>
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

                <button
                    onClick={handleSimulation}
                    disabled={isSimulating}
                    className="w-full mt-6 py-2 bg-alertRed/10 border border-alertRed/30 text-alertRed rounded hover:bg-alertRed/20 flex items-center justify-center gap-2 text-sm font-bold transition-all"
                >
                    {isSimulating ? (
                        <>Loading Data...</>
                    ) : (
                        <>
                            <RefreshCw size={16} /> Simulate 2026 Graduation
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
