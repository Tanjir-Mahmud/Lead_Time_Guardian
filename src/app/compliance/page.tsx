
import { CommandCenterShell } from '@/components/CommandCenterShell';

export default function CompliancePage() {
    return (
        <CommandCenterShell title="Compliance & Regulations" subtitle="2026 LDC Graduation Preparation">
            <div className="grid grid-cols-2 gap-6 h-full overflow-y-auto">
                <div className="bg-navy p-6 rounded-xl border border-gold/20 h-max">
                    <h2 className="text-xl font-bold text-gold mb-4">EU GSP+ Status</h2>
                    <p className="text-gray-300">Current Status: <span className="text-green-400">Active</span></p>
                    <p className="text-sm text-gray-500 mt-2">Requires ratification of 27 international conventions.</p>
                </div>
                <div className="bg-navy p-6 rounded-xl border border-gold/20 h-max">
                    <h2 className="text-xl font-bold text-gold mb-4">Carbon Border Adjustment (CBAM)</h2>
                    <p className="text-gray-300">Impact Assessment: <span className="text-alertRed">High</span></p>
                    <p className="text-sm text-gray-500 mt-2">Reporting required for Q3 2026 shipments.</p>
                </div>
            </div>
        </CommandCenterShell>
    );
}
