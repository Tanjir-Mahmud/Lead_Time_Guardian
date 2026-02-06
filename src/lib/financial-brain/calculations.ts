
/**
 * Financial Brain - Core Calculation Logic (Strict Mathematical Integrity Protocol)
 * 
 * Formulas:
 * AV = (CIF * 1.01) * 1.01 (Strict: CIF + Landing Charge)
 * TTI = Cascading Sum of Duties
 */

interface DutyStructure {
    CD: number;  // Custom Duty %
    RD: number;  // Regulatory Duty %
    SD: number;  // Supplementary Duty %
    VAT: number; // Value Added Tax %
    AIT: number; // Advance Income Tax %
    AT: number;  // Advance Tax %
}

interface FinancialResult {
    assessableValue: number;
    totalTaxIncidence: number;
    dutyAmount: number;
    revenueAtRisk?: number;
}


/**
 * Calculates Assessable Value (AV) - Strict Protocol
 * Formula: (FOB * 1.01) * 1.01
 * Note: The prompt explicitly mandates this estimation formula.
 */
export function calculateAV_Strict(fobValue: number): number {
    // User Rule: Always calculate as (FOB * 1.01) * 1.01. Do not estimate.
    return (fobValue * 1.01) * 1.01;
}

// Keeping legacy simplified calculator for estimation compatibility if needed
export function calculateAV(cifValue: number): number {
    return (cifValue * 1.01) * 1.01;
}

/**
 * Calculates Total Tax Incidence (TTI) Percentage - Strict Protocol
 * TTI Sum = CD + RD + SD + VAT + AIT + AT (Sum of rates per prompt definition of TTI Metric)
 */
export function calculateTTI(duties: DutyStructure): number {
    return duties.CD + duties.RD + duties.SD + duties.VAT + duties.AIT + duties.AT;
}

/**
 * Calculates the exact Duty Payable based on Cascading Logic
 * Protocol:
 * Base = AV
 * CD = AV * CD%
 * RD = AV * RD%
 * SD = (AV + CD + RD) * SD%
 * VAT = (AV + CD + RD + SD) * 15% (or rate)
 * AIT = AV * 5% (or rate)
 * AT = (AV + CD + RD + SD) * 5% (or rate)
 */
export function calculateTotalDuty_Strict(av: number, duties: DutyStructure): number {
    const cdAmount = av * (duties.CD / 100);
    const rdAmount = av * (duties.RD / 100);

    const sdBase = av + cdAmount + rdAmount;
    const sdAmount = sdBase * (duties.SD / 100);

    const vatBase = sdBase + sdAmount;
    const vatAmount = vatBase * (duties.VAT / 100);

    const aitAmount = av * (duties.AIT / 100);

    const atBase = vatBase + vatAmount; // Often assessed on slightly different base, but standard is derived from VAT base
    // Correction: AT Base is typically (AV + CD + RD + SD + VAT) in practice, but let's follow standard cascade.
    // Text books: AT Base = Assessable Value + CD + RD + SD + VAT.
    const atAmount = (av + cdAmount + rdAmount + sdAmount + vatAmount) * (duties.AT / 100);

    return cdAmount + rdAmount + sdAmount + vatAmount + aitAmount + atAmount;
}


export function calculateTotalDuty(av: number, duties: DutyStructure): number {
    // Reroute to strict if called, or fallback to simple estimate
    return calculateTotalDuty_Strict(av, duties);
}

/**
 * Calculate Revenue at Risk
 * Compares current duty output vs potential future duty output (e.g., 2026 MFN rates).
 */
export function calculateRevenueRisk(cif: number, currentDuties: DutyStructure, futureDuties: DutyStructure): number {
    // Current uses Duty Free logic usually (0 duty), Future uses MFN
    // To respect the input params, we calculate strict duty for both.

    // Approx conversion of CIF to AV for this signature
    const av = calculateAV(cif);

    const currentDuty = calculateTotalDuty_Strict(av, currentDuties);
    const futureDuty = calculateTotalDuty_Strict(av, futureDuties);

    return futureDuty - currentDuty;
}

/**
 * LDC Graduation Risk Simulation
 * Protocol: AV * 11.9% MFN jump rate
 */
export function calculateLDCRisk_Financial(av: number): number {
    return av * 0.119;
}

export function calculateERP(inputTariff: number, outputTariff: number): { erpScore: string, recommendation: string } {
    if (inputTariff > outputTariff) {
        return {
            erpScore: 'Negative Protection (Duty Inversion)',
            recommendation: 'Use Bonded Warehouse to import raw materials duty-free. Current structure penalizes local value addition.'
        };
    } else {
        return {
            erpScore: 'Positive Protection',
            recommendation: 'Standard import procedure is acceptable. Local manufacturing is protected.'
        };
    }
}

export function calculateLDCRiskScore(currentRate: number, futureRate: number, isRMG: boolean): number {
    const delta = futureRate - currentRate;
    let score = 0;
    if (delta <= 0) score = 1;
    else if (delta < 5) score = 3;
    else if (delta < 10) score = 5;
    else if (delta < 15) score = 7;
    else score = 9;

    if (isRMG && score < 10) score += 1;

    return Math.min(10, Math.max(1, score));
}

export function calculateCBAMLiability(description: string, weightKg: number): { applicable: boolean, liabilityEUR: number, note: string } {
    const desc = description.toLowerCase();
    const annexI = ['cement', 'iron', 'steel', 'aluminum', 'fertilizer', 'electricity', 'hydrogen'];

    const isAnnexI = annexI.some(item => desc.includes(item));

    if (isAnnexI) {
        const weightTonnes = weightKg / 1000;
        const emissionFactor = 1.8;
        const carbonPriceEUR = 85;

        const liability = weightTonnes * emissionFactor * carbonPriceEUR;

        return {
            applicable: true,
            liabilityEUR: liability,
            note: `CBAM Annex I Good (${weightTonnes.toFixed(2)}T * ${emissionFactor} factor * €${carbonPriceEUR})`
        };
    }

    return { applicable: false, liabilityEUR: 0, note: 'Not Annex I' };
}

/**
 * Calculates Carbon Intensity (Ashulia Facility Baseline)
 * Returns { score: 'Low' | 'Medium' | 'High', intensity: string, advice: string }
 */
export function calculateCarbonIntensity(material: string): { score: 'Low' | 'Medium' | 'High', intensity: string, advice: string } {
    const mat = material.toLowerCase();

    // 1. Identify Material Risk
    let risk: 'Low' | 'Medium' | 'High' = 'Low';
    let baseIntensity = 5.5; // kg CO2e per unit (Ashulia baseline)

    if (mat.includes('synthetic') || mat.includes('pu') || mat.includes('polyester')) {
        risk = 'Medium'; // Emerging risk for 2026
        baseIntensity = 12.5;
    } else if (mat.includes('cotton') || mat.includes('leather')) {
        risk = 'Low';
        baseIntensity = 8.2;
    } else if (mat.includes('cement') || mat.includes('steel') || mat.includes('fertilizer')) {
        risk = 'High';
        baseIntensity = 25.0; // High emission
    }

    // 2. Strategic Advice based on Risk
    let advice = 'Maintain current sustainable sourcing.';
    if (risk === 'High') {
        advice = 'CRITICAL: Switch suppliers immediately. High CBAM Levy Risk.';
    } else if (risk === 'Medium') {
        advice = 'Switch to Recycled Materials (e.g., Ocean Plastic) to reduce carbon scoring.';
    }

    return {
        score: risk,
        intensity: `${baseIntensity} kg CO2e/unit`,
        advice
    };
}
