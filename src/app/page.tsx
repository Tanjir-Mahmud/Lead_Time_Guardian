'use client';

import dynamic from 'next/dynamic';
import { LayoutDashboard, FileCheck, Anchor, TrendingUp, AlertTriangle, RefreshCw, Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { LostRevenueMeter } from '@/components/LostRevenueMeter';
import { CommandCenterShell } from '@/components/CommandCenterShell';
import { useState } from 'react';

// Dynamic import for Map to avoid SSR issues
const SmartMap = dynamic(() => import('@/components/SmartMap'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-navy/50 animate-pulse rounded-xl border border-gold/20 flex items-center justify-center text-gold">Loading Smart Map...</div>
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function KPICard({ title, value, sub, icon: Icon, color }: any) {
    return (
        <div className="bg-navy p-6 rounded-xl border border-white/5 hover:border-gold/20 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-gray-400 text-sm">{title}</p>
                    <h3 className="text-3xl font-bold text-white mt-1 group-hover:scale-105 transition-transform origin-left">{value}</h3>
                </div>
                <div className={`p-3 rounded-lg bg-white/5 ${color}`}>
                    <Icon size={24} />
                </div>
            </div>
            <p className="text-xs text-gray-500 border-t border-white/5 pt-3 mt-2">{sub}</p>
        </div>
    )
}



export default function Home() {
    return (
        <CommandCenterShell title="Logistics Command Center" subtitle="AI-Powered Central Operations">
            {/* Dashboard Widgets Grid */}
            <div className="grid grid-cols-4 gap-4 shrink-0 mb-6">
                <KPICard title="Total Savings" value="$2.4M" sub="+12.5% vs last month" icon={TrendingUp} color="text-green-500" />
                <KPICard title="Avg Lead Time" value="14 Days" sub="-3.2 Days improvement" icon={RefreshCw} color="text-blue-500" />
                <KPICard title="On-Time Delivery" value="98.2%" sub="+1.4% Efficiency" icon={FileCheck} color="text-purple-500" />
                <KPICard title="Carbon Offset" value="450 Tons" sub="Target: 500 Tons" icon={Anchor} color="text-emerald-500" />
            </div>

            {/* Active Operations Layer (Map + Live Meter) */}
            <div className="flex-grow grid grid-cols-12 gap-6 min-h-0">
                {/* Map & Revenue Meter - Now takes full width of this container */}
                <div className="col-span-12 flex flex-col gap-6 overflow-y-auto pr-2">
                    <div className="relative group">
                        <SmartMap />
                    </div>
                    <LostRevenueMeter />
                </div>
            </div>
        </CommandCenterShell>
    );
}
