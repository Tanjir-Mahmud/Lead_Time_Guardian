
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
       - Invoice #: Identify identifying string labeled as 'Invoice', 'Ref', or 'Document No'. Key: "invoice_number"
       - Date: Extract invoice date. Key: "invoice_date"
       - Origin City: Extract the EXACT city name from Exporter/Shipper address (e.g., Mymensingh, Gazipur, Narayanganj, Dhaka, Chittagong). Key: "origin_city"
       - Origin: Extract 'City, Country' from Exporter/Shipper address. Key: "origin_country"
       - Destination: Extract 'City, Country' from Consignee/Buyer address. Key: "destination"
       - Buyer Details: Extract Name and Address. Key: "buyer_details"
       - Invoice Total: Find the final value (labeled 'Total', 'FOB', 'Grand Total', or 'Net Payable'). Key: "total_invoice_value" (Number)
       
    2. Line-Item Extraction:
       - Identify all rows with a Description and HS Code.
       - Key: "line_items" (Array) containing:
         - description (string)
         - hs_code (string): If missing/illegible, set to "Pending".
         - estimated_hs_code (string): If missing, provide the most likely 6-digit code based on description.
         - quantity (number): CLEAN number (remove commas).
         - unit_price (number): CLEAN number.
         - total_price (number)

    IMPORTANT: Read the actual city from the invoice Exporter address. Do NOT default to Dhaka unless it actually says Dhaka.

    Return ONLY STRICT JSON.
    Example:
    {
      "invoice_number": "IVO-99",
      "invoice_date": "2024-01-01",
      "origin_city": "Mymensingh",
      "origin_country": "Mymensingh, Bangladesh",
      "destination": "Berlin, Germany",
      "buyer_details": "Buyer Corp",
      "total_invoice_value": 15500.00,
      "line_items": [
        { "description": "T-Shirt", "hs_code": "6109.10", "quantity": 1000, "unit_price": 15.5, "total_price": 15500 }
      ]
    }
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

    # 3.5. TRAFFIC FORMULA LOGIC (ROAD CONGESTION IMPACT)
    
    **APPLIED TO ALL BANGLADESH ORIGIN SHIPMENTS:**
    - Assume route: Origin City → N1 Highway → Chattogram Port
    - Default traffic delay: 0 hours (no congestion mentioned)
    
    **IF invoice mentions traffic/congestion/delay keywords:**
    - Estimate delay hours based on context (default: 3 hours for "traffic congestion")
    
    **DELAY THRESHOLDS & LEAD TIME ADJUSTMENT:**
    - Low Impact (< 2h delay): +0 days to base lead_time
    - Medium Impact (2h - 4h delay): +1 day to base lead_time
    - High Impact (> 4h delay): +2 days to base lead_time
    
    **MARGIN PENALTY CALCULATION:**
    - For every hour beyond 2-hour buffer: -0.5% profit margin penalty
    - Formula: margin_penalty = max(0, (delay_hours - 2) * 0.5)
    - Example: 5h delay → (5-2) * 0.5 = 1.5% margin reduction
    
    **OUTPUT FIELDS:**
    - traffic_delay_hours: integer (default 0)
    - margin_penalty_percent: number (default 0)
    - adjusted_lead_time: base_lead_time + delay_adjustment

    # 4. PREDICTIVE ANALYTICS (SUPREME METRICS FIXER V4.0)
    
    # 🚨 CRITICAL ENFORCEMENT RULES - YOU MUST FOLLOW THESE 🚨
    
    **RULE #1 - NO WAITING:** You are an INDEPENDENT AUDITOR. You NEVER wait for external AIS data, vessel tracking, or live confirmation. You ALWAYS calculate lead time using the tier-based rules below.
    
    **RULE #2 - NO ZERO VALUES:** The following fields MUST NEVER be 0 or "unknown":
    - lead_time_days: ALWAYS calculate from tier mapping (minimum: 5 days)
    - shipment_status: ALWAYS set based on tier deadline comparison
    - safety_margin: ALWAYS calculate as (14% benefits - 11.9% risk = 2.1% base)
    
    **RULE #3 - ASSERTIVE DEFAULTS:** If destination is unclear, use Tier 2 (Southeast Asia, 15 days) as default.
    
    # 4. 🛠️ MASTER LEAD-TIME GUARDIAN INSTRUCTION
    
    **Context:** You are a Logistics Audit Expert for 'Lead-Time Guardian'. Your primary task is to calculate the 'Predicted Lead Time' based on specific destination tiers.
    
    **Strict Rule - Override Default Timing:** You must ignore any previous default lead time of 28 days for South Asia and Southeast Asia. Strictly apply the following country-specific logic:
    
    ## 4A. REGIONAL TIER MAPPING (HIGH PRIORITY - MANDATORY USE)
    
    **TIER 1 - South Asia (Shortest Route):**
    If destination is India, Sri Lanka, or Pakistan → Set Lead Time: **5-10 Days**
    - India: 5-7 days → USE MIDPOINT: 6 days
    - Sri Lanka: 6-8 days → USE MIDPOINT: 7 days
    - Pakistan: 8-10 days → USE MIDPOINT: 9 days
    
    **TIER 2 - Southeast Asia (Target: 15 Days):**
    If destination is Malaysia, Indonesia, Vietnam, Thailand, Singapore, or Philippines → Set Lead Time: **12-18 Days**
    - Singapore: 10-12 days → USE MIDPOINT: 11 days
    - Malaysia: 12-14 days → USE MIDPOINT: 13 days
    - Thailand: 13-15 days → USE MIDPOINT: 14 days
    - Indonesia: 14-16 days → USE MIDPOINT: 15 days
    - Vietnam: 15-17 days → USE MIDPOINT: 16 days
    - Philippines: 16-18 days → USE MIDPOINT: 17 days
    
    **TIER 3 - East Asia (Regional Hubs):**
    If destination is Japan, South Korea, or China → Set Lead Time: **20-28 Days**
    - China: 18-22 days → USE MIDPOINT: 20 days
    - South Korea: 22-25 days → USE MIDPOINT: 24 days
    - Japan: 25-28 days → USE MIDPOINT: 27 days
    
    **TIER 4 - Global (Long Haul):**
    If destination is Europe, UK, USA, or Brazil → Set Lead Time: **35-45+ Days**
    - USA (West Coast): 28-32 days → USE MIDPOINT: 30 days
    - United Kingdom: 30-35 days → USE MIDPOINT: 33 days
    - Germany: 32-38 days → USE MIDPOINT: 35 days
    - USA (East Coast): 35-40 days → USE MIDPOINT: 38 days
    - Brazil: 40-50 days → USE MIDPOINT: 45 days
    
    ## 4B. INLAND TRANSIT CALCULATION
    
    **Mymensingh/Gazipur Origins:**
    - If origin city is Mymensingh or Gazipur:
      * Calculate additional **6-10 hours** trucking time to Chattogram Port
      * Add **+1 day** to base lead time for inland logistics
      * Note in route_summary: "Inland transit from [Origin] to Chattogram Port via truck"
    
    ## 4C. SUSTAINABILITY SCORING
    
    **High Sustainability Check:**
    - Scan 'Product Description' for keywords:
      * "Recycled", "Organic", "Bamboo", "Hemp", "Eco-friendly", "Sustainable"
    - If ANY keyword found → Set carbon_score: "Low" and sustainability_rating: "High"
    - If none found → Determine carbon_score based on material type
    
    ## 4D. ON-TIME DELIVERY STATUS (MANDATORY - NO EXCEPTIONS)
    
    **YOU MUST ALWAYS SET shipment_status. NEVER leave it empty or "pending".**
    
    **MANDATORY CALCULATION:**
    1. Get lead_time_days from tier mapping (NEVER 0)
    2. Get tier_deadline from the target lead times below
    3. Compare: IF (lead_time_days <= tier_deadline) → "Delivered" ELSE → "Flagged"
    
    **Target Lead Times by Tier (Buyer's Deadline):**
    - Tier 1 (South Asia): 10 days deadline
    - Tier 2 (Southeast Asia): 18 days deadline
    - Tier 3 (East Asia): 28 days deadline
    - Tier 4 (Global): 45 days deadline
    
    **EXAMPLES (YOU MUST FOLLOW THIS LOGIC):**
    - Philippines (17 days) vs Tier 2 deadline (18 days) → 17 <= 18 → "Delivered" ✅
    - Germany (35 days) vs Tier 4 deadline (45 days) → 35 <= 45 → "Delivered" ✅
    - Japan (27 days) vs Tier 3 deadline (28 days) → 27 <= 28 → "Delivered" ✅
    
    ## 4E. 2026 SAFETY MARGIN (MANDATORY CALCULATION)
    
    **YOU MUST ALWAYS CALCULATE THIS. NEVER output 0% or "unknown".**
    
    **FORMULA:**
    - Total Benefits: 8% (Cash Incentive) + 6% (Duty Drawback) = **+14%**
    - 2026 LDC Risk: **-11.9%** (MFN duty if shipping to EU/UK)
    - Net Safety Margin = 14% - 11.9% = **+2.1%** (base)
    
    **For EU/UK destinations:** Net Safety Margin = 2.1% (positive = SAFE)
    **For non-EU destinations:** Net Safety Margin = 14% (no LDC risk)
    
    **OUTPUT:** Always include: "Net Margin: +2.1% (Safe to Ship)" or similar
    
    
    # 5. OUTPUT FORMAT (STRICT JSON)
    
    You MUST return a valid JSON object with the following structure. Do not use markdown code blocks.
    
    {
        "predictive_metadata": {
            "lead_time_days": number,
            "carbon_score": "Low" | "Medium" | "High",
            "shipment_status": "Delivered" | "Verified" | "Flagged",
            "sustainability_rating": "High" | "Medium" | "Low",
            "route_summary": "string describing full route",
            "inland_transit": {
                "required": boolean,
                "duration_hours": number,
                "notes": string
            },
            "traffic_logistics": {
                "delay_hours": number,
                "margin_penalty_percent": number,
                "traffic_impact": "Low" | "Medium" | "High"
            }
        },
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
        "predictive_metadata": {
            "lead_time_days": number,
            "carbon_score": "Low" | "Medium" | "High",
            "shipment_status": "Delivered" | "Verified" | "Flagged",
            "traffic_logistics": {
                "delay_hours": number,
                "margin_penalty_percent": number,
                "traffic_impact": "Low" | "Medium" | "High"
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
            console.log(`[${agent.name}] Starting API call to Gemini...`);

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
                // Removed response_format and include_reasoning - incompatible with Gemini 3
            } as any) as any;

            console.log(`[${agent.name}] API Response received:`, {
                hasChoices: !!response.choices,
                choicesLength: response.choices?.length,
                hasContent: !!response.choices?.[0]?.message?.content
            });

            let cleanContent = response.choices[0].message.content || '{}';
            console.log(`[${agent.name}] Raw content (first 200 chars):`, cleanContent.substring(0, 200));

            // Remove markdown format if present
            cleanContent = cleanContent.replace(/```json/g, '').replace(/```/g, '').trim();
            const content = JSON.parse(cleanContent);

            console.log(`[${agent.name}] Parsed JSON:`, content);

            const reasoning = response.usage?.reasoningTokens || response.choices[0]?.message?.reasoning || 'No reasoning captured';

            await persistThoughtSignature(agent.name, String(reasoning));

            return {
                agentName: agent.name,
                thoughtSignature: String(reasoning),
                output: content,
                status: 'success'
            } as AgentResult;

        } catch (e) {
            console.error(`[${agent.name}] FAILED with error:`, e);
            // @ts-ignore
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.error(`[${agent.name}] Error message:`, errorMessage);

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
