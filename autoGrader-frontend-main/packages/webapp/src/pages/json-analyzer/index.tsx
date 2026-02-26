"use client";

import React, { useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFileCode,
    faPlay,
    faDownload,
    faTrash,
    faSpinner,
    faCheckCircle,
    faExclamationTriangle,
    faChartBar,
    faShieldAlt,
    faTachometerAlt,
    faClipboardCheck,
    faCodeBranch,
    faEye,
    faFileUpload,
    faMagic,
    faCog
} from "@fortawesome/free-solid-svg-icons";

type AnalysisType = 'structure' | 'validation' | 'quality' | 'security' | 'performance' | 'schema' | 'comparison' | 'custom';

interface AnalysisResult {
    success: boolean;
    analysis: any;
    metadata: {
        analysisType: string;
        timestamp: string;
        dataSize: number;
        model: string;
    };
}

export default function JsonAnalyzer() {
    const [jsonInput, setJsonInput] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [analysisType, setAnalysisType] = useState<AnalysisType>('structure');
    const [criteria, setCriteria] = useState("");
    const [customPrompt, setCustomPrompt] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showRawJson, setShowRawJson] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const analysisTypes = [
        { id: 'structure', name: 'تحليل البنية', icon: faCodeBranch, color: 'blue' },
        { id: 'validation', name: 'التحقق من الصحة', icon: faClipboardCheck, color: 'green' },
        { id: 'quality', name: 'جودة البيانات', icon: faChartBar, color: 'purple' },
        { id: 'security', name: 'الأمان', icon: faShieldAlt, color: 'red' },
        { id: 'performance', name: 'الأداء', icon: faTachometerAlt, color: 'yellow' },
        { id: 'schema', name: 'المخطط', icon: faFileCode, color: 'cyan' },
        { id: 'comparison', name: 'الأنماط والرؤى', icon: faMagic, color: 'pink' },
        { id: 'custom', name: 'تحليل مخصص', icon: faCog, color: 'orange' }
    ];

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (uploadedFile) {
            setFile(uploadedFile);
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const content = event.target?.result as string;
                    JSON.parse(content); // Validate JSON
                    setJsonInput(content);
                    setError(null);
                } catch (err) {
                    setError("ملف JSON غير صالح");
                }
            };
            reader.readAsText(uploadedFile);
        }
    };

    const runAnalysis = async () => {
        if (!jsonInput) {
            setError("الرجاء إدخال بيانات JSON");
            return;
        }

        try {
            const jsonData = JSON.parse(jsonInput);
            setIsAnalyzing(true);
            setError(null);

            const response = await fetch('/api/analyze-json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonData,
                    analysisType,
                    criteria: criteria || undefined,
                    customPrompt: customPrompt || undefined
                })
            });

            if (!response.ok) {
                throw new Error('فشل التحليل');
            }

            const data: AnalysisResult = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || "حدث خطأ أثناء التحليل");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const downloadResult = () => {
        if (!result) return;
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `json-analysis-${Date.now()}.json`;
        link.click();
    };

    const reset = () => {
        setJsonInput("");
        setFile(null);
        setResult(null);
        setError(null);
        setCriteria("");
        setCustomPrompt("");
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-yellow-500';
        if (score >= 40) return 'text-orange-500';
        return 'text-red-500';
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return 'bg-green-500/10 border-green-500/30';
        if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/30';
        if (score >= 40) return 'bg-orange-500/10 border-orange-500/30';
        return 'bg-red-500/10 border-red-500/30';
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            <Sidebar />

            <main className="flex-1 ml-64 p-8 lg:p-12">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold premium-text-gradient mb-2">
                        <FontAwesomeIcon icon={faMagic as any} className="mr-3" />
                        محلل JSON بالذكاء الاصطناعي
                    </h1>
                    <p className="text-muted-foreground">
                        تحليل متقدم لملفات JSON باستخدام الذكاء الاصطناعي - البنية، الجودة، الأمان، والأداء
                    </p>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Input Section */}
                    <div className="space-y-6">
                        {/* File Upload */}
                        <section className="glass-card p-6">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <FontAwesomeIcon icon={faFileCode as any} className="text-primary" />
                                1. بيانات JSON
                            </h2>

                            {!file ? (
                                <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-primary/50 transition-all cursor-pointer group relative">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <FontAwesomeIcon icon={faFileUpload as any} className="text-4xl text-muted-foreground group-hover:text-primary transition-colors mb-3" />
                                    <p className="text-sm text-muted-foreground">انقر أو اسحب ملف JSON هنا</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                        <div className="flex items-center gap-2">
                                            <FontAwesomeIcon icon={faFileCode as any} className="text-yellow-500" />
                                            <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowRawJson(!showRawJson)}
                                                className="text-xs text-muted-foreground hover:text-primary"
                                            >
                                                <FontAwesomeIcon icon={faEye as any} />
                                            </button>
                                            <button
                                                onClick={reset}
                                                className="text-xs text-muted-foreground hover:text-red-500"
                                            >
                                                <FontAwesomeIcon icon={faTrash as any} />
                                            </button>
                                        </div>
                                    </div>

                                    {showRawJson && (
                                        <div className="p-4 bg-black/40 rounded-xl border border-white/10 max-h-[200px] overflow-auto">
                                            <pre className="text-xs font-mono text-blue-400">
                                                {jsonInput}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!file && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                                        أو الصق JSON مباشرة
                                    </label>
                                    <textarea
                                        value={jsonInput}
                                        onChange={(e) => setJsonInput(e.target.value)}
                                        placeholder='{ "name": "example", "data": [...] }'
                                        className="w-full bg-black/20 border border-white/5 rounded-xl p-4 font-mono text-sm focus:ring-1 focus:ring-primary outline-none resize-none min-h-[150px]"
                                    />
                                </div>
                            )}
                        </section>

                        {/* Analysis Type Selection */}
                        <section className="glass-card p-6">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <FontAwesomeIcon icon={faChartBar as any} className="text-primary" />
                                2. نوع التحليل
                            </h2>

                            <div className="grid grid-cols-2 gap-3">
                                {analysisTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setAnalysisType(type.id as AnalysisType)}
                                        className={`p-3 rounded-xl border transition-all text-left ${
                                            analysisType === type.id
                                                ? `bg-${type.color}-500/20 border-${type.color}-500/50 text-${type.color}-500`
                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={type.icon as any} className="mb-2" />
                                        <div className="text-xs font-bold">{type.name}</div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Additional Options */}
                        <section className="glass-card p-6">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <FontAwesomeIcon icon={faCog as any} className="text-primary" />
                                3. خيارات إضافية
                            </h2>

                            {analysisType === 'custom' ? (
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                                        تعليمات التحليل المخصص
                                    </label>
                                    <textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="مثال: حلل هذا JSON وابحث عن الأخطاء المحتملة في بيانات الطلاب..."
                                        className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-sm focus:ring-1 focus:ring-primary outline-none resize-none min-h-[100px]"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                                        معايير التحليل (اختياري)
                                    </label>
                                    <textarea
                                        value={criteria}
                                        onChange={(e) => setCriteria(e.target.value)}
                                        placeholder="مثال: يجب أن تحتوي جميع السجلات على حقل 'id' و 'name'..."
                                        className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-sm focus:ring-1 focus:ring-primary outline-none resize-none min-h-[100px]"
                                    />
                                </div>
                            )}

                            <button
                                onClick={runAnalysis}
                                disabled={isAnalyzing || !jsonInput}
                                className="w-full mt-4 premium-gradient p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner as any} spin />
                                        جاري التحليل...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faPlay as any} />
                                        تشغيل التحليل
                                    </>
                                )}
                            </button>
                        </section>
                    </div>

                    {/* Results Section */}
                    <div className="space-y-6">
                        <section className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <FontAwesomeIcon icon={faCheckCircle as any} className="text-primary" />
                                    نتائج التحليل
                                </h2>
                                {result && (
                                    <button
                                        onClick={downloadResult}
                                        className="text-xs bg-primary/10 text-primary px-3 py-2 rounded-lg border border-primary/20 hover:bg-primary/20 transition-all"
                                    >
                                        <FontAwesomeIcon icon={faDownload as any} className="mr-1" />
                                        تحميل
                                    </button>
                                )}
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm">
                                    <FontAwesomeIcon icon={faExclamationTriangle as any} />
                                    {error}
                                </div>
                            )}

                            {isAnalyzing && (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <FontAwesomeIcon icon={faSpinner as any} spin className="text-4xl text-primary" />
                                    <p className="text-sm text-muted-foreground">جاري تحليل JSON باستخدام الذكاء الاصطناعي...</p>
                                </div>
                            )}

                            {!isAnalyzing && !result && !error && (
                                <div className="flex flex-col items-center justify-center py-12 opacity-30">
                                    <FontAwesomeIcon icon={faFileCode as any} className="text-6xl mb-4" />
                                    <p className="text-sm">ستظهر النتائج هنا بعد التحليل</p>
                                </div>
                            )}

                            {result && !isAnalyzing && (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                    {/* Score Display */}
                                    {result.analysis && Object.keys(result.analysis).some(key => key.includes('score')) && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(result.analysis)
                                                .filter(([key]) => key.includes('score'))
                                                .map(([key, value]) => (
                                                    <div key={key} className={`p-4 rounded-xl border ${getScoreBg(value as number)}`}>
                                                        <div className="text-xs text-muted-foreground mb-1">
                                                            {key.replace(/_/g, ' ').replace('score', 'النتيجة')}
                                                        </div>
                                                        <div className={`text-2xl font-bold ${getScoreColor(value as number)}`}>
                                                            {value}/100
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {/* Analysis Details */}
                                    <div className="space-y-3">
                                        {Object.entries(result.analysis).map(([key, value]) => {
                                            if (key.includes('score')) return null;

                                            return (
                                                <div key={key} className="p-4 bg-white/5 rounded-xl border border-white/10">
                                                    <div className="text-sm font-bold text-primary mb-2">
                                                        {key.replace(/_/g, ' ').toUpperCase()}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {Array.isArray(value) ? (
                                                            <ul className="space-y-1">
                                                                {value.map((item, idx) => (
                                                                    <li key={idx} className="flex items-start gap-2">
                                                                        <span className="text-primary">•</span>
                                                                        <span>{typeof item === 'object' ? JSON.stringify(item) : item}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : typeof value === 'object' ? (
                                                            <pre className="text-xs font-mono overflow-x-auto">
                                                                {JSON.stringify(value, null, 2)}
                                                            </pre>
                                                        ) : (
                                                            <p>{String(value)}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Metadata */}
                                    {result.metadata && (
                                        <div className="p-3 bg-black/40 rounded-xl border border-white/10">
                                            <div className="text-xs text-muted-foreground space-y-1">
                                                <div>النموذج: {result.metadata.model}</div>
                                                <div>حجم البيانات: {result.metadata.dataSize} بايت</div>
                                                <div>الوقت: {new Date(result.metadata.timestamp).toLocaleString('ar')}</div>
                                            </div>
                                        </div>
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
