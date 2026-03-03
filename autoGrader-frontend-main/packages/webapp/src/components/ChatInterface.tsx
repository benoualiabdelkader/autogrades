import React, { useRef, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRobot, faPaperPlane, faPlus, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';
import Sidebar from './Sidebar';

interface Message {
    role: string;
    content: string;
}

interface ChatInterfaceProps {
    title: string;
    messages: Message[];
    input: string;
    loading: boolean;
    setInput: (val: string) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onClear?: () => void;
}

/** Simple inline markdown renderer for AI messages */
function renderMarkdown(text: string): React.ReactNode {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listBuffer: string[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
        if (listBuffer.length > 0 && listType) {
            const Tag = listType;
            elements.push(
                <Tag key={`list-${elements.length}`} className={listType === 'ul' ? 'list-disc ml-5 my-2 space-y-1' : 'list-decimal ml-5 my-2 space-y-1'}>
                    {listBuffer.map((item, i) => (
                        <li key={i} className="text-sm leading-relaxed">{formatInline(item)}</li>
                    ))}
                </Tag>
            );
            listBuffer = [];
            listType = null;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Headings
        const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
        if (headingMatch) {
            flushList();
            const level = headingMatch[1].length;
            const cls = level === 1 ? 'text-lg font-bold mt-3 mb-1' : level === 2 ? 'text-base font-bold mt-2 mb-1' : 'text-sm font-semibold mt-2 mb-0.5';
            elements.push(<div key={i} className={cls}>{formatInline(headingMatch[2])}</div>);
            continue;
        }

        // Unordered list
        const ulMatch = line.match(/^[\s]*[-•*]\s+(.+)/);
        if (ulMatch) {
            if (listType === 'ol') flushList();
            listType = 'ul';
            listBuffer.push(ulMatch[1]);
            continue;
        }

        // Ordered list
        const olMatch = line.match(/^[\s]*\d+[.)]\s+(.+)/);
        if (olMatch) {
            if (listType === 'ul') flushList();
            listType = 'ol';
            listBuffer.push(olMatch[1]);
            continue;
        }

        flushList();

        // Code block (simple)
        if (line.startsWith('```')) {
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            elements.push(
                <pre key={`code-${i}`} className="bg-black/40 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-green-300">
                    {codeLines.join('\n')}
                </pre>
            );
            continue;
        }

        // Empty line = spacer
        if (!line.trim()) {
            elements.push(<div key={`space-${i}`} className="h-2" />);
            continue;
        }

        // Regular paragraph
        elements.push(<p key={i} className="text-sm leading-relaxed my-0.5">{formatInline(line)}</p>);
    }

    flushList();
    return elements;
}

/** Format inline markdown: **bold**, *italic*, `code`, [links] */
function formatInline(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        if (match[2]) {
            parts.push(<strong key={match.index} className="font-semibold text-slate-100">{match[2]}</strong>);
        } else if (match[3]) {
            parts.push(<em key={match.index} className="italic text-slate-300">{match[3]}</em>);
        } else if (match[4]) {
            parts.push(<code key={match.index} className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-cyan-300">{match[4]}</code>);
        } else if (match[5] && match[6]) {
            parts.push(<a key={match.index} href={match[6]} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">{match[5]}</a>);
        }
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { }
    };
    return (
        <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-500 hover:text-slate-300 p-1" title="Copy message">
            <FontAwesomeIcon icon={copied ? (faCheck as any) : (faCopy as any)} className={copied ? 'text-green-400' : ''} />
        </button>
    );
}

export default function ChatInterface({
    title,
    messages,
    input,
    loading,
    setInput,
    handleSubmit,
    onClear
}: ChatInterfaceProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const visibleMessages = messages.filter((m) => m.role !== 'system');

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    return (
        <div className="flex h-screen bg-background overflow-hidden text-foreground">
            <Sidebar />

            <main className="flex-1 ml-64 flex flex-col relative">
                {/* Background Gradients */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>

                {/* Chat Header */}
                <header className="h-20 glass border-b border-white/5 flex items-center justify-between px-8 shrink-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold premium-text-gradient">{title}</h2>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs text-muted-foreground">AI Expert Online</span>
                            <span className="text-[10px] text-slate-600 ml-2">{visibleMessages.length} messages</span>
                        </div>
                    </div>
                    <button
                        onClick={onClear}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all text-sm font-medium"
                    >
                        <FontAwesomeIcon icon={faPlus as any} className="text-xs" /> New Session
                    </button>
                </header>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                    {visibleMessages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in group`}
                            style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s` }}
                        >
                            <div className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-primary' : 'premium-gradient'
                                    }`}>
                                    <FontAwesomeIcon icon={(msg.role === 'user' ? faUser : faRobot) as any} className="text-white text-lg" />
                                </div>
                                <div className={`relative p-4 rounded-3xl ${msg.role === 'user'
                                    ? 'bg-primary/20 text-white border border-primary/20 rounded-tr-none'
                                    : 'glass-card border-white/5 rounded-tl-none'
                                    }`}>
                                    {msg.role === 'user' ? (
                                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    ) : (
                                        <div className="leading-relaxed">{renderMarkdown(msg.content)}</div>
                                    )}
                                    {msg.role === 'assistant' && (
                                        <div className="absolute -bottom-1 right-2">
                                            <CopyButton text={msg.content} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start animate-fade-in">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-2xl premium-gradient flex items-center justify-center">
                                    <FontAwesomeIcon icon={faRobot as any} className="text-white" />
                                </div>
                                <div className="glass-card p-4 rounded-3xl rounded-tl-none flex gap-1.5 items-center">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.15s]" />
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.3s]" />
                                    <span className="text-xs text-slate-500 ml-2">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-8 pt-0 z-10">
                    <form
                        onSubmit={handleSubmit}
                        className="glass p-2 rounded-2xl border border-white/5 flex items-end gap-2 focus-within:border-primary/50 transition-all shadow-2xl"
                    >
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about grading, rubrics, student analytics, or anything educational..."
                            className="flex-1 bg-transparent border-none focus:ring-0 p-4 min-h-[56px] max-h-48 resize-none scrollbar-hide"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e as any);
                                }
                            }}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="w-12 h-12 rounded-xl premium-gradient flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-blue-500/20"
                        >
                            <FontAwesomeIcon icon={faPaperPlane as any} className="text-white" />
                        </button>
                    </form>
                    <p className="text-[10px] text-center text-muted-foreground mt-4 uppercase tracking-widest font-bold opacity-50">
                        Powered by AutoGrader AI Engine v3.0
                    </p>
                </div>
            </main>
        </div>
    );
}
