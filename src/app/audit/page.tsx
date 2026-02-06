
import { DocumentAuditor } from '@/components/DocumentAuditor';
import { CommandCenterShell } from '@/components/CommandCenterShell';
import { AuditHistory } from '@/components/AuditHistory';

export default function AuditPage() {
    return (
        <CommandCenterShell title="Document Compliance Audit" subtitle="Upload invoices and Bill of Entry for 2026 tariff validation">
            <div className="max-w-4xl mx-auto w-full pt-8 h-full overflow-y-auto pr-4">
                <DocumentAuditor />

                <AuditHistory />
            </div>
        </CommandCenterShell>
    );
}
