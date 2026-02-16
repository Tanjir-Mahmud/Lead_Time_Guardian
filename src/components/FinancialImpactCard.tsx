'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Shield, AlertTriangle, ChevronDown, ChevronUp, Globe2, Zap } from 'lucide-react';

interface FinancialImpactProps {
    report: {
        tariff_analysis?: {
            applied_tariff_pct: number;
            baseline_tariff_pct: number;
            zero_tariff_eligible: boolean;
            zero_tariff_reason: string;
            tariff_cost_usd: number;
            tariff_savings_usd: number;
        };
        financial_impact?: {
            fob_value_usd: number;
            tariff_cost_usd: number;
            delay_penalty_usd: number;
            insurance_buffer_usd: number;
            total_risk_exposure_usd: number;
            net_opportunity_usd: number;
        };
        predicted_lead_time?: string;
        priority_classification?: string;
        sector_warnings?: string[];
        strategic_advice?: string[];
        primary_port_risk?: {
            port_name: string;
            congestion_index: number;
            risk_level: string;
        };
    } | null;
    guardianReport?: {
        analysis_status?: string;
        guardian_alert?: string;
        trade_policy?: {
            current_tariff_rate?: string;
            source?: string;
        };
        predicted_delay?: {
            total_range?: string;
            buffer_days?: number;
        };
        live_news_summary?: string[];
        intelligence_metadata?: {
            data_source?: string;
            total_sources_found?: number;
        };
    } | null;
}

