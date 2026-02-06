
'use client';

import { LayoutDashboard, FileText, ShieldCheck, BarChart3, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Docs Audit', href: '/audit', icon: FileText },
    { name: 'Compliance', href: '/compliance', icon: ShieldCheck },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="w-64 bg-navy border-r border-gold/20 flex flex-col h-full text-foreground">
            <div className="p-6">
                <h1 className="text-2xl font-bold text-gold tracking-tighter">LG-26</h1>
                <p className="text-xs text-gray-400">Lead-Time Guardian</p>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                ? 'bg-gold/10 text-gold border border-gold/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/10">
                <div className="p-4 bg-alertRed/10 rounded-lg border border-alertRed/20 mb-4">
                    <p className="text-xs text-alertRed font-bold">LDC Graduation Alert</p>
                    <p className="text-xs text-gray-300 mt-1">289 Days Remaining</p>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>2026 Rates</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold"></div>
                    </label>
                </div>
            </div>
        </div>
    );
}
