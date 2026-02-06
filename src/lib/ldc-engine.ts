
import { validateHSCode, loadTariffs } from './tariffs';

export interface LDCImpact {
    hsCode: string;
    currentRate: number;
    post2026Rate: number; // MFN 12% avg or specific
    increase: number;
    doubleTransformationRequired: boolean;
}

export function calculateLDCImpact(hsCode: string): LDCImpact {
    const tariff = validateHSCode(hsCode);

    // Logic: 
    // Current Rate = TTI from tariffs.csv
    // 2026 Rate = MFN Rate. The prompt says "2026 MFN Rates (12% Avg)".
    // Realistically, MFN rates vary, but for this simulation we might use 12% + VAT/AIT etc.
    // Or simply replace CD (Customs Duty) which is usually 25% for RMG, down to MFN levels?
    // Let's assume "2026 MFN Rates" means the Total Tax Incidence (TTI) changes based on a base rate change.
    // Users prompt: "Average 12% tariff (MFN Rate)".

    const currentTTI = tariff ? (tariff.TTI || 0) : 0;

    // Simulation: If current CD is > 12%, it might drop to 12% (unlikely for protectionist reasons, but let's follow "LDC Graduation" logic which usually means losing duty-free access ABROAD, not import tariffs INTO Bangladesh).
    // Wait, "Bangladesh's export crisis". LDC graduation means exports TO Europe/others get taxed.
    // So this app helps exporters PLAN for *their* goods entering EU/UK?
    // Or is it for Imports? "Bill of Entry" is usually Import.
    // "Export crisis for 2026". 
    // If it's EXPORT, then checking `tariffs.csv` (which is usually Import Tariff) might be checking Raw Materials import taxes?
    // AND "GSP+ eligibility".

    // Let's model it as: 
    // 1. Identification of Raw Material HS Code (from Import Doc).
    // 2. Checking if this material helps/hurts "Double Transformation" (Rules of Origin).

    // Simple Simulation Logic:
    // If HS Code is Cotton/Fabric (5208...), it's raw material.
    // Post 2026, if GSP goes away, EU Tariff becomes ~12% for the FINAL garment.
    // But here we are analyzing the *Bill of Entry* (Import).
    // Let's assume the user wants to see the "Impact" metric.

    const isRawMaterial = hsCode.startsWith('52') || hsCode.startsWith('55'); // e.g. Cotton
    const currentExportTax = 0; // Currently Duty Free to EU (EBA)
    const futureExportTax = 12; // Standard GSP w/o Plus or MFN

    return {
        hsCode,
        currentRate: currentExportTax,
        post2026Rate: futureExportTax,
        increase: futureExportTax - currentExportTax,
        doubleTransformationRequired: isRawMaterial // If importing fabric, might fail double transformation (Stage 1: Yarn->Fabric, Stage 2: Fabric->Apparel) if not locally sourced? 
        // This is complex, but we'll flag it.
    };
}