export function FinancialImpactCard({ report, guardianReport }: FinancialImpactProps) {
    const [expanded, setExpanded] = useState(false);

    if (!report) return null;

    const tariff = report.tariff_analysis;
    const financial = report.financial_impact;
    const fobValue = financial?.fob_value_usd || 0;
    const tariffCost19 = Number((fobValue * 0.19).toFixed(2));
    const tariffCost0 = 0;
    const savings = tariffCost19;
    const isZeroEligible = tariff?.zero_tariff_eligible || false;
    const appliedRate = tariff?.applied_tariff_pct ?? 19;
    const actualCost = Number((fobValue * (appliedRate / 100)).toFixed(2));
    const leadTime = report.predicted_lead_time || '—';
    const priority = report.priority_classification || 'Standard';

    const priorityColor = priority.includes('Critical')
        ? 'text-red-400 bg-red-500/10 border-red-500/30'
        : priority.includes('High')
            ? 'text-orange-400 bg-orange-500/10 border-orange-500/30'
            : priority.includes('Elevated')
                ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
                : 'text-green-400 bg-green-500/10 border-green-500/30';

    // Analysis source from Guardian
    const analysisSource = guardianReport?.analysis_status || 'System Fallback Logic';
    const isLive = analysisSource.includes('Live');

    return (
        <div className="bg-gradient-to-br from-[#0a1628] to-[#0d1f3c] border border-gold/20 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-gold/15 to-transparent p-4 border-b border-gold/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gold/20 rounded-lg">
                            <TrendingUp className="text-gold" size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gold text-sm uppercase tracking-wider flex items-center gap-2">
                                Financial Impact & Trade Strategy
                            </h3>
                            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                {isLive ? (
                                    <><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block"></span> {analysisSource}</>
                                ) : (
                                    <><span className="w-1.5 h-1.5 bg-yellow-400 rounded-full inline-block"></span> {analysisSource}</>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full border text-[11px] font-bold ${priorityColor}`}>
                        {priority}
                    </div>
                </div>
            </div>

            {/* Main Comparison Cards */}
            <div className="p-4 grid grid-cols-2 gap-4">
                {/* 19% Tariff Scenario */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-bl-full"></div>
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingDown className="text-red-400" size={16} />
                        <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Standard 19% Tax</span>
                    </div>
                    <p className="text-3xl font-bold text-red-400 font-mono">
                        ${tariffCost19.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">Tax liability on ${fobValue.toLocaleString()} FOB</p>
                    <div className="mt-3 h-1.5 bg-red-500/20 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                </div>

                {/* 0% Tariff Scenario */}
                <div className={`${isZeroEligible ? 'bg-green-500/10 border-green-500/30' : 'bg-green-500/5 border-green-500/20'} border rounded-xl p-4 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/5 rounded-bl-full"></div>
                    <div className="flex items-center gap-2 mb-3">
                        <Shield className={isZeroEligible ? "text-green-400" : "text-green-400/50"} size={16} />
                        <span className={`${isZeroEligible ? 'text-green-400' : 'text-green-400/50'} text-xs font-bold uppercase tracking-wider`}>
                            Zero-Tariff (0%)
                        </span>
                        {isZeroEligible && (
                            <span className="text-[9px] bg-green-500/20 px-1.5 py-0.5 rounded text-green-300 border border-green-500/30">ACTIVE</span>
                        )}
                    </div>
                    <p className={`text-3xl font-bold font-mono ${isZeroEligible ? 'text-green-400' : 'text-green-400/50'}`}>
                        $0.00
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                        {isZeroEligible ? 'Eligible: Destination-origin raw materials detected' : 'Requires destination-origin raw materials'}
                    </p>
                    <div className="mt-3 h-1.5 bg-green-500/20 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" style={{ width: isZeroEligible ? '100%' : '0%' }}></div>
                    </div>
                </div>
            </div>

            {/* Savings Banner */}
            <div className="mx-4 mb-4 bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-transparent border border-green-500/20 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="text-green-400" size={16} />
                    <span className="text-sm text-green-300 font-medium">
                        {isZeroEligible ? 'You ARE saving' : 'Potential savings'}
                    </span>
                </div>
                <span className="text-xl font-bold text-green-400 font-mono">
                    ${savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            </div>

            {/* Metrics Row */}
            <div className="px-4 pb-4 grid grid-cols-3 gap-3">
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Lead Time</p>
                    <p className="text-lg font-bold text-white font-mono mt-1">{leadTime}</p>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Delay Penalty</p>
                    <p className="text-lg font-bold text-orange-400 font-mono mt-1">
                        ${(financial?.delay_penalty_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Risk Exposure</p>
                    <p className="text-lg font-bold text-red-400 font-mono mt-1">
                        ${(financial?.total_risk_exposure_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Guardian Alert */}
            {guardianReport?.guardian_alert && (
                <div className="mx-4 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={14} />
                    <p className="text-xs text-amber-200">{guardianReport.guardian_alert}</p>
                </div>
            )}

            {/* Expandable Details */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-2.5 border-t border-gold/10 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-xs text-gray-400"
            >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expanded ? 'Hide Details' : 'Show Strategic Details & Live News'}
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-3 animate-in fade-in">
                    {/* Port Risk */}
                    {report.primary_port_risk && (
                        <div className="bg-black/30 border border-white/5 rounded-lg p-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Port Risk</p>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-white">{report.primary_port_risk.port_name}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${report.primary_port_risk.congestion_index > 60 ? 'bg-red-500' :
                                                report.primary_port_risk.congestion_index > 40 ? 'bg-yellow-500' : 'bg-green-500'
                                                }`}
                                            style={{ width: `${report.primary_port_risk.congestion_index}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs text-gray-400">{report.primary_port_risk.congestion_index}%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Strategic Advice */}
                    {report.strategic_advice && report.strategic_advice.length > 0 && (
                        <div className="bg-black/30 border border-white/5 rounded-lg p-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Strategic Advice</p>
                            <ul className="space-y-1.5">
                                {report.strategic_advice.map((advice: string, i: number) => (
                                    <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                        <span className="text-gold mt-0.5">▸</span> {advice}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Live News from Guardian */}
                    {guardianReport?.live_news_summary && guardianReport.live_news_summary.length > 0 && (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                            <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Globe2 size={10} /> Live Trade News (Tavily)
                            </p>
                            <ul className="space-y-1.5">
                                {guardianReport.live_news_summary.map((news: string, i: number) => (
                                    <li key={i} className="text-xs text-blue-200/80 flex items-start gap-2">
                                        <span className="text-blue-400 mt-0.5">•</span> {news}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Sector Warnings */}
                    {report.sector_warnings && report.sector_warnings.length > 0 && (
                        <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
                            <p className="text-[10px] text-orange-400 uppercase tracking-wider mb-2">Sector Warnings</p>
                            <ul className="space-y-1.5">
                                {report.sector_warnings.map((w: string, i: number) => (
                                    <li key={i} className="text-xs text-orange-200/80 flex items-start gap-2">
                                        <AlertTriangle size={10} className="text-orange-400 shrink-0 mt-0.5" /> {w}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Intelligence Source */}
                    {guardianReport?.intelligence_metadata && (
                        <div className="text-[10px] text-gray-600 flex items-center justify-between pt-2 border-t border-white/5">
                            <span>Source: {guardianReport.intelligence_metadata.data_source}</span>
                            <span>{guardianReport.intelligence_metadata.total_sources_found} sources analyzed</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
