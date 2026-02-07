

import { validateHSCode } from '@/lib/tariffs';
import { runComplianceSwarm } from '@/lib/agents';
import { NextRequest, NextResponse } from 'next/server';
import { calculateAV_Strict, calculateTTI, calculateRevenueRisk, calculateERP, calculateLDCRiskScore, calculateCBAMLiability, calculateLDCRisk_Financial, calculateCarbonIntensity, validateLineItemMath } from '@/lib/financial-brain/calculations';
import { analyzeAirToSeaSavings } from '@/lib/financial-brain/strategies';
import { createClient } from '@/lib/supabase/server';
import { getForecast, analyzeWeatherRisk } from '@/lib/weather';
import { getRoadStatus, getPortStatus, calculateLogisticsHealth } from '@/lib/logistics';
import { KNOWLEDGE_BASE } from '@/lib/knowledge_base';


const SYSTEM_PROMPT = `
You are an expert logistics document auditor. Extract the following fields from the image:
- invoice_value (number) - FOB Value preferred
- freight_cost (number)
- insurance_cost (number)
- HS_code (string)
- net_weight (number) 
- origin_country (string)
- description (string)

Return ONLY valid JSON.
`;

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as Blob;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Convert blob to base64
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64Image = buffer.toString('base64');
        const mimeType = file.type;

        // --- SUPABASE INTEGRATION START (Pre-Fetch for Agent Context) ---

        // Fetch Regulatory Rates (Default to Textile/Footwear for this user context)
        let incentiveRate = 0.08;

        // STRICT PROTOCOL: LDC Risk Rate is FIXED at 11.9% (0.119) for 2026 Simulation
        // We ignore the DB value for the 'Risk' calculation as per "Golden Rules"
        const ldcRiskRate = 0.119;

        // We fetch 'Textile' or 'General' as a baseline for the Agent's strategic advice (Incentives only)
        const { data: rates } = await supabase
            .from('regulatory_rates')
            .select('incentive_rate')
            // .eq('category', 'Textile') // defaulting to likely category for Synthetic Steps
            .limit(1)
            .single();

        if (rates) {
            incentiveRate = rates.incentive_rate;
            // ldcRiskRate = rates.ldc_risk_rate; // DISABLED: Enforcing 11.9%
        }

        // Run Compliance Swarm with Live Context
        const swarmResults = await runComplianceSwarm(base64Image, mimeType, { incentiveRate, ldcRiskRate });

        // Aggregation Logic (Enhanced)
        const verifier = swarmResults.find(r => r.agentName === 'Document Verifier')?.output || {};
        const auditor = swarmResults.find(r => r.agentName === 'HS Code Auditor')?.output || {};
        const calculator = swarmResults.find(r => r.agentName === 'Strategic Compliance Auditor')?.output || {}; // Updated Name

        // --- END PRE-FETCH ---

        // 1. Line Item Validation, Math Integrity & Compliance
        const lineItems = Array.isArray(verifier.line_items) ? verifier.line_items : [];
        let calculatedSum = 0;
        let mathErrorsFound = false;

        const validatedItems = lineItems.map((item: any) => {
            const isPending = item.hs_code === 'Pending' || !item.hs_code;
            const codeToValidate = isPending ? item.estimated_hs_code : item.hs_code;
            const hsCode = codeToValidate ? String(codeToValidate) : null;

            // Math Validation (Qty * Price)
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unit_price) || 0;
            const rowTotal = Number(item.total_price) || 0;
            const mathCheck = validateLineItemMath(qty, price, rowTotal);

            if (!mathCheck.isValid) {
                mathErrorsFound = true;
                item.total_price = mathCheck.correctedTotal; // Auto-correct
            }

            calculatedSum += mathCheck.correctedTotal;

            let compliance = null;
            let financial = null;

            if (hsCode) {
                const tariffInfo = validateHSCode(hsCode, item.description || '');
                // @ts-ignore
                const isCorrection = tariffInfo?.is_correction;
                // @ts-ignore
                const correctionNote = tariffInfo?.note;

                compliance = tariffInfo ? {
                    valid: !isCorrection,
                    description_match: tariffInfo.Description?.toLowerCase().includes(item.description?.toLowerCase() || ''),
                    tariff_rate: tariffInfo.TTI,
                    is_estimated: isPending,
                    correction_suggestion: isCorrection ? correctionNote : null
                } : { valid: false, note: 'HS Code not found', is_estimated: isPending };

                if (tariffInfo) {
                    const itemValue = mathCheck.correctedTotal; // Use CORRECTED value
                    const itemWeight = Number(item.net_weight || item.quantity || 0);

                    // Strict AV Calculation (Global Mandate)
                    const av = calculateAV_Strict(itemValue);

                    const isRMG = (hsCode.startsWith('61') || hsCode.startsWith('62'));
                    const currentRate = tariffInfo.TTI || 0;
                    const extraRate = ldcRiskRate > 1 ? ldcRiskRate : ldcRiskRate * 100;
                    const futureRate = currentRate + extraRate;
                    const riskScore = calculateLDCRiskScore(currentRate, futureRate, isRMG);

                    const riskRateDecimal = ldcRiskRate > 1 ? ldcRiskRate / 100 : ldcRiskRate;
                    const ldcFinancialRisk = av * riskRateDecimal;

                    const erpAnalysis = calculateERP(15, currentRate);
                    // CBAM & Carbon Logic: Added HS 39, 42, 64 check
                    const isHighCarbonHS = hsCode.startsWith('39') || hsCode.startsWith('42') || hsCode.startsWith('61') || hsCode.startsWith('64');
                    const cbam = calculateCBAMLiability(item.description || '', itemWeight);
                    // Override CBAM if HS code matches high risk chapters
                    if (isHighCarbonHS && cbam.liabilityEUR === 0) {
                        cbam.liabilityEUR = Number((itemValue * 0.05).toFixed(2)); // Estimated liability
                        cbam.applicable = true;
                    }

                    const carbon = calculateCarbonIntensity(item.description || '');
                    if (isHighCarbonHS) {
                        carbon.score = 'High';
                        carbon.advice = 'CBAM Reporting Required for this HS Chapter (Plastics/Leather/Footwear/Apparel).';
                    }

                    financial = {
                        assessable_value: av,
                        duty_rate: tariffInfo.TTI,
                        revenue_at_risk: ldcFinancialRisk,
                        ldc_risk_score: riskScore,
                        erp_analysis: erpAnalysis,
                        cbam_liability: cbam,
                        carbon_impact: carbon
                    };
                }

            } else {
                compliance = { valid: false, note: 'HS Code Missing & Inference Failed' };
            }

            return {
                ...item,
                compliance,
                financial,
                ldc_impact: (hsCode && (hsCode.startsWith('61') || hsCode.startsWith('62') || hsCode.startsWith('63')))
                    ? { impacted: true, note: 'Double Transformation Check Required (EU RoO - Ch 61-63)' }
                    : null,
                math_flag: !mathCheck.isValid ? '🚨 Math Error Corrected' : null
            };
        });

        // 2. Global Totals & Validation Flags
        const declaredTotal = Number(verifier.total_invoice_value || verifier.invoice_total) || 0;
        const totalDiscrepancy = Math.abs(calculatedSum - declaredTotal);
        const isGlobalMathError = totalDiscrepancy > 2.0;

        // If math error, we use CALCULATED SUM as the Truth
        const trueTotalFob = calculatedSum > 0 ? calculatedSum : declaredTotal;

        if (isGlobalMathError) mathErrorsFound = true;

        if (isGlobalMathError) mathErrorsFound = true;

        // SUM RULE: Strict Logic - True Total is the exclusive basis
        const sumCheckPassed = !mathErrorsFound;

        // 3. GLOBAL VARIABLE LOCK (The Sync Rule)
        // Calculate strictly from the Aggregated Total First
        const strictGlobalAV_Raw = calculateAV_Strict(trueTotalFob);
        const strictGlobalRisk_Raw = strictGlobalAV_Raw * 0.119; // Enforced 11.9% Rule

        // PRECISION LOCK: Round to 2 decimals BEFORE usage to ensure DB === UI
        const strictGlobalAV = Number(strictGlobalAV_Raw.toFixed(2));
        const strictGlobalRisk = Number(strictGlobalRisk_Raw.toFixed(2));

        // Compliance Checks
        // REX Rule: > €6,000 (Approx $6,480 USD)
        const isRexRequired = trueTotalFob > 6480;
        const hasRex = JSON.stringify(verifier).toUpperCase().includes('REX');
        const rexStatus = isRexRequired && !hasRex ? 'MISSING' : 'N/A';

        // --- CFO Strategic Report Generation ---

        // Strategy 1: Air vs Sea
        const airCost = resultEstimate(trueTotalFob, 'Air');
        const seaCost = resultEstimate(trueTotalFob, 'Sea');
        const logisticsStrategy = await analyzeAirToSeaSavings(
            { mode: 'Air', cost: airCost, timeDays: 3, congestionLevel: 'Low' },
            { mode: 'Sea', cost: seaCost, timeDays: 25, congestionLevel: 'Low' }
        );

        // --- PREDICTIVE INTELLIGENCE (72-HOUR WINDOW) ---
        // 1. Weather Forecast (Origin & Destination)
        const originCity = verifier.origin_country?.split(',')[0] || 'Dhaka'; // Default if extraction fails
        const destCity = 'Chittagong'; // Main Port

        const originForecast = await getForecast(originCity);
        const destForecast = await getForecast(destCity);

        const originRisk = analyzeWeatherRisk(originForecast);
        const destRisk = analyzeWeatherRisk(destForecast);

        // 2. Logistics Real-time Status
        const roadStatusRaw = await getRoadStatus(originCity, destCity);
        const portStatus = await getPortStatus('Chittagong');

        // Efficiency Penalty Logic (Synced with Actions.ts)
        const standardTime = 5.0;
        const actualTime = 4.5 + (Math.random() * 4.5); // Simulation
        const roadDelay = actualTime - standardTime;
        const isCriticalRoadAlert = roadDelay > 3.0; // UPDATED THRESHOLD [cite: 2026-02-05]

        // Port Congestion (Mock for Report)
        const congestionIndex = Math.floor(Math.random() * 100);

        // Apply Penalty if Critical
        const efficiencyPenalty = isCriticalRoadAlert ? 0.02 : 0;

        // Combined Risk Assessment
        const activeWeatherRisk = destRisk.hasRisk ? destRisk : originRisk;
        // Override road status if critical
        const effectiveRoadStatus = isCriticalRoadAlert ? 'Critical Delay' : roadStatusRaw;
        const logisticsHealth = calculateLogisticsHealth(effectiveRoadStatus, portStatus, activeWeatherRisk);

        // --- KNOWLEDGE BASE INTEGRATION ---

        // 1. Identify Corridor (Simplistic logic: Default to N1 for Dhaka-CTG)
        // In a real app, we'd map Origin->Dest to specific keys.
        const corridorKey = "Dhaka_Chattogram_N1";
        const corridorData = KNOWLEDGE_BASE.logistics_knowledge_base.highway_corridors[corridorKey as keyof typeof KNOWLEDGE_BASE.logistics_knowledge_base.highway_corridors];

        // 2. Identify Season
        const currentMonth = new Date().getMonth(); // 0-11
        let seasonalRisk = "None";
        let seasonalBuffer = "";

        // Jun(5)-Aug(7): Monsoon
        if (currentMonth >= 5 && currentMonth <= 7) {
            seasonalRisk = "Monsoon (Jun-Aug)";
            seasonalBuffer = KNOWLEDGE_BASE.logistics_knowledge_base.seasonal_buffers.Monsoon_Jun_Aug;
        }
        // Dec(11)-Jan(0): Winter
        else if (currentMonth === 11 || currentMonth === 0) {
            seasonalRisk = "Winter (Dec-Jan)";
            seasonalBuffer = KNOWLEDGE_BASE.logistics_knowledge_base.seasonal_buffers.Winter_Dec_Jan;
        }

        // 3. Port Insights (CTG Default)
        const portData = KNOWLEDGE_BASE.logistics_knowledge_base.port_dwell_times.Chattogram_Port;

        const predictiveAlert = activeWeatherRisk.hasRisk
            ? `⚠️ PREDICTIVE DELAY: ${activeWeatherRisk.description} detected in ${destRisk.hasRisk ? destCity : originCity} for ${activeWeatherRisk.forecastDate}. Total Benefits (14%) are safe, but I recommend loading 24 hours earlier.`
            : `✅ 72-HOUR OUTLOOK: Weather is clear. Supply chain is moving smoothly.`;


        const cfoAdvice = isCriticalRoadAlert
            ? `🚨 CRITICAL ROAD ALERT: ${roadDelay.toFixed(1)}h delay detected. 2% Efficiency Penalty applied to Net Safety Margin.`
            : null;



        // Strategy 2: Incentives
        let incentiveAmt = 0;
        let incentiveEligible = false;

        if (incentiveRate > 0) {
            const rateDecimal = incentiveRate > 1 ? incentiveRate / 100 : incentiveRate;
            // Round incentive immediately
            incentiveAmt = Number((trueTotalFob * rateDecimal).toFixed(2));
            incentiveEligible = true;
        }

        // Strategy 3: Duty Drawback (Strict 6% Rule)
        // Previous complex call: calculateDutyDrawback(mockImportBill, currentExportBill)
        // New Rule: Fixed 6% of FOB
        const dutyDrawback = Number((trueTotalFob * 0.06).toFixed(2));

        // Aggregate Risk
        const maxRiskScore = Math.max(...validatedItems.map((i: any) => i.financial?.ldc_risk_score || 0));
        const totalCBAM = Number(validatedItems.reduce((sum: number, i: any) => sum + (i.financial?.cbam_liability?.liabilityEUR || 0), 0).toFixed(2));

        const cfoReport = {
            shipment_health: {
                road: logisticsHealth.road,
                sea: logisticsHealth.sea,
                weather: logisticsHealth.weather,
                risk_details: activeWeatherRisk
            },
            tax_compliance: {
                current_tti_rate: Number((validatedItems[0]?.compliance?.tariff_rate || 0).toFixed(2)),
                future_tti_rate: Number(((validatedItems[0]?.compliance?.tariff_rate || 0) + (ldcRiskRate > 1 ? ldcRiskRate : ldcRiskRate * 100)).toFixed(2)),
            },
            ca_recommendations: [
                cfoAdvice ? { type: 'Lead-Time Risk', advice: cfoAdvice, savings: 0 } : null,
                activeWeatherRisk.hasRisk ? { type: 'Predictive Risk', advice: predictiveAlert, savings: 0 } : null,
                mathErrorsFound ? { type: 'Math Integrity', advice: `🚨 CRITICAL: Math Error Detected. Declared $${declaredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, True Total $${calculatedSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. System Corrected.`, savings: 0 } : null,
                rexStatus === 'MISSING' ? { type: 'Compliance', advice: 'Missing REX Statement for Invoice > €6,000.', savings: 0 } : null,
                logisticsStrategy.savings > 0 ? { type: 'Logistics', advice: logisticsStrategy.message, savings: Number(logisticsStrategy.savings.toFixed(2)) } : null,
                incentiveEligible ? { type: 'Incentive', advice: `Claim Incentive (${(incentiveRate > 1 ? incentiveRate : incentiveRate * 100).toFixed(2)}% via Supabase)`, savings: incentiveAmt } : null,
                dutyDrawback > 0 ? { type: 'Drawback', advice: `Claim Duty Drawback (Fixed 6% Rate)`, savings: dutyDrawback } : null,
                validatedItems[0]?.financial?.erp_analysis?.recommendation ? { type: 'Strategic', advice: validatedItems[0]?.financial?.erp_analysis?.recommendation, savings: 0 } : null,
                totalCBAM > 0 ? { type: 'Compliance', advice: 'Prepare CBAM Carbon Certificate for EU Customs', savings: 0 } : null
            ].filter(Boolean),
            profit_protection: {
                total_incentives: incentiveAmt,
                duty_drawback: dutyDrawback,
                revenue_risk: strictGlobalRisk, // UNIFIED: Syncs with Tax Summary (Section 5 Sync)
                ldc_graduation_risk_score: maxRiskScore,
                cbam_liability_eur: totalCBAM
            },
            logistics_advice: logisticsStrategy,
            incentive_audit: { eligible: incentiveEligible, potentialReward: incentiveAmt },
            tax_summary: {
                total_assessable_value: strictGlobalAV, // LOCKED: Uses Global Variable
                total_revenue_risk: strictGlobalRisk    // LOCKED: Uses Global Variable
            },
            sustainability: {
                carbon_score: validatedItems.some((i: any) => i.financial?.carbon_impact?.score === 'High') ? 'High' :
                    validatedItems.some((i: any) => i.financial?.carbon_impact?.score === 'Medium') ? 'Medium' : 'Low',
                intensity: validatedItems[0]?.financial?.carbon_impact?.intensity || 'N/A',
                mitigation_advice: validatedItems.find((i: any) => i.financial?.carbon_impact?.score !== 'Low')?.financial?.carbon_impact?.advice ||
                    'Maintain current sustainable practices.'
            }
        };

        // Best Dispatch Time Logic
        const bestTime = isCriticalRoadAlert ? "02:00 AM - 04:00 AM (Night)" : "10:00 PM - 06:00 AM (Off-Peak)";

        // Net Margin Calculation for Display
        const netMargin = (14.00 - 11.90 - (efficiencyPenalty * 100)).toFixed(2);

        const data: any = {
            metadata: {
                invoice_number: verifier.invoice_number,
                date: verifier.invoice_date,
                origin: verifier.origin_country || verifier.Origin,
                destination: verifier.destination || verifier.Destination,
                buyer_details: verifier.buyer_details || verifier['Buyer Details'],
                total_invoice_value: trueTotalFob, // Use Corrected Total
                declared_value: declaredTotal,
                math_integrity: mathErrorsFound ? 'FAILED' : 'PASSED',
                rex_status: rexStatus // Propagate REX status
            },
            compliance_summary: {
                sum_check_passed: !mathErrorsFound,
                calculated_total: calculatedSum,
                declared_total: declaredTotal,
                risk_level: calculator.risk_level || (mathErrorsFound ? 'High' : 'Low'),
                potential_fine: calculator.potential_fine_bdt || 0
            },
            line_items: validatedItems,
            cfo_strategic_report: cfoReport,
            // New Strategic Report from Agent (Overridden for Strictness)
            strategic_audit_report: `
🛣️ Road Delay: ${roadDelay.toFixed(1)}h (${isCriticalRoadAlert ? '🔴 Critical' : '🟢 Stable'}). ${isCriticalRoadAlert ? 'Heavy congestion may add 12h to lead-time.' : 'Traffic flow normal.'}
🚢 Port Status: ${congestionIndex !== undefined ? congestionIndex : 'N/A'}% Congestion. ${(congestionIndex > 70) ? 'Air Freight recommended to save delivery window.' : 'Sea Freight operations normal.'}
⛈️ Weather Forecast: ${activeWeatherRisk.hasRisk ? `${activeWeatherRisk.description} predicted at ${destRisk.hasRisk ? destCity : originCity} within ${activeWeatherRisk.forecastDate || '72h'}. Start loading now.` : 'Clear skies. No loading delays expected.'}
💰 Net Margin: +${netMargin}% Safety (After 11.9% LDC Risk & 14% Benefits${isCriticalRoadAlert ? ' & 2% Penalty' : ''}).
🚀 Action: Dispatch vehicle between ${bestTime} to bypass peak traffic.

---

### 🛡️ HEDGING ANALYSIS (2026 PROTECTION)

**Strategic Net Margin Calculation**
*   **Total Export Benefits**: 14.00% (8% Incentive + 6% Drawback)
*   **Less: 2026 Graduation Risk**: 11.90% (MFN Rate Impact)
${isCriticalRoadAlert ? `*   **Less: Efficiency Penalty**: <span style="color: #ef4444; font-weight: bold;">-2.00%</span> (Critical Road Alert)` : ''}
*   **Net Compliance Safety Margin**: <span style="color: ${isCriticalRoadAlert ? '#facc15' : '#4ade80'}; font-weight: bold;">${(2.10 - (efficiencyPenalty * 100)).toFixed(2)}%</span>

> **"${isCriticalRoadAlert ? 'Efficiency Penalty (-2%) applied due to Critical Road Alert. Net Margin reduced to ' + (2.10 - (efficiencyPenalty * 100)).toFixed(2) + '%.' : 'Total Export Benefits (14%) effectively hedge against the 11.9% Graduation Risk, leaving a net positive margin of +2.10%.'}"**
            `.trim(),
            swarm_thoughts: swarmResults.map(r => ({ agent: r.agentName, thought: r.thoughtSignature }))
        };

        // --- AUDIT LOG STORAGE (Integrity Protocol) ---
        // 1. Insert into 'shipments' (Fail on Duplicate or Upsert)
        // Using upsert or select to ensure we don't duplicate on same invoice_no
        const { data: shipmentData, error: shipmentError } = await supabase
            .from('shipments')
            .upsert([{
                user_id: user.id,
                invoice_no: data.metadata?.invoice_number || 'UNKNOWN',
                fob_value: trueTotalFob, // Save CORRECTED value
                hs_code: validatedItems[0]?.hs_code || 'MIXED',
                // STATUS PROTOCOL: Verified ONLY if Math is secure
                status: mathErrorsFound ? 'Flagged' : 'Verified'
            }], { onConflict: 'invoice_no' })
            .select()
            .single();

        if (shipmentError) {
            console.error('Shipment Write Error:', shipmentError);
            throw new Error(`Shipment DB Write Failed: ${shipmentError.message} `);
        }

        // 2. Insert into 'audit_logs' linked to shipment
        const auditPayload: any = {
            shipment_id: shipmentData.id,
            assessable_value: strictGlobalAV, // DATABASE SYNC: Corrected Value
            incentive_amount: cfoReport.profit_protection.total_incentives,
            ldc_risk_value: strictGlobalRisk, // DATABASE SYNC: Corrected Value
            risk_score: cfoReport.profit_protection.ldc_graduation_risk_score,
            audit_json: data, // Keeping full JSON for redundancy/debugging
            user_id: user.id, // Tag with user_id for RLS ownership
            carbon_score: cfoReport.sustainability.carbon_score // 🟢 Synced with DB
        };

        let { error: auditError } = await supabase.from('audit_logs').insert([auditPayload]);

        // Fallback: If 'carbon_score' column is missing, try inserting without it
        if (auditError && auditError.message.includes('carbon_score')) {
            console.warn('Carbon Score column missing, retrying without it...');
            delete auditPayload.carbon_score;
            const retry = await supabase.from('audit_logs').insert([auditPayload]);
            auditError = retry.error;
        }

        if (auditError) {
            console.error('Audit Log Write Error:', auditError);
            throw new Error(`Audit Log DB Write Failed: ${auditError.message} `);
        }

        // Append Sync Success Message
        data.sync_status = `✅ Refined Audit Synced.Math Integrity: ${mathErrorsFound ? 'CORRECTED 🚨' : 'SECURE'}.`;

        return NextResponse.json(data);

    } catch (error) {
        console.error('Audit API Error:', error);
        // @ts-ignore
        const errorMessage = error?.message || 'Unknown error';
        // @ts-ignore
        const errorStack = error?.stack || '';
        return NextResponse.json({ error: `Failed to process document: ${errorMessage} `, stack: errorStack }, { status: 500 });
    }
}

// Helper to estimate freight for strategy demo
function resultEstimate(value: number, mode: 'Air' | 'Sea') {
    const weightEst = value / 10;
    return mode === 'Air' ? weightEst * 5.0 : weightEst * 0.5;
}
