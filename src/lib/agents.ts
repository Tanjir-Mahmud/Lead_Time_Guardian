
import { openrouter } from './openrouter';
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
    You are the 'Strategic Compliance Agent' (Expert AI Auditor & Tax Strategist).
    Your goal is to AUDIT the invoice using the "Strategic Audit Protocol".

    **CURRENT REGULATORY DATA (LIVE FROM DATABASE)**:
    - **Export Incentive Rate**: ${incPct} (Check if product matches description for this rate).
    - **LDC Graduation Risk Impact**: ${ldcPct} (Potential duty increase post-2026).

    CRITICAL RULES:
    1. **Assessable Value (AV) Logic**: 
       - You MUST calculate AV using this STRICT Formula: (FOB_Value * 1.01) * 1.01.
       - Do NOT use wild estimates. If FOB is 100, AV is strictly 102.01.
    
    2. **Regulatory & Tax Strategy**:
       - **EU Compliance**: Check if the product (e.g., Synthetic Footwear, Textiles) meets "Double Transformation" rules for GSP/Duty-Free access to Europe.
       - **LDC Graduation Risk**: Bangladesh graduates in 2026. Calculate the potential duty impact (using ${ldcPct}) if this shipment were post-2026.
       - **CBAM (Carbon Tax)**: If the product is high-carbon (Steel, Fertilizer, Cement, some Textiles), warn about CBAM reporting requirements starting 2026.
       - **Export Incentives**: Check for potential cash incentives (Current Rate: ${incPct}) from updated SROs. Note this as an specific "Optimization Opportunity".

    3. **Output Format (Strict JSON)**:
    {
        "assessable_value_calculation": {
            "fob_value": number,
            "insurance_landing_charge": "1%",
            "calculated_av": number,
            "formula_used": "(FOB * 1.01) * 1.01"
        },
        "strategic_analysis": {
            "eu_rules_of_origin_status": "Compliant" | "Non-Compliant" | "Needs Verification",
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
    - Use Bullet points with Emojis.
    - No '***' or markdown bolding chaos.
    - Sections: 
        - 💡 OPTIMIZATION (Incentives, HS Code swaps)
        - 🇪🇺 COMPLIANCE (Rules of origin)
        - 📉 RISK MITIGATION (LDC, CBAM)
    `;

    const prompts = [
        { name: 'Document Verifier', system: verifierPrompt },
        { name: 'HS Code Auditor', system: auditorPrompt },
        { name: 'Strategic Compliance Auditor', system: strategicPrompt },
    ];

    const agentPromises = prompts.map(async (agent) => {
        try {
            const response = await openrouter.chat.completions.create({
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
