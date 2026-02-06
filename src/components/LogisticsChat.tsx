
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, BrainCircuit } from 'lucide-react';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    reasoning?: string;
}

export function LogisticsChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentReasoning, setCurrentReasoning] = useState('');

    const scrollToBottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollToBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentReasoning]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        setCurrentReasoning('');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) }),
            });

            if (!response.body) throw new Error('No stream');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMsg = '';
            let reasoningBuffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const data = JSON.parse(line);
                        if (data.type === 'reasoning') {
                            reasoningBuffer += data.text;
                            setCurrentReasoning(reasoningBuffer);
                        } else if (data.type === 'content') {
                            assistantMsg += data.text;
                            setMessages(prev => {
                                const newMsgs = [...prev];
                                const last = newMsgs[newMsgs.length - 1];
                                if (last.role === 'assistant') {
                                    last.content = assistantMsg;
                                    last.reasoning = reasoningBuffer;
                                    return newMsgs;
                                } else {
                                    return [...newMsgs, { role: 'assistant', content: assistantMsg, reasoning: reasoningBuffer }];
                                }
                            });
                        }
                    } catch (e) {
                        console.error('JSON parse error', e);
                    }
                }
            }

        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
            setCurrentReasoning('');
        }
    };

    return (
        <div className="flex-grow flex flex-col h-full bg-[#121212]">
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                        <Bot size={48} className="mb-4 text-[#c9a747]" />
                        <p>Command Center Ready. Awaiting Instructions.</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-4 rounded-xl max-w-[80%] text-md leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                            ? 'bg-[#c9a747]/10 text-[#c9a747] border border-[#c9a747]/20 rounded-tr-none'
                            : 'bg-[#1a1a1a] text-gray-200 border border-white/5 rounded-tl-none'
                            }`}>
                            {msg.content.split(/(<canvas_mode>[\s\S]*?<\/canvas_mode>)/g).map((part, i) => {
                                if (part.startsWith('<canvas_mode>')) {
                                    const inner = part.replace(/<\/?canvas_mode>/g, '').trim();
                                    return (
                                        <div key={i} className="mt-4 bg-black/40 rounded-lg border border-white/10 overflow-hidden w-full">
                                            <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center justify-between">
                                                <span className="text-xs font-bold text-[#c9a747] uppercase tracking-wider">Canvas Detail</span>
                                            </div>
                                            <div className="p-4 text-sm font-mono text-gray-300">
                                                {inner}
                                            </div>
                                        </div>
                                    );
                                }
                                return <span key={i}>{part}</span>;
                            })}
                        </div>
                        {msg.reasoning && (
                            <div className="ml-4 bg-black/40 text-xs p-3 rounded-lg border-l-2 border-purple-500 font-mono text-gray-500 w-fit max-w-[70%] animate-in fade-in">
                                <div className="flex items-center gap-2 mb-1 text-purple-400 font-bold uppercase tracking-wider text-[10px]">
                                    <BrainCircuit size={12} /> Thinking Process
                                </div>
                                {msg.reasoning}
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="ml-4 flex items-center gap-2 text-[#c9a747] animate-pulse">
                        <Bot size={16} />
                        <span className="text-sm font-mono">Analyzing logistics data...</span>
                    </div>
                )}
                <div ref={scrollToBottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-800 bg-[#121212] rounded-b-xl">
                <form onSubmit={handleSubmit} className="relative">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Plan shipment for..."
                        className="w-full bg-black border border-gray-700 rounded-lg p-4 pr-12 text-sm text-white focus:border-[#c9a747] outline-none transition-colors"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="absolute right-3 top-3 p-1.5 bg-[#c9a747]/10 text-[#c9a747] rounded hover:bg-[#c9a747]/20 transition-colors disabled:opacity-50"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}

