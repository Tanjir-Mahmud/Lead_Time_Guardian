'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Type for audit context data
export interface AuditContextData {
    invoiceNumber: string;
    invoiceDate: string;
    origin: string;
    destination: string;
    fobValue: number;
    hsCode: string;
    description: string;
    leadTimeDays: number;
    shipmentStatus: string;
    assessableValue: number;
    revenueRisk: number;
    incentiveAmount: number;
    carbonScore: string;
    lineItems: any[];
    rawAuditResult: any;
    timestamp: string;
}

interface AuditContextType {
    lastAudit: AuditContextData | null;
    setLastAudit: (audit: AuditContextData | null) => void;
    hasAuditContext: boolean;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export function AuditContextProvider({ children }: { children: ReactNode }) {
    const [lastAudit, setLastAudit] = useState<AuditContextData | null>(null);

    return (
        <AuditContext.Provider value={{
            lastAudit,
            setLastAudit,
            hasAuditContext: lastAudit !== null
        }}>
            {children}
        </AuditContext.Provider>
    );
}

export function useAuditContext() {
    const context = useContext(AuditContext);
    if (context === undefined) {
        throw new Error('useAuditContext must be used within an AuditContextProvider');
    }
    return context;
}

// Helper to format audit data for chat context
export function formatAuditForChat(audit: AuditContextData): string {
    return `
📄 CURRENT INVOICE CONTEXT (From Latest Docs Audit):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Invoice #: ${audit.invoiceNumber}
• Date: ${audit.invoiceDate}
• Route: ${audit.origin} → ${audit.destination}
• FOB Value: $${audit.fobValue.toLocaleString()}
• HS Code: ${audit.hsCode}
• Description: ${audit.description}
• Lead Time: ${audit.leadTimeDays} days
• Status: ${audit.shipmentStatus}
• Assessable Value: $${audit.assessableValue.toLocaleString()}
• 2026 Revenue Risk: $${audit.revenueRisk.toLocaleString()}
• Incentive Amount: $${audit.incentiveAmount.toLocaleString()}
• Carbon Score: ${audit.carbonScore}
• Line Items: ${audit.lineItems.length} items
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The user may ask questions about THIS specific invoice. Use the above data to answer accurately.
`;
}
