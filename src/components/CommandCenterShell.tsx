'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { LogisticsChat } from '@/components/LogisticsChat';
import { Bot, ChevronRight } from 'lucide-react';
import { UserProfile } from '@/components/UserProfile';

interface CommandCenterShellProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

export function CommandCenterShell({ children, title, subtitle }: CommandCenterShellProps) {
    const [isChatOpen, setIsChatOpen] = useState(false);

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-foreground font-sans overflow-hidden">
            {/* Left Navigation Sidebar */}
            <Sidebar />

            <div className="flex-grow flex overflow-hidden relative">
                {/* Main Content Area */}
                <main className={`flex-grow flex flex-col p-6 overflow-hidden space-y-6 transition-all duration-300 ${isChatOpen ? 'mr-[400px]' : 'mr-0'}`}>
                    <header className="flex justify-between items-center shrink-0">
                        <div>
                            <h1 className="text-2xl font-bold text-[#c9a747] tracking-tight">{title}</h1>
                            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                        </div>
                        <div className="flex items-center gap-4">
                            <UserProfile />
                            <div className="bg-[#1a1a1a] border border-[#c9a747]/20 px-3 py-1 rounded text-xs text-[#c9a747] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                System Active
                            </div>

                            {/* Logistics Agent Toggle Button */}
                            <button
                                onClick={() => setIsChatOpen(!isChatOpen)}
                                className={`p-2 rounded-lg transition-all duration-300 border ${isChatOpen
                                    ? 'bg-[#c9a747] text-black border-[#c9a747]'
                                    : 'bg-[#1a1a1a] text-[#c9a747] border-[#c9a747]/20 hover:bg-[#c9a747]/10'}`}
                                title={isChatOpen ? "Close Agent" : "Open Logistics Agent"}
                            >
                                <Bot size={20} />
                            </button>
                        </div>
                    </header>

                    {/* Page Content */}
                    <div className="flex-grow overflow-hidden flex flex-col min-h-0">
                        {children}
                    </div>
                </main>

                {/* Right Collapsible Sidebar (Logistics Agent) */}
                <aside
                    className={`fixed right-0 top-0 bottom-0 z-50 bg-[#121212] border-l border-gold/20 shadow-2xl transition-all duration-300 flex flex-col overflow-hidden ${isChatOpen ? 'w-[400px] translate-x-0' : 'w-0 translate-x-full border-none'}`}
                >
                    {/* Header inside Sidebar */}
                    <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#1a1a1a]/50 backdrop-blur shrink-0">
                        <div className="flex items-center gap-2">
                            <Bot size={20} className="text-[#c9a747]" />
                            <h2 className="font-bold text-[#c9a747]">Logistics Agent</h2>
                        </div>
                        <button
                            onClick={() => setIsChatOpen(false)}
                            className="text-gray-500 hover:text-white transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Chat Content */}
                    <div className="flex-grow overflow-hidden">
                        <LogisticsChat />
                    </div>
                </aside>
            </div>
        </div>
    );
}
