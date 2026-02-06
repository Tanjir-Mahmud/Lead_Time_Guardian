
import { getOpenRouter } from './openrouter';
import { validateHSCode } from './tariffs';

export interface AgentResult {
    agentName: string;
    thoughtSignature: string; // The "reasoning" from Gemini
    output: any;
    status: 'success' | 'failure';
}

// Helper to simulate thought persistence
async function persistThoughtSignature(agent: string, thought: string) {
    console.log(`[${agent} Thought]: ${thought}`);
    // In a real app, save to Supabase 'thought_signatures' table
    // await supabase.from('thought_signatures').insert({ agent, thought });
}

export async function runComplianceSwarm(fileBase64: string, mimeType: string, context?: { incentiveRate?: number, ldcRiskRate?: number }) {
    const results: AgentResult[] = [];

    // Defaults if context missing
    const incentiveRate = context?.incentiveRate !== undefined ? context.incentiveRate : 0.08;
    const ldcRiskRate = context?.ldcRiskRate !== undefined ? context.ldcRiskRate : 0.119;

    // Format as percentages for the prompt
    const incPct = (incentiveRate > 1 ? incentiveRate : incentiveRate * 100).toFixed(2) + '%';
    const ldcPct = (ldcRiskRate > 1 ? ldcRiskRate : ldcRiskRate * 100).toFixed(1) + '%';

    // 1. Document Verifier (Universal Parser Mode)
    const verifierPrompt = `
    You are the 'Document Verifier' agent acting as a Universal Document Parser.
    Analyze the provided document image (Commercial Invoice / Bill of Entry).
    
    1. Flexible Extraction:
       - Invoice #: Identify identifying string labeled as 'Invoice', 'Ref', or 'Document No'.
       - Origin: Extract 'City, Country' from Exporter/Shipper address.
       - Destination: Extract 'City, Country' from Consignee/Buyer address.
       - Buyer Details: Extract Name and Address of the Buyer/Consignee.
       - Invoice Total: Find the final value (labeled 'Total', 'FOB', 'Grand Total', or 'Net Payable').
       
    2. Line-Item Extraction:
       - Identify all rows with a Description and HS Code.
       - Extract:
         - description (string)
         - hs_code (string): If missing/illegible, set to "Pending".
         - estimated_hs_code (string): If missing, provide the most likely 6-digit code based on description.
         - quantity (number)
         - unit_price (number)
         - total_price (number)

    Return ONLY JSON. Ensure 'line_items' is a valid array.
    `;

    // 2. HS Code Auditor Agent
    const auditorPrompt = `
    You are the 'HS Code Auditor' agent.
    Analyze the document visual layout and descriptions.
    For each item visible, identify the most appropriate HS Code (2026 Bangladesh Tariff Schedule).
    Compare with standard RMG/Pharma codes (e.g. 6109.10.00, 3004.90.99).
    Output JSON: { 
        detected_codes: Array<{ code: string, description: string, confidence: number }>,
        overall_mismatch_risk: boolean 
    }.
    `;

    // 3. Strategic Strategic Compliance Agent (The Logic Hub)
    const strategicPrompt = `
    You are an expert AI auditor responsible for processing real-world commercial invoices. Your goal is 100% mathematical accuracy and strategic compliance using your connected database and knowledge base.

    # 1. DATA EXTRACTION (REAL-TIME PARSING)
    - OCR SCAN: Scan the uploaded invoice for 'FOB Value', 'HS Code', 'Origin', 'Destination', and 'Buyer Details'.
    - UNIT PRICE CHECK: Multiply Qty by Unit Price to verify the 'Invoice Total'. If there is a mismatch, flag a 'Sum Check Error'.

    # 2. MANDATORY CALCULATION LOGIC (NO ZERO TOLERANCE)
    - STEP 1 (AV): Calculate Assessable Value (AV) using 'Customs_Act_23_English.pdf'. 
      - Formula: (FOB * 1.01) * 1.01. This is non-negotiable.
    - STEP 2 (INCENTIVE): Use the LIVE 'incentive_rate' provided here: ${incPct}.
      - Apply this rate if it matches the product description (e.g. Synthetic Footwear).
    - STEP 3 (LDC RISK): Use the LIVE 'ldc_risk_rate' provided here: ${ldcPct}.
      - Formula: AV * (Rate).

    # 3. STRATEGIC COMPLIANCE (RULE-BASED)
    - EU GSP RULES: If Destination is Europe, check if the fabric meets 'Double Transformation' from 'EU Rules of Origin.pdf'.
    - REX VALIDATION: If Invoice Total > €6,000, verify the presence of a REX statement. If missing, flag as 'Compliance Risk'.
    - HS CODE OPTIMIZATION: Suggest alternative HS codes from 'All-SRO-2025-2026.pdf' if they offer lower duty or higher incentives.

    # 4. OUTPUT FORMAT (Strict JSON)
    {
        "assessable_value_calculation": {
            "fob_value": number,
            "insurance_landing_charge": "1%",
            "calculated_av": number,
            "formula_used": "(FOB * 1.01) * 1.01"
        },
        "strategic_analysis": {
            "eu_rules_of_origin_status": "Compliant" | "Non-Compliant" | "Needs Verification",
            "rex_validation": "Valid" | "Missing" | "Not Required",
            "ldc_graduation_impact": {
                "impact_percentage": "${ldcPct}",
                "estimated_extra_cost": number
            },
            "cbam_risk": "High" | "Medium" | "Low",
            "export_incentive_opportunity": {
                 "rate": "${incPct}", 
                 "description": string 
            }
        },
        "formatted_audit_report": "markdown_string"
    }

    **Formatting "formatted_audit_report"**:
    - Style: Professional, structured with Emojis, no '***' markdown.
    - Visibility: Present results in the 'CFO Accuracy Report' within the central Command Center.
    `;

    const prompts = [
        { name: 'Document Verifier', system: verifierPrompt },
        { name: 'HS Code Auditor', system: auditorPrompt },
        { name: 'Strategic Compliance Auditor', system: strategicPrompt },
    ];

    const agentPromises = prompts.map(async (agent) => {
        try {
            const response = await getOpenRouter().chat.completions.create({
                model: 'google/gemini-3-flash-preview',
                messages: [
                    { role: 'system', content: agent.system },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Analyze this document.' },
                            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBase64}` } }
                        ]
                    }
                ],
                response_format: { type: 'json_object' },
                include_reasoning: true,
            } as any) as any;

            let cleanContent = response.choices[0].message.content || '{}';
            // Remove markdown format if present
            cleanContent = cleanContent.replace(/```json/g, '').replace(/```/g, '').trim();
            const content = JSON.parse(cleanContent);
            const reasoning = response.usage?.reasoningTokens || response.choices[0]?.message?.reasoning || 'No reasoning captured';

            await persistThoughtSignature(agent.name, String(reasoning));

            return {
                agentName: agent.name,
                thoughtSignature: String(reasoning),
                output: content,
                status: 'success'
            } as AgentResult;

        } catch (e) {
            console.error(`${agent.name} failed:`, e);
            // @ts-ignore
            const errorMessage = e instanceof Error ? e.message : String(e);
            return {
                agentName: agent.name,
                thoughtSignature: `Failed: ${errorMessage}`,
                output: { error: errorMessage },
                status: 'failure'
            } as AgentResult;
        }
    });

    const swarmResults = await Promise.all(agentPromises);
    return swarmResults;
}
