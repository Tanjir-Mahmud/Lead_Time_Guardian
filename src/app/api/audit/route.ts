

import { validateHSCode } from '@/lib/tariffs';
import { runComplianceSwarm } from '@/lib/agents';
import { NextRequest, NextResponse } from 'next/server';
import { calculateAV_Strict, calculateTTI, calculateRevenueRisk, calculateERP, calculateLDCRiskScore, calculateCBAMLiability, calculateLDCRisk_Financial } from '@/lib/financial-brain/calculations';
import { analyzeAirToSeaSavings, auditCashIncentives, calculateDutyDrawback } from '@/lib/financial-brain/strategies';
import { getSupabase } from '@/lib/supabase';

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
        let userId = '00000000-0000-0000-0000-000000000000';
        // Try to fetch user ID for 'Synthetic Steps Ltd'
        const { data: user } = await getSupabase()
            .from('users')
            .select('id')
            .eq('company_name', 'Synthetic Steps Ltd')
            .single();
        if (user) userId = user.id;

        // Fetch Regulatory Rates (Default to Textile/Footwear for this user context)
        let incentiveRate = 0.08;
        let ldcRiskRate = 0.119;

        // We fetch 'Textile' or 'General' as a baseline for the Agent's strategic advice
        const { data: rates } = await getSupabase()
            .from('regulatory_rates')
            .select('incentive_rate, ldc_risk_rate')
            // .eq('category', 'Textile') // defaulting to likely category for Synthetic Steps
            .limit(1)
            .single();

        if (rates) {
            incentiveRate = rates.incentive_rate;
            ldcRiskRate = rates.ldc_risk_rate;
        }

        // Run Compliance Swarm with Live Context
        const swarmResults = await runComplianceSwarm(base64Image, mimeType, { incentiveRate, ldcRiskRate });

        // Aggregation Logic (Enhanced)
        const verifier = swarmResults.find(r => r.agentName === 'Document Verifier')?.output || {};
        const auditor = swarmResults.find(r => r.agentName === 'HS Code Auditor')?.output || {};
        const calculator = swarmResults.find(r => r.agentName === 'Strategic Compliance Auditor')?.output || {}; // Updated Name

        // --- END PRE-FETCH ---

        // 1. Line Item Validation & LDC Impact
        const lineItems = Array.isArray(verifier.line_items) ? verifier.line_items : [];
        const validatedItems = lineItems.map((item: any) => {
            const isPending = item.hs_code === 'Pending' || !item.hs_code;
            const codeToValidate = isPending ? item.estimated_hs_code : item.hs_code;
            const hsCode = codeToValidate ? String(codeToValidate) : null;

            let compliance = null;
            let financial = null;

            if (hsCode) {
                const tariffInfo = validateHSCode(hsCode, item.description || '');

                // Check for strict correction from Lead-Time Guardian Logic
                // @ts-ignore
                const isCorrection = tariffInfo?.is_correction;
                // @ts-ignore
                const correctionNote = tariffInfo?.note;

                compliance = tariffInfo ? {
                    valid: !isCorrection, // invalid if it was a forced correction
                    description_match: tariffInfo.Description?.toLowerCase().includes(item.description?.toLowerCase() || ''),
                    tariff_rate: tariffInfo.TTI,
                    is_estimated: isPending,
                    correction_suggestion: isCorrection ? correctionNote : null
                } : { valid: false, note: 'HS Code not found', is_estimated: isPending };

                // --- Financial Brain Integration (Per Item) ---
                if (tariffInfo) {
                    const itemValue = Number(item.total_price || item.invoice_value || 0); // Treated as FOB
                    const itemWeight = Number(item.net_weight || item.quantity || 0);

                    // Strict AV Calculation (FOB * 1.01 * 1.01)
                    const av = calculateAV_Strict(itemValue);

                    // LDC Risk Analysis
                    const isRMG = (hsCode.startsWith('61') || hsCode.startsWith('62'));
                    const currentRate = tariffInfo.TTI || 0;

                    // Normalize fetched rate to percentage for addition
                    const extraRate = ldcRiskRate > 1 ? ldcRiskRate : ldcRiskRate * 100;
                    const futureRate = currentRate + extraRate;
                    const riskScore = calculateLDCRiskScore(currentRate, futureRate, isRMG);

                    // Financial Risk (Exact fetched rate of AV)
                    const riskRateDecimal = ldcRiskRate > 1 ? ldcRiskRate / 100 : ldcRiskRate;
                    const ldcFinancialRisk = av * riskRateDecimal;

                    // ERP Analysis
                    const erpAnalysis = calculateERP(15, currentRate);

                    // CBAM Analysis
                    const cbam = calculateCBAMLiability(item.description || '', itemWeight);

                    financial = {
                        assessable_value: av,
                        duty_rate: tariffInfo.TTI,
                        revenue_at_risk: ldcFinancialRisk,
                        ldc_risk_score: riskScore,
                        erp_analysis: erpAnalysis,
                        cbam_liability: cbam
                    };
                }

            } else {
                compliance = { valid: false, note: 'HS Code Missing & Inference Failed' };
            }

            return {
                ...item,
                compliance,
                financial,
                ldc_impact: (hsCode && (hsCode.startsWith('61') || hsCode.startsWith('62')))
                    ? { impacted: true, note: 'Review for 2026 Graduation' }
                    : null
            };
        });

        // 2. Sum Check
        const calculatedTotal = validatedItems.reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0);
        const declaredTotal = Number(verifier.total_invoice_value || verifier.invoice_total) || 0;
        const sumCheckPassed = Math.abs(calculatedTotal - declaredTotal) < 5.0;

        // --- CFO Strategic Report Generation ---

        // Strategy 1: Air vs Sea
        const airCost = resultEstimate(declaredTotal, 'Air');
        const seaCost = resultEstimate(declaredTotal, 'Sea');
        const logisticsStrategy = await analyzeAirToSeaSavings(
            { mode: 'Air', cost: airCost, timeDays: 3, congestionLevel: 'Low' },
            { mode: 'Sea', cost: seaCost, timeDays: 25, congestionLevel: 'Low' }
        );

        // Strategy 2: Incentives
        // Override with fetched logic
        // If rate is > 0, we assume eligibility for "fetched" program
        let incentiveAmt = 0;
        let incentiveEligible = false;

        // Use fetched rate instead of hardcoded strategies check
        if (incentiveRate > 0) {
            const rateDecimal = incentiveRate > 1 ? incentiveRate / 100 : incentiveRate;
            incentiveAmt = declaredTotal * rateDecimal;
            incentiveEligible = true;
        } else {
            // Fallback to old logic if fetch likely failed (rate 0) or no row
            const mainDesc = validatedItems.map((i: any) => i.description).join(' ');
            const incentiveAudit = auditCashIncentives(mainDesc, declaredTotal);
            if (incentiveAudit.eligible) {
                incentiveAmt = incentiveAudit.potentialReward;
                incentiveEligible = true;
            }
        }

        // Strategy 3: Duty Drawback (Mock Cross-Reference)
        const mockImportBill = {
            id: 'BE-2025-998877',
            importValue: declaredTotal * 0.40, // Assuming 40% raw material cost
            items: ['Synthetic Fabric', 'Yarn', 'Dyes'] // Simulated raw materials
        };
        const currentExportBill = {
            id: verifier.invoice_number || 'EXP-TEMP',
            exportValue: declaredTotal,
            items: validatedItems.map((i: any) => i.description || '')
        };
        const dutyDrawback = calculateDutyDrawback(mockImportBill, currentExportBill);

        // Aggregate Risk
        const maxRiskScore = Math.max(...validatedItems.map((i: any) => i.financial?.ldc_risk_score || 0));
        const totalCBAM = validatedItems.reduce((sum: number, i: any) => sum + (i.financial?.cbam_liability?.liabilityEUR || 0), 0);

        const cfoReport = {
            shipment_health: await import('@/lib/financial-brain/strategies').then(m => m.fetchLogisticsStatus()),
            tax_compliance: {
                current_tti_rate: validatedItems[0]?.compliance?.tariff_rate || 0,
                future_tti_rate: (validatedItems[0]?.compliance?.tariff_rate || 0) + (ldcRiskRate > 1 ? ldcRiskRate : ldcRiskRate * 100),
            },
            ca_recommendations: [
                logisticsStrategy.savings > 0 ? { type: 'Logistics', advice: logisticsStrategy.message, savings: logisticsStrategy.savings } : null,
                incentiveEligible ? { type: 'Incentive', advice: `Claim Incentive (${(incentiveRate > 1 ? incentiveRate : incentiveRate * 100).toFixed(2)}% via Supabase)`, savings: incentiveAmt } : null,
                dutyDrawback > 0 ? { type: 'Drawback', advice: `Claim Duty Drawback (Ref: BE-${mockImportBill.id})`, savings: dutyDrawback } : null,
                validatedItems[0]?.financial?.erp_analysis?.recommendation ? { type: 'Strategic', advice: validatedItems[0]?.financial?.erp_analysis?.recommendation, savings: 0 } : null,
                totalCBAM > 0 ? { type: 'Compliance', advice: 'Prepare CBAM Carbon Certificate for EU Customs', savings: 0 } : null
            ].filter(Boolean),
            profit_protection: {
                total_incentives: incentiveAmt,
                duty_drawback: dutyDrawback,
                revenue_risk: validatedItems.reduce((sum: number, i: any) => sum + (i.financial?.revenue_at_risk || 0), 0),
                ldc_graduation_risk_score: maxRiskScore,
                cbam_liability_eur: totalCBAM
            },
            logistics_advice: logisticsStrategy,
            incentive_audit: { eligible: incentiveEligible, potentialReward: incentiveAmt },
            tax_summary: {
                total_assessable_value: validatedItems.reduce((sum: number, i: any) => sum + (i.financial?.assessable_value || 0), 0),
                total_revenue_risk: validatedItems.reduce((sum: number, i: any) => sum + (i.financial?.revenue_at_risk || 0), 0)
            }
        };

        const data: any = {
            metadata: {
                invoice_number: verifier.invoice_number,
                date: verifier.invoice_date,
                origin: verifier.origin_country,
                total_invoice_value: declaredTotal
            },
            compliance_summary: {
                sum_check_passed: sumCheckPassed,
                calculated_total: calculatedTotal,
                declared_total: declaredTotal,
                risk_level: calculator.risk_level || (sumCheckPassed ? 'Low' : 'High'),
                potential_fine: calculator.potential_fine_bdt || 0
            },
            line_items: validatedItems,
            cfo_strategic_report: cfoReport,
            // New Strategic Report from Agent
            strategic_audit_report: calculator.formatted_audit_report,
            swarm_thoughts: swarmResults.map(r => ({ agent: r.agentName, thought: r.thoughtSignature }))
        };

        // --- AUDIT LOG STORAGE ---
        await getSupabase().from('audit_logs').insert([{
            user_id: userId,
            invoice_number: data.metadata?.invoice_number || 'UNKNOWN',
            assessable_value: cfoReport.tax_summary.total_assessable_value,
            incentive_amount: cfoReport.profit_protection.total_incentives,
            risk_amount: cfoReport.tax_summary.total_revenue_risk,
            audit_json: data,
            created_at: new Date().toISOString()
        }]);

        return NextResponse.json(data);

    } catch (error) {
        console.error('Audit API Error:', error);
        // @ts-ignore
        const errorMessage = error?.message || 'Unknown error';
        // @ts-ignore
        const errorStack = error?.stack || '';
        return NextResponse.json({ error: `Failed to process document: ${errorMessage}`, stack: errorStack }, { status: 500 });
    }
}

// Helper to estimate freight for strategy demo
function resultEstimate(value: number, mode: 'Air' | 'Sea') {
    const weightEst = value / 10;
    return mode === 'Air' ? weightEst * 5.0 : weightEst * 0.5;
}
