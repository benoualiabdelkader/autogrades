"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import JsonDiff from "@/components/json/JsonDiff";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCodeCompare,
    faFileImport,
    faTrash,
    faSync
} from "@fortawesome/free-solid-svg-icons";

export default function JsonCompare() {
    const [json1, setJson1] = useState("");
    const [json2, setJson2] = useState("");

    const handleSwap = () => {
        const temp = json1;
        setJson1(json2);
        setJson2(temp);
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <Sidebar />

            <main className="flex-1 ml-64 p-8 lg:p-12">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold premium-text-gradient mb-2">
                        <FontAwesomeIcon icon={faCodeCompare as any} className="mr-3" />
                        JSON Comparison Tool
                    </h1>
                    <p className="text-muted-foreground">
                        Compare two JSON objects and visualize their differences
                    </p>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* JSON 1 Input */}
                    <section className="glass-card p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <FontAwesomeIcon icon={faFileImport as any} className="text-blue-500" />
                                Original JSON
                            </h2>
                            <button
                                onClick={() => setJson1("")}
                                className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                            >
                                <FontAwesomeIcon icon={faTrash as any} /> Clear
                            </button>
                        </div>

                        <textarea
                            value={json1}
                            onChange={(e) => setJson1(e.target.value)}
                            placeholder='Paste first JSON here...'
                            className="flex-1 min-h-[400px] bg-black/20 border border-white/5 rounded-2xl p-6 font-mono text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none scrollbar-hide"
                        />
                    </section>

                    {/* JSON 2 Input */}
                    <section className="glass-card p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <FontAwesomeIcon icon={faFileImport as any} className="text-green-500" />
                                Modified JSON
                            </h2>
                            <button
                                onClick={() => setJson2("")}
                                className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                            >
                                <FontAwesomeIcon icon={faTrash as any} /> Clear
                            </button>
                        </div>

                        <textarea
                            value={json2}
                            onChange={(e) => setJson2(e.target.value)}
                            placeholder='Paste second JSON here...'
                            className="flex-1 min-h-[400px] bg-black/20 border border-white/5 rounded-2xl p-6 font-mono text-sm focus:ring-1 focus:ring-green-500 outline-none resize-none scrollbar-hide"
                        />
                    </section>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center mb-6">
                    <button
                        onClick={handleSwap}
                        className="px-6 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <FontAwesomeIcon icon={faSync as any} />
                        Swap JSON Objects
                    </button>
                </div>

                {/* Comparison Results */}
                <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <FontAwesomeIcon icon={faCodeCompare as any} className="text-primary" />
                        Comparison Results
                    </h2>
                    <JsonDiff json1={json1} json2={json2} />
                </section>
            </main>
        </div>
    );
}
