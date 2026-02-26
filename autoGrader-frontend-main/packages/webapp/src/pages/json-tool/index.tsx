"use client";

import React, { useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFileCode,
    faCode,
    faCheckCircle,
    faExclamationTriangle,
    faCopy,
    faDownload,
    faTrash,
    faMagic,
    faAlignLeft,
    faFileExport,
    faFileImport,
    faSearch,
    faFilter,
    faSort,
    faCompressAlt,
    faExpandAlt,
    faKey,
    faListOl,
    faCodeBranch,
    faFileUpload,
    faTable,
    faChartBar
} from "@fortawesome/free-solid-svg-icons";
import Papa from "papaparse";

interface JsonStats {
    size: number;
    depth: number;
    keys: number;
    arrays: number;
    objects: number;
    nulls: number;
    booleans: number;
    numbers: number;
    strings: number;
}

export default function JsonTool() {
    const [jsonInput, setJsonInput] = useState("");
    const [jsonOutput, setJsonOutput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterPath, setFilterPath] = useState("");
    const [stats, setStats] = useState<JsonStats | null>(null);
    const [showStats, setShowStats] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Calculate JSON statistics
    const calculateStats = (obj: any, depth = 0): JsonStats => {
        const stats: JsonStats = {
            size: JSON.stringify(obj).length,
            depth: depth,
            keys: 0,
            arrays: 0,
            objects: 0,
            nulls: 0,
            booleans: 0,
            numbers: 0,
            strings: 0
        };

        const traverse = (item: any, currentDepth: number) => {
            if (item === null) {
                stats.nulls++;
            } else if (typeof item === 'boolean') {
                stats.booleans++;
            } else if (typeof item === 'number') {
                stats.numbers++;
            } else if (typeof item === 'string') {
                stats.strings++;
            } else if (Array.isArray(item)) {
                stats.arrays++;
                stats.depth = Math.max(stats.depth, currentDepth);
                item.forEach(el => traverse(el, currentDepth + 1));
            } else if (typeof item === 'object') {
                stats.objects++;
                stats.keys += Object.keys(item).length;
                stats.depth = Math.max(stats.depth, currentDepth);
                Object.values(item).forEach(val => traverse(val, currentDepth + 1));
            }
        };

        traverse(obj, 0);
        return stats;
    };

    const handleFormat = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            setJsonOutput(JSON.stringify(parsed, null, 4));
            setStats(calculateStats(parsed));
            setError(null);
        } catch (err: any) {
            setError("Invalid JSON: " + err.message);
            setStats(null);
        }
    };

    const handleMinify = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            setJsonOutput(JSON.stringify(parsed));
            setStats(calculateStats(parsed));
            setError(null);
        } catch (err: any) {
            setError("Invalid JSON: " + err.message);
            setStats(null);
        }
    };

    const handleValidate = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            setStats(calculateStats(parsed));
            setJsonOutput("✓ Valid JSON");
            setError(null);
        } catch (err: any) {
            setError("Invalid JSON: " + err.message);
            setStats(null);
        }
    };

    const handleSearch = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            const results: any[] = [];
            
            const search = (obj: any, path = ""): void => {
                if (typeof obj === 'object' && obj !== null) {
                    Object.entries(obj).forEach(([key, value]) => {
                        const currentPath = path ? `${path}.${key}` : key;
                        if (key.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            JSON.stringify(value).toLowerCase().includes(searchQuery.toLowerCase())) {
                            results.push({ path: currentPath, value });
                        }
                        if (typeof value === 'object') {
                            search(value, currentPath);
                        }
                    });
                }
            };

            search(parsed);
            setJsonOutput(JSON.stringify(results, null, 4));
            setError(null);
        } catch (err: any) {
            setError("Search failed: " + err.message);
        }
    };

    const handleFilter = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            const paths = filterPath.split('.');
            let result = parsed;
            
            for (const path of paths) {
                if (result && typeof result === 'object') {
                    result = result[path];
                } else {
                    throw new Error(`Path not found: ${filterPath}`);
                }
            }
            
            setJsonOutput(JSON.stringify(result, null, 4));
            setError(null);
        } catch (err: any) {
            setError("Filter failed: " + err.message);
        }
    };

    const handleSort = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            
            const sortObject = (obj: any): any => {
                if (Array.isArray(obj)) {
                    return obj.map(sortObject).sort();
                } else if (typeof obj === 'object' && obj !== null) {
                    return Object.keys(obj)
                        .sort()
                        .reduce((sorted: any, key) => {
                            sorted[key] = sortObject(obj[key]);
                            return sorted;
                        }, {});
                }
                return obj;
            };

            setJsonOutput(JSON.stringify(sortObject(parsed), null, 4));
            setError(null);
        } catch (err: any) {
            setError("Sort failed: " + err.message);
        }
    };

    const handleExtractKeys = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            const keys = new Set<string>();
            
            const extractKeys = (obj: any, prefix = ""): void => {
                if (typeof obj === 'object' && obj !== null) {
                    Object.keys(obj).forEach(key => {
                        const fullKey = prefix ? `${prefix}.${key}` : key;
                        keys.add(fullKey);
                        extractKeys(obj[key], fullKey);
                    });
                }
            };

            extractKeys(parsed);
            setJsonOutput(JSON.stringify(Array.from(keys), null, 4));
            setError(null);
        } catch (err: any) {
            setError("Key extraction failed: " + err.message);
        }
    };

    const handleFlatten = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            const flattened: any = {};
            
            const flatten = (obj: any, prefix = ""): void => {
                Object.entries(obj).forEach(([key, value]) => {
                    const newKey = prefix ? `${prefix}.${key}` : key;
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        flatten(value, newKey);
                    } else {
                        flattened[newKey] = value;
                    }
                });
            };

            flatten(parsed);
            setJsonOutput(JSON.stringify(flattened, null, 4));
            setError(null);
        } catch (err: any) {
            setError("Flatten failed: " + err.message);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                setJsonInput(content);
            };
            reader.readAsText(file);
        }
    };

    const handleCsvToJson = () => {
        try {
            Papa.parse(jsonInput, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setJsonOutput(JSON.stringify(results.data, null, 4));
                    setError(null);
                }
            });
        } catch (err: any) {
            setError("CSV Parsing failed");
        }
    };

    const handleJsonToCsv = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            const csv = Papa.unparse(parsed);
            setJsonOutput(csv);
            setError(null);
        } catch (err: any) {
            setError("Invalid JSON for CSV conversion");
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(jsonOutput);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
    };

    const handleDownload = () => {
        const isCsv = !jsonOutput.trim().startsWith('{') && !jsonOutput.trim().startsWith('[');
        const blob = new Blob([jsonOutput], { type: isCsv ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `processed_data.${isCsv ? 'csv' : 'json'}`;
        link.click();
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <Sidebar />

            <main className="flex-1 ml-64 p-8 lg:p-12">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold premium-text-gradient mb-2">Advanced JSON Processor</h1>
                    <p className="text-muted-foreground">Professional tools for JSON manipulation, validation, and analysis.</p>
                </header>

                {/* Statistics Panel */}
                {stats && showStats && (
                    <div className="glass-card p-6 mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary">{stats.size}</div>
                            <div className="text-xs text-muted-foreground">Size (bytes)</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-500">{stats.depth}</div>
                            <div className="text-xs text-muted-foreground">Max Depth</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-500">{stats.keys}</div>
                            <div className="text-xs text-muted-foreground">Total Keys</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-500">{stats.objects}</div>
                            <div className="text-xs text-muted-foreground">Objects</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-500">{stats.arrays}</div>
                            <div className="text-xs text-muted-foreground">Arrays</div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-[calc(100vh-300px)]">
                    {/* Input Area */}
                    <section className="glass-card p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <FontAwesomeIcon icon={faFileImport as any} className="text-primary" />
                                Input Data
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <FontAwesomeIcon icon={faFileUpload as any} /> Upload
                                </button>
                                <button
                                    onClick={() => setJsonInput("")}
                                    className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faTrash as any} /> Clear
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,.csv,.txt"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>

                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder='Paste JSON, CSV, or upload a file...'
                            className="flex-1 bg-black/20 border border-white/5 rounded-2xl p-6 font-mono text-sm focus:ring-1 focus:ring-primary outline-none resize-none scrollbar-hide"
                        />

                        {/* Search and Filter Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="flex-1 bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                />
                                <button onClick={handleSearch} className="tool-btn-sm bg-blue-500/10 text-blue-500 border-blue-500/20">
                                    <FontAwesomeIcon icon={faSearch as any} />
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={filterPath}
                                    onChange={(e) => setFilterPath(e.target.value)}
                                    placeholder="Filter path (e.g., user.name)"
                                    className="flex-1 bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                />
                                <button onClick={handleFilter} className="tool-btn-sm bg-purple-500/10 text-purple-500 border-purple-500/20">
                                    <FontAwesomeIcon icon={faFilter as any} />
                                </button>
                            </div>
                        </div>

                        {/* Main Action Buttons */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            <button onClick={handleFormat} className="tool-btn bg-primary/10 text-primary border-primary/20">
                                <FontAwesomeIcon icon={faAlignLeft as any} /> Format
                            </button>
                            <button onClick={handleMinify} className="tool-btn bg-purple-500/10 text-purple-500 border-purple-500/20">
                                <FontAwesomeIcon icon={faCode as any} /> Minify
                            </button>
                            <button onClick={handleValidate} className="tool-btn bg-green-500/10 text-green-500 border-green-500/20">
                                <FontAwesomeIcon icon={faCheckCircle as any} /> Validate
                            </button>
                            <button onClick={() => setShowStats(!showStats)} className="tool-btn bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                <FontAwesomeIcon icon={faChartBar as any} /> Stats
                            </button>
                        </div>

                        {/* Advanced Operations */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            <button onClick={handleSort} className="tool-btn bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                                <FontAwesomeIcon icon={faSort as any} /> Sort
                            </button>
                            <button onClick={handleFlatten} className="tool-btn bg-pink-500/10 text-pink-500 border-pink-500/20">
                                <FontAwesomeIcon icon={faCompressAlt as any} /> Flatten
                            </button>
                            <button onClick={handleExtractKeys} className="tool-btn bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
                                <FontAwesomeIcon icon={faKey as any} /> Keys
                            </button>
                            <button onClick={handleCsvToJson} className="tool-btn bg-orange-500/10 text-orange-500 border-orange-500/20">
                                <FontAwesomeIcon icon={faTable as any} /> CSV→JSON
                            </button>
                        </div>

                        {/* Conversion Operations */}
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={handleJsonToCsv} className="tool-btn bg-teal-500/10 text-teal-500 border-teal-500/20">
                                <FontAwesomeIcon icon={faFileExport as any} /> JSON→CSV
                            </button>
                        </div>
                    </section>

                    {/* Output Area */}
                    <section className="glass-card p-6 flex flex-col gap-4 relative">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <FontAwesomeIcon icon={faFileCode as any} className="text-green-500" />
                                Processed Result
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${copyStatus ? 'bg-green-500/20 border-green-500/50 text-green-500' : 'bg-white/5 border-white/10 text-muted-foreground hover:text-primary'
                                        }`}
                                >
                                    <FontAwesomeIcon icon={copyStatus ? faCheckCircle : faCopy as any} />
                                    {copyStatus ? 'Copied' : 'Copy'}
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-muted-foreground hover:text-primary transition-all flex items-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faDownload as any} />
                                    Download
                                </button>
                            </div>
                        </div>

                        {error ? (
                            <div className="flex-1 bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-red-500">
                                <FontAwesomeIcon icon={faExclamationTriangle as any} className="text-4xl mb-4" />
                                <p className="font-medium">{error}</p>
                            </div>
                        ) : (
                            <textarea
                                readOnly
                                value={jsonOutput}
                                placeholder='Result will appear here...'
                                className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-6 font-mono text-sm text-blue-400 outline-none resize-none scrollbar-hide"
                            />
                        )}
                    </section>
                </div>
            </main>

            <style jsx>{`
                .tool-btn {
                    @apply flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98];
                }
                .tool-btn-sm {
                    @apply flex items-center justify-center px-3 py-2 rounded-lg border text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98];
                }
            `}</style>
        </div>
    );
}
