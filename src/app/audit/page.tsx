
import { DocumentAuditor } from '@/components/DocumentAuditor';
import { CommandCenterShell } from '@/components/CommandCenterShell';

export default function AuditPage() {
    return (
        <CommandCenterShell title="Document Compliance Audit" subtitle="Upload invoices and Bill of Entry for 2026 tariff validation">
            <div className="max-w-4xl mx-auto w-full pt-8 h-full overflow-y-auto pr-4">
                <DocumentAuditor />

                <div className="mt-8 bg-navy/30 p-6 rounded-xl border border-white/5 mb-8">
                    <h3 className="text-lg font-bold text-gold mb-2">Audit History</h3>
                    <div className="text-sm text-gray-500 text-center py-8">
                        No previous audits found.
                    </div>
                </div>
            </div>
        </CommandCenterShell>
    );
}
