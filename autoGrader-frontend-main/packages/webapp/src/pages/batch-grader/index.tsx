"use client";

import React, { useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFileUpload,
    faPlay,
    faDownload,
    faTrash,
    faSpinner,
    faCheckCircle,
    faExclamationTriangle,
    faChartBar,
    faPause,
    faFileCode,
    faFileCsv,
    faCog
} from "@fortawesome/free-solid-svg-icons";
import Papa from "papaparse";
import { GradingEngine, Assignment, GradingResult } from "@/lib/grading/GradingEngine";

export default function BatchGrader() {
    const [file, setFile] = useState<File | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [results, setResults] = useState<GradingResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [settings, setSettings] = useState({
        maxConcurrent: 3,
        delayBetweenRequests: 2,
        maxItems: 20
    });
    const [showSettings, setShowSettings] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const gradingEngineRef = useRef<GradingEngine | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;

                if (uploadedFile.name.endsWith('.json')) {
                    // معالجة JSON
                    const jsonData = JSON.parse(content);
                    const parsedAssignments = GradingEngine.parseJSON(jsonData);
                    setAssignments(parsedAssignments);
                } else if (uploadedFile.name.endsWith('.csv')) {
                    // معالجة CSV
                    Papa.parse(content, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (parsedResults) => {
                            const parsedAssignments = GradingEngine.parseCSV(parsedResults.data);
                            setAssignments(parsedAssignments);
                        }
                    });
                } else {
                    setError('نوع الملف غير مدعوم. استخدم JSON أو CSV');
                }
            } catch (err: any) {
                setError(`فشل تحليل الملف: ${err.message}`);
            }
        };
        reader.readAsText(uploadedFile);
    };

    const startGrading = async () => {
        if (assignments.length === 0) {
            setError('لا توجد واجبات للتقييم');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setProgress(0);
        setResults([]);

        try {
            const engine = new GradingEngine();
            gradingEngineRef.current = engine;

            await engine.initialize();

            const gradingResults = await engine.gradeBatch(assignments, {
                maxConcurrent: settings.maxConcurrent,
                delayBetweenRequests: settings.delayBetweenRequests,
                maxItems: settings.maxItems,
                onProgress: (current, total) => {
                    setProgress(Math.round((current / total) * 100));
                }
            });

            setResults(gradingResults);
        } catch (err: any) {
            setError(`فشل التقييم: ${err.message}`);
        } finally {
            setIsProcessing(false);
            gradingEngineRef.current = null;
        }
    };

    const cancelGrading = () => {
        if (gradingEngineRef.current) {
            gradingEngineRef.current.cancel();
        }
        setIsProcessing(false);
    };

    const downloadResults = () => {
        if (results.length === 0) return;
        GradingEngine.downloadCSV(results);
    };

    const reset = () => {
        setFile(null);
        setAssignments([]);
        setResults([]);
        setProgress(0);
        setError(null);
    };

    const stats = results.length > 0 ? GradingEngine.calculateStats(results) : null;

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <Sidebar />

            <main className="flex-1 ml-64 p-8 lg:p-12">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold premium-text-gradient mb-2">
                        محرك التقييم الدفعي
                    </h1>
                    <p className="text-muted-foreground">
                        تقييم متعدد الواجبات بكفاءة عالية - محسّن للأداء الخفيف
                    </p>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Input Section */}
                    <div className="space-y-6">
                        {/* File Upload */}
                        <section className="glass-card p-6">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <FontAwesomeIcon icon={faFileUpload as any} className="text-primary" />
                                1. رفع البيانات
                            </h2>

                            {!file ? (
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-primary/50 transition-all cursor-pointer group relative">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json,.csv"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="flex gap-4 justify-center mb-4 text-muted-foreground group-hover:text-primary transition-colors">
                                        <FontAwesomeIcon icon={faFileCode as any} className="text-4xl" />
                                        <FontAwesomeIcon icon={faFileCsv as any} className="text-4xl" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        انقر أو اسحب ملف JSON أو CSV
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                        <div className="flex items-center gap-2">
                                            <FontAwesomeIcon 
                                                icon={(file.name.endsWith('.json') ? faFileCode : faFileCsv) as any}
                                                className={file.name.endsWith('.json') ? "text-yellow-500" : "text-blue-500"}
                                            />
                                            <span className="text-sm font-medium truncate max-w-[200px]">
                                                {file.name}
                                            </span>
                                        </div>
                                        <button
                                            onClick={reset}
                                            className="text-xs text-muted-foreground hover:text-red-500"
                                        >
                                            <FontAwesomeIcon icon={faTrash as any} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                            <div className="text-xs text-muted-foreground mb-1">عدد الواجبات</div>
                                            <div className="text-lg font-bold">{assignments.length}</div>
                                        </div>
                                        <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl">
                                            <div className="text-xs text-muted-foreground mb-1">الحالة</div>
                                            <div className="text-lg font-bold text-green-500">جاهز</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Settings */}
                        {assignments.length > 0 && (
                            <section className="glass-card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold flex items-center gap-2">
                                        <FontAwesomeIcon icon={faCog as any} className="text-primary" />
                                        2. الإعدادات
                                    </h2>
                                    <button
                                        onClick={() => setShowSettings(!showSettings)}
                                        className="text-xs text-primary hover:text-primary/80"
                                    >
                                        {showSettings ? 'إخفاء' : 'عرض'}
                                    </button>
                                </div>

                                {showSettings && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-muted-foreground mb-2">
                                                الطلبات المتزامنة (1-5)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="5"
                                                value={settings.maxConcurrent}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    maxConcurrent: parseInt(e.target.value) || 3
                                                })}
                                                className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-muted-foreground mb-2">
                                                التأخير بين الطلبات (ثواني)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="10"
                                                value={settings.delayBetweenRequests}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    delayBetweenRequests: parseInt(e.target.value) || 2
                                                })}
                                                className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-muted-foreground mb-2">
                                                الحد الأقصى للعناصر
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={settings.maxItems}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    maxItems: parseInt(e.target.value) || 20
                                                })}
                                                className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-sm"
                                            />
                                        </div>

                                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                            <p className="text-xs text-yellow-500">
                                                💡 الإعدادات الافتراضية محسّنة للأداء الخفيف
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={isProcessing ? cancelGrading : startGrading}
                                    disabled={assignments.length === 0}
                                    className={`w-full mt-4 p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                        isProcessing
                                            ? 'bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30'
                                            : 'premium-gradient hover:shadow-lg hover:shadow-blue-500/20'
                                    } disabled:opacity-50`}
                                >
                                    {isProcessing ? (
                                        <>
                                            <FontAwesomeIcon icon={faPause as any} />
                                            إيقاف التقييم
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faPlay as any} />
                                            بدء التقييم
                                        </>
                                    )}
                                </button>
                            </section>
                        )}
                    </div>

                    {/* Results Section */}
                    <div className="space-y-6">
                        <section className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <FontAwesomeIcon icon={faChartBar as any} className="text-primary" />
                                    النتائج
                                </h2>
                                {results.length > 0 && (
                                    <button
                                        onClick={downloadResults}
                                        className="text-xs bg-primary/10 text-primary px-3 py-2 rounded-lg border border-primary/20 hover:bg-primary/20 transition-all"
                                    >
                                        <FontAwesomeIcon icon={faDownload as any} className="mr-1" />
                                        تحميل CSV
                                    </button>
                                )}
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm mb-4">
                                    <FontAwesomeIcon icon={faExclamationTriangle as any} />
                                    {error}
                                </div>
                            )}

                            {isProcessing && (
                                <div className="space-y-4">
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="text-center">
                                        <FontAwesomeIcon icon={faSpinner as any} spin className="text-2xl text-primary mb-2" />
                                        <p className="text-sm font-medium">{progress}% مكتمل</p>
                                        <p className="text-xs text-muted-foreground">
                                            جاري تقييم الواجبات...
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!isProcessing && results.length === 0 && !error && (
                                <div className="flex flex-col items-center justify-center py-12 opacity-30">
                                    <FontAwesomeIcon icon={faCheckCircle as any} className="text-6xl mb-4" />
                                    <p className="text-sm">ستظهر النتائج هنا بعد التقييم</p>
                                </div>
                            )}

                            {stats && !isProcessing && (
                                <div className="space-y-4">
                                    {/* Statistics */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                                            <div className="text-xs text-muted-foreground mb-1">ناجح</div>
                                            <div className="text-2xl font-bold text-green-500">
                                                {stats.successful}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                            <div className="text-xs text-muted-foreground mb-1">فاشل</div>
                                            <div className="text-2xl font-bold text-red-500">
                                                {stats.failed}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                            <div className="text-xs text-muted-foreground mb-1">متوسط الدرجة</div>
                                            <div className="text-2xl font-bold text-blue-500">
                                                {stats.averageGrade}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                            <div className="text-xs text-muted-foreground mb-1">المجموع</div>
                                            <div className="text-2xl font-bold text-purple-500">
                                                {stats.total}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Results Preview */}
                                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                                        {results.slice(0, 10).map((result, idx) => (
                                            <div 
                                                key={idx}
                                                className={`p-3 rounded-lg border ${
                                                    result.error
                                                        ? 'bg-red-500/5 border-red-500/20'
                                                        : 'bg-white/5 border-white/10'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium">
                                                        {result.studentId}
                                                    </span>
                                                    <span className={`text-lg font-bold ${
                                                        result.error ? 'text-red-500' : 'text-green-500'
                                                    }`}>
                                                        {result.grade}/100
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {result.feedback}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {results.length > 10 && (
                                        <p className="text-xs text-center text-muted-foreground">
                                            عرض 10 من {results.length} نتيجة
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
