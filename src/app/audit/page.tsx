'use client';

import { DocumentAuditor } from '@/components/DocumentAuditor';
import { CommandCenterShell } from '@/components/CommandCenterShell';
import { AuditHistory } from '@/components/AuditHistory';
import { useState } from 'react';


export default function AuditPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [viewAudit, setViewAudit] = useState<any>(null);

    return (
        <CommandCenterShell title="Document Compliance Audit" subtitle="Upload invoices and Bill of Entry for 2026 tariff validation">
            <div className="max-w-4xl mx-auto w-full pt-8 h-full overflow-y-auto pr-4">
                <DocumentAuditor initialData={viewAudit} />
                <AuditHistory onSelectAudit={setViewAudit} />
            </div>
        </CommandCenterShell>
    );
}
