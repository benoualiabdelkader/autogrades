"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFileCsv,
    faPlay,
    faDownload,
    faTrash,
    faGear,
    faCheckCircle,
    faSpinner,
    faExclamationTriangle,
    faChartPie,
    faFileCode,
    faCode,
    faSave,
    faEye,
    faUpload
} from "@fortawesome/free-solid-svg-icons";
import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";

export default function SmartGrader() {
    const [file, setFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [selectedColumn, setSelectedColumn] = useState<string>("");
    const [rules, setRules] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showRawJson, setShowRawJson] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const stats = React.useMemo(() => {
        if (!results.length) return null;
        const total = results.length;
        const excellentCount = results.filter(r => r["AI_Category"]?.toLowerCase().includes("excellent")).length;
        const goodCount = results.filter(r => r["AI_Category"]?.toLowerCase().includes("good")).length;
        const passCount = results.filter(r => !r["AI_Category"]?.toLowerCase().includes("needs")).length;

        return {
            total,
            excellenceRate: Math.round((excellentCount / total) * 100),
            successRate: Math.round((passCount / total) * 100),
            averageGrade: "N/A" // Simplified for now as grades can be string formats like "8/10"
        };
    }, [results]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (uploadedFile) {
            setFile(uploadedFile);
            const isJson = uploadedFile.name.endsWith('.json');

            if (isJson) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const json = JSON.parse(event.target?.result as string);
                        let data = Array.isArray(json) ? json : [json];

                        // Sanitize & Clean
                        const cleanedData = data.map(row => {
                            const newRow: any = {};
                            Object.keys(row).forEach(key => {
                                const value = row[key];
                                newRow[key] = typeof value === 'string' ? value.trim() : value;
                            });
                            return newRow;
                        });

                        const fields = Object.keys(cleanedData[0] || {});
                        setCsvData(cleanedData);
                        setColumns(fields);
                        setSelectedColumn(fields[0] || "");
                    } catch (err) {
                        setError("Failed to parse JSON file.");
                    }
                };
                reader.readAsText(uploadedFile);
            } else {
                Papa.parse(uploadedFile, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (parsedResults) => {
                        let data = parsedResults.data as any[];
                        let fields = parsedResults.meta.fields || [];

                        // 1. Clean Column Names (Remove extra spaces)
                        fields = fields.map(f => f.trim());

                        // 2. Data Cleaning & Sanitization
                        const cleanedData = data.map(row => {
                            const newRow: any = {};
                            Object.keys(row).forEach(key => {
                                const cleanKey = key.trim();
                                const value = row[key];
                                // Handle empty cells & unify types (basic string trimming)
                                newRow[cleanKey] = typeof value === 'string' ? value.trim() : value;
                            });
                            return newRow;
                        }).filter(row => {
                            // Remove rows that are effectively empty
                            return Object.values(row).some(v => v !== "" && v !== null && v !== undefined);
                        });

                        // 3. Remove Duplicate Rows
                        const uniqueData = Array.from(new Set(cleanedData.map(r => JSON.stringify(r))))
                            .map(s => JSON.parse(s));

                        setCsvData(uniqueData);
                        setColumns(fields);
                        setSelectedColumn(fields[0] || "");
                    }
                });
            }
        }
    };

    const handleRubricUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (uploadedFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const content = event.target?.result as string;
                    if (uploadedFile.name.endsWith('.json')) {
                        const json = JSON.parse(content);
                        setRules(JSON.stringify(json, null, 2));
                    } else {
                        setRules(content);
                    }
                } catch (err) {
                    setError("Failed to read rubric file.");
                }
            };
            reader.readAsText(uploadedFile);
        }
    };

    const runAnalysis = async () => {
        if (!csvData.length || !rules) {
            setError("Please ensure file is uploaded and rules are defined.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setProgress(0);
        const allProcessedResults: any[] = [];
        const MIN_REQUEST_INTERVAL = 3000; // Safer interval for limited TPM

        try {
            for (let i = 0; i < csvData.length; i++) {
                const startTime = Date.now();
                const row = csvData[i];
                let retries = 5; // More retries for rate limits
                let aiResult: any = null;

                while (retries >= 0) {
                    try {
                        const response = await fetch('/api/groq-chat', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: "llama-3.3-70b-versatile",
                                messages: [
                                    {
                                        role: "system",
                                        content: `You are a professional educational grader. Strictly follow the user's Rubric/Rules. Evaluate the student's data accurately. Breakdown scores by question if requested. Output ONLY a valid JSON object.`
                                    },
                                    {
                                        role: "user",
                                        content: `RUBRIC:\n${rules}\n\nDATA:\n${JSON.stringify(row)}\n\nTASK: Return a JSON: { "breakdown": { "Q1": "score", "Q2": "score", "Q3": "score" }, "final_grade": "Total Score", "feedback": "Justification", "category": "Excellent/Good/Average/NeedsImprovement" }`
                                    }
                                ],
                                response_format: { type: "json_object" },
                                temperature: 0,
                            })
                        });

                        const payload = await response.json();
                        if (!response.ok || !payload?.success) {
                            const e: any = new Error(payload?.error || "AI request failed");
                            e.status = response.status;
                            throw e;
                        }

                        aiResult = JSON.parse(payload.content || "{}");
                        if (aiResult.final_grade) break;
                        throw new Error("Invalid response structure");
                    } catch (err: any) {
                        if (err?.status === 429 || err?.message?.includes("rate_limit_exceeded")) {
                            console.warn("Rate limit hit, waiting 5 seconds...");
                            await new Promise(r => setTimeout(r, 5000));
                            retries--;
                            continue;
                        }
                        retries--;
                        if (retries < 0) throw err;
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }

                // Flatten breakdown for CSV export compatibility
                const flattenedResult = { ...row };
                if (aiResult.breakdown) {
                    Object.entries(aiResult.breakdown).forEach(([key, value]) => {
                        flattenedResult[`AI_${key}`] = value;
                    });
                }
                flattenedResult["AI_Final_Grade"] = aiResult.final_grade;
                flattenedResult["AI_Feedback"] = aiResult.feedback;
                flattenedResult["AI_Category"] = aiResult.category;

                allProcessedResults.push(flattenedResult);
                setProgress(Math.round(((i + 1) / csvData.length) * 100));

                const elapsedTime = Date.now() - startTime;
                const remainingWait = Math.max(0, MIN_REQUEST_INTERVAL - elapsedTime);
                if (i < csvData.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, remainingWait));
                }
            }
            setResults(allProcessedResults);
        } catch (err: any) {
            setError("Analysis failed: " + err.message);
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const generatePDF = async () => {
        if (!reportRef.current) return;
        setIsProcessing(true);
        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#0a0a0a" // Match our dark theme
            });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Grader_Report_${new Date().getTime()}.pdf`);
        } catch (err) {
            console.error("PDF Generation failed", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadResults = (format: 'csv' | 'json' = 'csv') => {
        let content: string;
        let type: string;
        let extension: string;

        if (format === 'csv') {
            content = Papa.unparse(results);
            type = 'text/csv;charset=utf-8;';
            extension = 'csv';
        } else {
            content = JSON.stringify(results, null, 4);
            type = 'application/json;charset=utf-8;';
            extension = 'json';
        }

        const blob = new Blob([content], { type });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `graded_${file?.name.split('.')[0] || 'results'}.${extension}`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const reset = () => {
        setFile(null);
        setCsvData([]);
        setResults([]);
        setRules("");
        setProgress(0);
        setError(null);
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <Sidebar />

            <main className="flex-1 ml-64 p-8 lg:p-12">
                <header className="mb-12">
                    <h1 className="text-4xl font-bold premium-text-gradient mb-2">Smart AI Grader</h1>
                    <p className="text-muted-foreground">Automate student answer classification using AI. Supports CSV & JSON.</p>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Input Section */}
                    <div className="space-y-6">
                        <section className="glass-card p-8 rounded-3xl">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <FontAwesomeIcon icon={faFileCsv as any} className="text-primary" />
                                1. Data Quality Check
                            </h2>

                            {!file ? (
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:border-primary/50 transition-all cursor-pointer group relative">
                                    <input
                                        type="file"
                                        accept=".csv,.json"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="flex gap-4 justify-center mb-4 text-muted-foreground group-hover:text-primary transition-colors">
                                        <FontAwesomeIcon icon={faFileCsv as any} className="text-4xl" />
                                        <FontAwesomeIcon icon={faFileCode as any} className="text-4xl" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Click or drag CSV or JSON file here</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <FontAwesomeIcon
                                                icon={(file.name.endsWith('.json') ? faFileCode : faFileCsv) as any}
                                                className={file.name.endsWith('.json') ? "text-yellow-500" : "text-blue-500"}
                                            />
                                            <span className="font-medium text-sm truncate max-w-[200px]">{file.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowRawJson(!showRawJson)}
                                                className="text-muted-foreground hover:text-primary p-2 text-xs flex items-center gap-1"
                                                title="Toggle Raw View"
                                            >
                                                <FontAwesomeIcon icon={faEye as any} />
                                            </button>
                                            <button onClick={reset} className="text-muted-foreground hover:text-red-500 p-2 text-xs">
                                                <FontAwesomeIcon icon={faTrash as any} />
                                            </button>
                                        </div>
                                    </div>

                                    {showRawJson && (
                                        <div className="p-4 bg-black/40 rounded-xl border border-white/10 max-h-[300px] overflow-auto animate-in fade-in slide-in-from-top-4 duration-300">
                                            <pre className="text-[10px] font-mono text-blue-400">
                                                {JSON.stringify(csvData, null, 2)}
                                            </pre>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Total Rows</p>
                                            <p className="text-lg font-bold">{csvData.length}</p>
                                        </div>
                                        <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Status</p>
                                            <p className="text-lg font-bold text-green-500">Cleaned</p>
                                        </div>
                                    </div>

                                    <ul className="space-y-2">
                                        <li className="text-xs text-muted-foreground flex items-center gap-2">
                                            <div className="w-1 h-1 bg-primary rounded-full" />
                                            Whitespace removed from {columns.length} columns
                                        </li>
                                        <li className="text-xs text-muted-foreground flex items-center gap-2">
                                            <div className="w-1 h-1 bg-primary rounded-full" />
                                            Duplicate rows removed automatically
                                        </li>
                                        <li className="text-xs text-muted-foreground flex items-center gap-2">
                                            <div className="w-1 h-1 bg-primary rounded-full" />
                                            Empty records filtered out
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </section>

                        {file && (
                            <section className="glass-card p-8 rounded-3xl animate-fade-in">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faGear as any} className="text-primary" />
                                    2. Configuration
                                </h2>

                                <div className="space-y-4">
                                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                        <p className="text-sm text-primary font-medium mb-1 flex items-center gap-2">
                                            <FontAwesomeIcon icon={faCheckCircle as any} />
                                            Full Row Context Enabled
                                        </p>
                                        <p className="text-xs text-muted-foreground">The AI will analyze all available columns in your CSV to provide the most accurate assessment.</p>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-muted-foreground">Grading Rules / Rubric</label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept=".txt,.json"
                                                    onChange={handleRubricUpload}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                                <button className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10 flex items-center gap-1 transition-all">
                                                    <FontAwesomeIcon icon={faUpload as any} /> Import Rubric
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            placeholder="e.g. Correct answer must mention 'Photosynthesis'. Give 0 if blank. 5 if partially correct..."
                                            value={rules}
                                            onChange={(e) => setRules(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-h-[150px] focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>

                                    <button
                                        onClick={runAnalysis}
                                        disabled={isProcessing || !rules}
                                        className="w-full premium-gradient p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <><FontAwesomeIcon icon={faSpinner as any} spin /> Processing...</>
                                        ) : (
                                            <><FontAwesomeIcon icon={faPlay as any} /> Run AI Analysis</>
                                        )}
                                    </button>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Results Section */}
                    <div className="space-y-6">
                        <section className="glass-card p-8 rounded-3xl h-full flex flex-col">
                            <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <FontAwesomeIcon icon={faDownload as any} className="text-primary" />
                                    Analysis Results
                                </span>
                                {results.length > 0 && (
                                    <div className="flex gap-2">
                                        <button onClick={generatePDF} className="text-xs bg-red-500/10 text-red-500 px-3 py-2 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-2">
                                            <FontAwesomeIcon icon={faFilePdf as any} />
                                            PDF
                                        </button>
                                        <button onClick={() => downloadResults('csv')} className="text-xs bg-primary/10 text-primary px-3 py-2 rounded-lg border border-primary/20 hover:bg-primary/20 flex items-center gap-2 transition-all">
                                            <FontAwesomeIcon icon={faFileCsv as any} />
                                            CSV
                                        </button>
                                        <button onClick={() => downloadResults('json')} className="text-xs bg-yellow-500/10 text-yellow-500 px-3 py-2 rounded-lg border border-yellow-500/20 hover:bg-yellow-500/20 flex items-center gap-2 transition-all">
                                            <FontAwesomeIcon icon={faFileCode as any} />
                                            JSON
                                        </button>
                                    </div>
                                )}
                            </h2>

                            {isProcessing && (
                                <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-12">
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                                    </div>
                                    <p className="text-sm font-medium">{progress}% Complete</p>
                                    <p className="text-xs text-muted-foreground">Evaluating student answers via Llama Pro...</p>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm">
                                    <FontAwesomeIcon icon={faExclamationTriangle as any} />
                                    {error}
                                </div>
                            )}

                            {!isProcessing && !results.length && !error && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 p-12">
                                    <FontAwesomeIcon icon={faFileCsv as any} className="text-6xl mb-4" />
                                    <p>Results will appear here after analysis</p>
                                </div>
                            )}

                            {results.length > 0 && (
                                <div className="flex-1 overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-muted-foreground">
                                                <th className="py-4 px-2">Student Info</th>
                                                <th className="py-4 px-2">Detailed Scores</th>
                                                <th className="py-4 px-2">Final Grade</th>
                                                <th className="py-4 px-2">Category</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {results.slice(0, 10).map((row: any, idx: number) => (
                                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="py-4 px-2 max-w-[150px] truncate">
                                                        {Object.entries(row)
                                                            .filter(([k]) => !k.startsWith("AI_"))
                                                            .slice(0, 2)
                                                            .map(([k, v]) => `${v}`)
                                                            .join(" ")}
                                                    </td>
                                                    <td className="py-4 px-2 max-w-[200px]">
                                                        <div className="flex flex-wrap gap-1">
                                                            {Object.entries(row)
                                                                .filter(([k]) => k.startsWith("AI_") && !["AI_Final_Grade", "AI_Feedback", "AI_Category"].includes(k))
                                                                .map(([k, v]) => (
                                                                    <span key={k} className="bg-white/5 text-[10px] px-1.5 py-0.5 rounded border border-white/10">
                                                                        {k.replace("AI_", "")}: {String(v)}
                                                                    </span>
                                                                ))}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-2 font-bold text-primary">{row["AI_Final_Grade"]}</td>
                                                    <td className="py-4 px-2">
                                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${row["AI_Category"]?.toLowerCase().includes("excellent") || row["AI_Category"]?.toLowerCase().includes("good")
                                                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                                                            : row["AI_Category"]?.toLowerCase().includes("needs") || row["AI_Category"]?.toLowerCase().includes("fail")
                                                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                                                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                                            }`}>
                                                            {row["AI_Category"]}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {results.length > 10 && (
                                        <p className="mt-4 text-xs text-center text-muted-foreground">Previewing top 10 rows. Download full CSV for all {results.length} results.</p>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </main>
            {/* Hidden Report Template for PDF Export */}
            <div className="absolute left-[-9999px] top-0">
                <div ref={reportRef} className="w-[210mm] p-[20mm] bg-[#0a0a0a] text-white font-sans overflow-hidden">
                    <div className="border-b border-primary/30 pb-8 mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-black premium-gradient-text tracking-tighter">AI GRADER REPORT</h1>
                            <p className="text-muted-foreground mt-2">Automated Assessment & Pedagogical Feedback</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Generated On</p>
                            <p className="font-mono">{new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-12">
                        <div className="glass-card p-6 rounded-2xl border border-white/10">
                            <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Total Managed</p>
                            <p className="text-3xl font-black text-primary">{stats?.total || 0}</p>
                            <p className="text-[10px] text-green-500 mt-1">Students Processed</p>
                        </div>
                        <div className="glass-card p-6 rounded-2xl border border-white/10">
                            <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Success Rate</p>
                            <p className="text-3xl font-black text-blue-500">{stats?.successRate || 0}%</p>
                            <p className="text-[10px] text-blue-400 mt-1">Passing Grade or Better</p>
                        </div>
                        <div className="glass-card p-6 rounded-2xl border border-white/10">
                            <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Excellence</p>
                            <p className="text-3xl font-black text-yellow-500">{stats?.excellenceRate || 0}%</p>
                            <p className="text-[10px] text-yellow-400 mt-1">Highest Tier Category</p>
                        </div>
                    </div>

                    <div className="mb-12">
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            Grading Rubric Applied
                        </h2>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 whitespace-pre-wrap text-sm text-gray-300 italic">
                            {rules}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            Individual Performance Summary
                        </h2>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-[10px] uppercase font-bold text-muted-foreground">
                                    <th className="py-3 px-2">Student</th>
                                    <th className="py-3 px-2">Detailed Scores</th>
                                    <th className="py-3 px-2">Final</th>
                                    <th className="py-3 px-2 text-right">Category</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.slice(0, 20).map((row: any, idx: number) => (
                                    <tr key={idx} className="border-b border-white/5 text-sm">
                                        <td className="py-4 px-2 font-medium">
                                            {Object.values(row).slice(0, 2).join(" ")}
                                        </td>
                                        <td className="py-4 px-2">
                                            <div className="flex gap-2">
                                                {Object.entries(row)
                                                    .filter(([k]) => k.startsWith("AI_") && !["AI_Final_Grade", "AI_Feedback", "AI_Category"].includes(k))
                                                    .map(([k, v]) => (
                                                        <span key={k} className="text-[10px] text-gray-400">
                                                            {k.replace("AI_", "")}:{String(v)}
                                                        </span>
                                                    ))}
                                            </div>
                                        </td>
                                        <td className="py-4 px-2 font-bold text-primary">{row["AI_Final_Grade"]}</td>
                                        <td className="py-4 px-2 text-right">
                                            <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">
                                                {row["AI_Category"]}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {results.length > 20 && (
                            <p className="text-[10px] text-muted-foreground mt-4 text-center">... and {results.length - 20} more students processed in this session.</p>
                        )}
                    </div>

                    <div className="mt-auto pt-12 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">Powered by Cortec AutoGrader Elite • {new Date().getFullYear()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
