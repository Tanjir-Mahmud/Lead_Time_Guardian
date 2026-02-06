
'use client';

import { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface DocumentAuditorProps {
    initialData?: any;
}

export function DocumentAuditor({ initialData }: DocumentAuditorProps) {
    const [file, setFile] = useState<File | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result, setResult] = useState<any>(null);

    // Sync when parent passes new data (e.g. from History)
    useEffect(() => {
        if (initialData) {
            setResult(initialData);
            setFile(null);
        }
    }, [initialData]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
            setError(null);
            await processDocument(e.target.files[0]);
        }
    };

    const processDocument = async (file: File) => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/audit', {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Audit failed: ${res.status}`);
            }
            const data = await res.json();
            setResult(data);
        } catch (error: any) {
            console.error(error);
            setError(error.message || "Failed to upload document");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 bg-navy/50 border border-gold/20 rounded-xl">
            <h2 className="text-xl font-bold text-gold mb-4 flex items-center gap-2">
                <CheckCircle size={24} /> Document Auditor
            </h2>

            {!result && !isLoading && (
                <div className="border-2 border-dashed border-gold/30 rounded-xl p-12 text-center hover:bg-gold/5 transition-colors cursor-pointer relative">
                    <input
                        type="file"
                        onChange={handleUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept="image/*,application/pdf"
                    />
                    <Upload className="mx-auto text-gold mb-4" size={48} />
                    <p className="text-gray-400">Drag & Drop Bill of Entry or Invoice</p>
                    <p className="text-xs text-gray-600 mt-2">Supports PDF, JPG, PNG</p>
                </div>
            )}

            {isLoading && (
                <div className="py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-gold mb-4" size={48} />
                    <p className="text-gold">Auditing Document with Gemini Vision...</p>
                </div>
            )}

            {error && (
                <div className="p-4 bg-alertRed/10 border border-alertRed/30 rounded-lg text-center">
                    <AlertTriangle className="mx-auto text-alertRed mb-2" size={32} />
                    <p className="text-alertRed font-bold">Audit Failed</p>
                    <p className="text-xs text-red-300 mt-1">{error}</p>
                    <button
                        onClick={() => { setError(null); setFile(null); }}
                        className="mt-4 px-4 py-2 bg-black/40 text-xs rounded hover:bg-black/60"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {result && (
                <div className="space-y-6 animate-in fade-in">

                    {/* Database Sync Success */}
                    {result.sync_status && (
                        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg flex items-center gap-3 animate-in slide-in-from-top-2">
                            <CheckCircle className="text-green-500" size={20} />
                            <div>
                                <h3 className="font-bold text-green-400 text-sm">Database Integrity Verified</h3>
                                <p className="text-xs text-green-300/80">
                                    {result.sync_status}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Extraction Failure Warning */}
                    {(result.metadata?.total_invoice_value === 0 && (!result.line_items || result.line_items.length === 0)) && (
                        <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg flex items-center gap-3">
                            <AlertTriangle className="text-yellow-500" />
                            <div>
                                <h3 className="font-bold text-yellow-500">Extraction Incomplete</h3>
                                <p className="text-xs text-yellow-200/70">
                                    The AI could not identify standard invoice fields. Use the "Raw Data" view to debug or try a clearer image.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Invoice Metadata */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-black/40 p-4 rounded-lg border border-white/10">
                            <p className="text-gray-400 text-xs">Invoice #</p>
                            <p className="text-lg font-mono text-white">{result.metadata?.invoice_number || 'N/A'}</p>
                        </div>
                        <div className="bg-black/40 p-4 rounded-lg border border-white/10">
                            <p className="text-gray-400 text-xs">Origin</p>
                            <p className="text-lg font-mono text-white">{result.metadata?.origin || 'Unknown'}</p>
                        </div>
                        <div className="bg-black/40 p-4 rounded-lg border border-white/10">
                            <p className="text-gray-400 text-xs">Invoice Total</p>
                            <p className="text-lg font-mono text-gold">${result.metadata?.total_invoice_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
                        </div>

                    </div>


                    {/* CFO Strategic Audit (Format: User Request) */}
                    {result.cfo_strategic_report && (
                        <div className="bg-gradient-to-br from-black/80 to-navy/90 border border-gold/40 rounded-xl overflow-hidden shadow-2xl relative">
                            {/* Watermark/Header */}
                            <div className="bg-gold/10 p-4 border-b border-gold/20 flex items-center justify-between">
                                <h3 className="font-bold text-gold flex items-center gap-2 text-xl tracking-wide">
                                    <span className="text-2xl">🏛️</span> CFO ACCURACY REPORT
                                </h3>
                                <div className="text-right">
                                    <p className="text-[10px] text-gold/60 uppercase tracking-widest">Lead-Time Guardian AI</p>
                                    <p className="text-[10px] text-gray-500 font-mono">ID: {result.metadata?.invoice_number}</p>
                                </div>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                                {/* 1. Logistics Alert (API Driven) */}
                                <div className="space-y-4">
                                    <h4 className="text-xs text-blue-400 uppercase tracking-widest font-bold border-b border-blue-500/30 pb-2">1. Logistics Alert (API Driven)</h4>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-black/40 p-2 rounded border border-white/10">
                                            <p className="text-[10px] text-gray-500 mb-1">ROAD (Barikoi)</p>
                                            <p className={`font-bold ${result.cfo_strategic_report.shipment_health?.road === 'Clear' ? 'text-green-400' : 'text-red-400'}`}>
                                                {result.cfo_strategic_report.shipment_health?.road || 'Scanning...'}
                                            </p>
                                        </div>
                                        <div className="bg-black/40 p-2 rounded border border-white/10">
                                            <p className="text-[10px] text-gray-500 mb-1">SEA (Terminal49)</p>
                                            <p className={`font-bold ${result.cfo_strategic_report.shipment_health?.sea === 'Smooth' ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {result.cfo_strategic_report.shipment_health?.sea || 'Scanning...'}
                                            </p>
                                        </div>
                                        <div className="bg-black/40 p-2 rounded border border-white/10">
                                            <p className="text-[10px] text-gray-500 mb-1">RISK (Weather)</p>
                                            <p className={`font-bold ${result.cfo_strategic_report.shipment_health?.weather === 'Safe' ? 'text-green-400' : 'text-red-400'}`}>
                                                {result.cfo_strategic_report.shipment_health?.weather || 'Scanning...'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Mathematical Integrity Audit (NO ESTIMATES) */}
                                <div className="space-y-4">
                                    <h4 className="text-xs text-gold uppercase tracking-widest font-bold border-b border-gold/30 pb-2">2. Mathematical Integrity Audit (NO ESTIMATES)</h4>

                                    {/* Step-by-Step Math Display */}
                                    <div className="bg-black/30 p-4 rounded text-xs font-mono border border-white/5 mb-4">
                                        <div className="flex justify-between border-b border-gray-700 pb-1 mb-1">
                                            <span className="text-gray-400">FOB Value</span>
                                            <span className="text-white font-bold text-right">${result.metadata?.total_invoice_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-700 pb-1 mb-1">
                                            <span className="text-gray-400">AV Calculation (Customs Act 23)</span>
                                            <span className="text-white font-bold text-right">
                                                (FOB * 1.01) * 1.01 = <span className="text-gold">${result.cfo_strategic_report.tax_summary?.total_assessable_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-700 pb-1 mb-1">
                                            <span className="text-gray-400">Cash Incentive (jul272025fepd30.pdf)</span>
                                            <span className="text-green-400 font-bold text-right">
                                                FOB * 0.08 = ${result.cfo_strategic_report.profit_protection?.total_incentives?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">2026 Revenue Risk (STS Chapter 2)</span>
                                            <span className="text-red-400 font-bold text-right">
                                                AV * 0.119 = ${result.cfo_strategic_report.tax_summary?.total_revenue_risk?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Strategic Audit Findings (AI Agent) */}
                                {result.strategic_audit_report && (
                                    <div className="space-y-4 md:col-span-2">
                                        <h4 className="text-xs text-pink-400 uppercase tracking-widest font-bold border-b border-pink-500/30 pb-2">3. Strategic Audit Findings (AI Observation)</h4>
                                        <div className="bg-black/40 p-4 rounded border border-white/10 text-sm leading-relaxed text-gray-300 font-mono whitespace-pre-wrap">
                                            {result.strategic_audit_report}
                                        </div>
                                    </div>
                                )}

                                {/* 4. CA Strategic Advice (Compliance) */}
                                <div className="space-y-4 md:col-span-2">
                                    <h4 className="text-xs text-purple-400 uppercase tracking-widest font-bold border-b border-purple-500/30 pb-2">4. CA Strategic Advice (Rule-Based)</h4>

                                    {/* Recommendations merged here */}
                                    {result.cfo_strategic_report.ca_recommendations?.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {result.cfo_strategic_report.ca_recommendations.map((rec: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-gold/5 border border-gold/10 rounded hover:bg-gold/10 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-black rounded-full text-gold">
                                                            {rec.type === 'Logistics' ? '🚢' : '💰'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-200">{rec.advice}</p>
                                                            <p className="text-xs text-gray-500 uppercase">{rec.type}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-green-400 font-bold font-mono">+${rec.savings?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        <span className="text-[10px] text-gray-500">SAVINGS</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-white/5 border border-white/10 rounded text-center text-gray-400 italic text-sm">
                                            No critical strategic actions identified.
                                        </div>
                                    )}

                                    {/* Small Tax Summary for context */}
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div className="bg-purple-900/10 p-2 rounded border border-purple-500/20 text-center">
                                            <p className="text-[10px] text-purple-400">Current TTI</p>
                                            <p className="font-mono text-white font-bold">{result.cfo_strategic_report.tax_compliance?.current_tti_rate || 0}%</p>
                                        </div>
                                        <div className="bg-red-900/10 p-2 rounded border border-red-500/20 text-center">
                                            <p className="text-[10px] text-red-400">2026 Projected TTI</p>
                                            <p className="font-mono text-white font-bold">{result.cfo_strategic_report.tax_compliance?.future_tti_rate || 0}%</p>
                                        </div>
                                    </div>
                                </div>


                                {/* 5. Profit Protection */}
                                <div className="space-y-4 md:col-span-2">
                                    <h4 className="text-xs text-green-400 uppercase tracking-widest font-bold border-b border-green-500/30 pb-2">5. Profit Protection & Risk</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="p-4 bg-green-900/10 border border-green-500/20 rounded-lg">
                                            <h5 className="text-green-500 text-xs font-bold uppercase mb-2">Cash Incentives</h5>
                                            <p className="text-xl font-mono text-green-400 font-bold">${(result.cfo_strategic_report.profit_protection?.total_incentives || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>

                                        <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                                            <h5 className="text-blue-500 text-xs font-bold uppercase mb-2">Duty Drawback</h5>
                                            <p className="text-xl font-mono text-blue-400 font-bold">${(result.cfo_strategic_report.profit_protection?.duty_drawback || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>

                                        <div className="p-4 bg-red-900/10 border border-red-500/20 rounded-lg">
                                            <h5 className="text-red-500 text-xs font-bold uppercase mb-2">2026 Value at Risk</h5>
                                            <p className="text-xl font-mono text-red-400 font-bold">${(result.cfo_strategic_report.profit_protection?.revenue_risk || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>

                                        <div className="p-4 bg-orange-900/10 border border-orange-500/20 rounded-lg text-center">
                                            <h5 className="text-orange-500 text-xs font-bold uppercase mb-2">LDC Graduation Risk</h5>
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-4xl font-black text-orange-400 text-center">
                                                    {result.cfo_strategic_report.profit_protection?.ldc_graduation_risk_score || 0}
                                                </span>
                                                <span className="text-xs text-orange-300 left-0">/ 10</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-1">Impact Score</p>
                                        </div>

                                        {/* CBAM Alert */}
                                        {(result.cfo_strategic_report.profit_protection?.cbam_liability_eur > 0) && (
                                            <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-lg md:col-span-3">
                                                <h5 className="text-purple-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                                                    <span>🌍</span> EU CBAM Liability (Analysis)
                                                </h5>
                                                <div className="flex justify-between items-end">
                                                    <p className="text-sm text-gray-300 w-3/4">
                                                        Warning: Annex I goods detected. Estimated carbon certificate cost for EU entry.
                                                    </p>
                                                    <p className="text-xl font-mono text-purple-300 font-bold">
                                                        €{result.cfo_strategic_report.profit_protection?.cbam_liability_eur?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}


                    {/* Sum Check Alert - Only show if we actually extracted value */}
                    {result.metadata?.total_invoice_value > 0 && (
                        <div className={`p-4 rounded-lg border flex items-center justify-between ${result.compliance_summary?.sum_check_passed ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                            <div className="flex items-center gap-3">
                                {result.compliance_summary?.sum_check_passed ? <CheckCircle className="text-green-500" /> : <AlertTriangle className="text-red-500" />}
                                <div>
                                    <h3 className="font-bold text-white">Sum Check Validation</h3>
                                    <p className="text-xs text-gray-400">
                                        Declared: ${result.compliance_summary?.declared_total} | Calculated: ${result.compliance_summary?.calculated_total}
                                    </p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded text-xs font-bold ${result.compliance_summary?.sum_check_passed ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                {result.compliance_summary?.sum_check_passed ? 'MATCH' : 'MISMATCH'}
                            </span>
                        </div>
                    )}

                    {/* Line Items Table */}
                    <div className="overflow-x-auto border border-white/10 rounded-lg">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-gray-400 uppercase bg-black/40">
                                <tr>
                                    <th className="px-4 py-3">Format</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3 text-right">Price</th>
                                    <th className="px-4 py-3">HS Code</th>
                                    <th className="px-4 py-3">LDC Impact</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.line_items?.length > 0 ? (
                                    result.line_items.map((item: any, idx: number) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="px-4 py-3 font-mono text-xs">{idx + 1}</td>
                                            <td className="px-4 py-3">{item.description}</td>
                                            <td className="px-4 py-3 text-right">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right">${item.unit_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 font-mono text-gold">
                                                {item.compliance?.is_estimated ? (
                                                    <span className="text-yellow-400 flex items-center gap-1" title="Estimated based on description">
                                                        <AlertTriangle size={12} />
                                                        {item.estimated_hs_code ? `~${item.estimated_hs_code}` : 'Pending'}
                                                    </span>
                                                ) : (
                                                    item.hs_code
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {item.ldc_impact?.impacted ? (
                                                    <span className="text-blue-400 text-xs border border-blue-500/30 px-2 py-0.5 rounded bg-blue-500/10" title={item.ldc_impact.note}>
                                                        2026 Impact
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.compliance?.valid ? (
                                                    <span className="text-green-400 flex items-center gap-1">
                                                        <CheckCircle size={12} />
                                                        {item.compliance.is_estimated ? 'Inferred Match' : 'Valid'}
                                                    </span>
                                                ) : (
                                                    <span className="text-red-400 flex items-center gap-1"><AlertTriangle size={12} /> Check</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-gray-500">
                                            No line items detected.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Developer Debug Toggle (Bottom of card) */}
                    <details className="text-xs text-gray-500 cursor-pointer">
                        <summary>Debug: Raw API Response</summary>
                        <pre className="mt-2 p-2 bg-black rounded overflow-x-auto text-green-400/80">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </details>

                    <button
                        onClick={() => { setResult(null); setFile(null); }}
                        className="w-full py-2 bg-gold/10 text-gold border border-gold/30 rounded hover:bg-gold/20"
                    >
                        Audit Another Document
                    </button>
                </div>
            )}
        </div>
    );
}
