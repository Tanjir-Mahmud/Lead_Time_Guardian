'use client';

import { AlertTriangle, CloudRain, Anchor, Truck, CheckCircle, Info } from 'lucide-react';
import { LogisticsAlert } from '@/app/actions';

interface LogisticsAlertPanelProps {
    alerts: LogisticsAlert[];
}

export function LogisticsAlertPanel({ alerts }: LogisticsAlertPanelProps) {
    if (!alerts || alerts.length === 0) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case 'ROAD': return Truck;
            case 'SEA': return Anchor;
            case 'WEATHER': return CloudRain;
            default: return Info;
        }
    };

    const getColor = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'text-red-500 border-red-500/50 bg-red-500/10';
            case 'MEDIUM': return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10';
            case 'HIGH': return 'text-orange-500 border-orange-500/50 bg-orange-500/10';
            case 'LOW': return 'text-green-500 border-green-500/50 bg-green-500/10';
            default: return 'text-blue-500 border-blue-500/50 bg-blue-500/10';
        }
    };

    return (
        <div className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden flex flex-col h-full">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="font-bold text-gray-200 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-[#c9a747]" />
                    Real-Time Logistics Alerts
                </h3>
                <span className="text-xs text-gray-500 bg-black/20 px-2 py-1 rounded">Live Sync</span>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-grow">
                {alerts.map((alert) => {
                    const Icon = getIcon(alert.type);
                    const colorClass = getColor(alert.severity);

                    return (
                        <div
                            key={alert.id}
                            className={`p-3 rounded-lg border ${colorClass} transition-all hover:scale-[1.02]`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-full bg-black/20 shrink-0`}>
                                    <Icon size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">{alert.message}</h4>
                                    <p className="text-xs opacity-80 mt-1">{alert.details}</p>
                                    <span className="text-[10px] opacity-60 mt-2 block uppercase tracking-wider">
                                        {alert.severity} • {new Date(alert.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
