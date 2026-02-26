import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faRobot, faPaperPlane, faPlus } from '@fortawesome/free-solid-svg-icons';
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

export default function ChatInterface({
    title,
    messages,
    input,
    loading,
    setInput,
    handleSubmit,
    onClear
}: ChatInterfaceProps) {
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
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-primary' : 'premium-gradient'
                                    }`}>
                                    <FontAwesomeIcon icon={(msg.role === 'user' ? faUser : faRobot) as any} className="text-white text-lg" />
                                </div>
                                <div className={`p-4 rounded-3xl ${msg.role === 'user'
                                    ? 'bg-primary/20 text-white border border-primary/20 rounded-tr-none'
                                    : 'glass-card border-white/5 rounded-tl-none'
                                    }`}>
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
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
                                <div className="glass-card p-4 rounded-3xl rounded-tl-none flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                                </div>
                            </div>
                        </div>
                    )}
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
                            placeholder="Describe your requirements..."
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
                        Powered by AutoGrader AI Engine v2.0
                    </p>
                </div>
            </main>
        </div>
    );
}
