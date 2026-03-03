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
    faCog,
    faGraduationCap,
    faHistory
} from "@fortawesome/free-solid-svg-icons";
import { PageHeader, Card, Button, Alert, Badge } from "@/components/ui/UnifiedUI";

type AnalysisType = 'structure' | 'validation' | 'quality' | 'security' | 'performance' | 'schema' | 'comparison' | 'grading' | 'custom';

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
    const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const analysisTypes = [
        { id: 'structure', name: 'تحليل البنية', icon: faCodeBranch, color: 'blue', desc: 'هيكل وتنظيم البيانات' },
        { id: 'validation', name: 'التحقق من الصحة', icon: faClipboardCheck, color: 'green', desc: 'سلامة واتساق البيانات' },
        { id: 'quality', name: 'جودة البيانات', icon: faChartBar, color: 'purple', desc: 'دقة واكتمال وموثوقية' },
        { id: 'security', name: 'الأمان والخصوصية', icon: faShieldAlt, color: 'red', desc: 'PII وFERPA والحماية' },
        { id: 'performance', name: 'الأداء', icon: faTachometerAlt, color: 'yellow', desc: 'كفاءة الحجم والاستعلام' },
        { id: 'schema', name: 'المخطط', icon: faFileCode, color: 'cyan', desc: 'أنواع البيانات والعلاقات' },
        { id: 'comparison', name: 'الأنماط والرؤى', icon: faMagic, color: 'pink', desc: 'اتجاهات وارتباطات وتوقعات' },
        { id: 'grading', name: 'تحليل الدرجات', icon: faGraduationCap, color: 'emerald', desc: 'توزيع وأداء الطلاب' },
        { id: 'custom', name: 'تحليل مخصص', icon: faCog, color: 'orange', desc: 'تعليمات تحليل مخصصة' }
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
            setAnalysisHistory(prev => [data, ...prev].slice(0, 10));
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
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 ml-64 p-8 lg:p-12 page-transition">
                <PageHeader
                    icon={faMagic as any}
                    title="محلل JSON بالذكاء الاصطناعي"
                    subtitle="تحليل متقدم لملفات JSON باستخدام الذكاء الاصطناعي - البنية، الجودة، الأمان، والأداء"
                    gradient="accent"
                />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Input Section */}
                    <div className="space-y-6">
                        {/* File Upload */}
                        <Card>
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
                        </Card>

                        {/* Analysis Type Selection */}
                        <Card>
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <FontAwesomeIcon icon={faChartBar as any} className="text-primary" />
                                2. نوع التحليل
                            </h2>

                            <div className="grid grid-cols-3 gap-3">
                                {analysisTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setAnalysisType(type.id as AnalysisType)}
                                        className={`p-3 rounded-xl border transition-all text-left ${analysisType === type.id
                                            ? `bg-${type.color}-500/20 border-${type.color}-500/50 text-${type.color}-500`
                                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={type.icon as any} className="mb-2" />
                                        <div className="text-xs font-bold">{type.name}</div>
                                        <div className="text-[10px] text-muted-foreground mt-1 opacity-70">{type.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </Card>

                        {/* Additional Options */}
                        <Card>
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

                            <Button
                                onClick={runAnalysis}
                                disabled={isAnalyzing || !jsonInput}
                                variant="primary"
                                size="lg"
                                icon={(isAnalyzing ? faSpinner : faPlay) as any}
                                loading={isAnalyzing}
                                className="w-full mt-4"
                            >
                                {isAnalyzing ? "جاري التحليل..." : "تشغيل التحليل"}
                            </Button>
                        </Card>
                    </div>

                    {/* Results Section */}
                    <div className="space-y-6">
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <FontAwesomeIcon icon={faCheckCircle as any} className="text-primary" />
                                    نتائج التحليل
                                </h2>
                                {result && (
                                    <Button onClick={downloadResult} variant="ghost" size="sm" icon={faDownload as any}>
                                        تحميل
                                    </Button>
                                )}
                            </div>

                            {error && (
                                <Alert variant="error">{error}</Alert>
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
                                <div className="space-y-4 max-h-[700px] overflow-y-auto">
                                    {/* Score Display */}
                                    {result.analysis && Object.keys(result.analysis).some(key => key.includes('score')) && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {Object.entries(result.analysis)
                                                .filter(([key, value]) => key.includes('score') && typeof value === 'number')
                                                .map(([key, value]) => (
                                                    <div key={key} className={`p-4 rounded-xl border ${getScoreBg(value as number)}`}>
                                                        <div className="text-xs text-muted-foreground mb-1">
                                                            {key.replace(/_/g, ' ').replace('score', 'النتيجة')}
                                                        </div>
                                                        <div className={`text-2xl font-bold ${getScoreColor(value as number)}`}>
                                                            {String(value)}/100
                                                        </div>
                                                        <div className="mt-2 h-1.5 rounded-full bg-white/10">
                                                            <div className={`h-full rounded-full transition-all ${(value as number) >= 80 ? 'bg-green-500' : (value as number) >= 60 ? 'bg-yellow-500' : (value as number) >= 40 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${Number(value)}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {/* Quick Summary if present */}
                                    {result.analysis?.summary && (
                                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                                            <div className="text-sm font-bold text-primary mb-1">ملخص التحليل</div>
                                            <p className="text-sm text-slate-200">{result.analysis.summary}</p>
                                        </div>
                                    )}

                                    {/* Analysis Details */}
                                    <div className="space-y-3">
                                        {Object.entries(result.analysis).map(([key, value]) => {
                                            if (key.includes('score') && typeof value === 'number') return null;
                                            if (key === 'summary') return null;

                                            const renderValue = (val: unknown, depth = 0): React.ReactNode => {
                                                if (val === null || val === undefined) return <span className="text-slate-500">-</span>;
                                                if (typeof val === 'boolean') return <span className={val ? 'text-green-400' : 'text-red-400'}>{val ? '✓ نعم' : '✗ لا'}</span>;
                                                if (typeof val === 'number') return <span className="font-mono text-cyan-300">{val}</span>;
                                                if (typeof val === 'string') {
                                                    if (val === 'low' || val === 'pass' || val === 'compliant' || val === 'excellent' || val === 'ready') return <span className="text-green-400 font-semibold">{val}</span>;
                                                    if (val === 'medium' || val === 'warning' || val === 'needs_review' || val === 'good' || val === 'fair' || val === 'needs_work') return <span className="text-yellow-400 font-semibold">{val}</span>;
                                                    if (val === 'high' || val === 'fail' || val === 'non_compliant' || val === 'poor' || val === 'critical' || val === 'not_suitable') return <span className="text-red-400 font-semibold">{val}</span>;
                                                    return <span>{val}</span>;
                                                }
                                                if (Array.isArray(val)) {
                                                    if (val.length === 0) return <span className="text-slate-500">فارغ</span>;
                                                    return (
                                                        <ul className="space-y-1">
                                                            {val.map((item, idx) => (
                                                                <li key={idx} className="flex items-start gap-2">
                                                                    <span className="text-primary mt-0.5 shrink-0">•</span>
                                                                    <span className="text-sm">{typeof item === 'object' && item !== null
                                                                        ? Object.entries(item).map(([k, v]) => (
                                                                            <span key={k} className="mr-2">
                                                                                <span className="text-slate-400 text-xs">{k.replace(/_/g, ' ')}:</span>{' '}
                                                                                {renderValue(v, depth + 1)}
                                                                            </span>
                                                                        ))
                                                                        : String(item)
                                                                    }</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    );
                                                }
                                                if (typeof val === 'object') {
                                                    return (
                                                        <div className={`space-y-1 ${depth > 0 ? 'ml-3 pl-3 border-l border-white/10' : ''}`}>
                                                            {Object.entries(val as Record<string, unknown>).map(([k, v]) => (
                                                                <div key={k} className="flex items-start gap-2 text-sm">
                                                                    <span className="text-slate-400 text-xs shrink-0 min-w-[80px]">{k.replace(/_/g, ' ')}:</span>
                                                                    <span>{renderValue(v, depth + 1)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return <span>{String(val)}</span>;
                                            };

                                            return (
                                                <div key={key} className="p-4 bg-white/5 rounded-xl border border-white/10">
                                                    <div className="text-sm font-bold text-primary mb-2">
                                                        {key.replace(/_/g, ' ').toUpperCase()}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {renderValue(value)}
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
                                                <div>نوع التحليل: {result.metadata.analysisType}</div>
                                                <div>حجم البيانات: {(result.metadata.dataSize / 1024).toFixed(1)} كيلوبايت</div>
                                                <div>الوقت: {new Date(result.metadata.timestamp).toLocaleString('ar')}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Analysis History */}
                            {analysisHistory.length > 1 && !isAnalyzing && (
                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FontAwesomeIcon icon={faHistory as any} className="text-muted-foreground text-xs" />
                                        <span className="text-xs text-muted-foreground">سجل التحليلات ({analysisHistory.length})</span>
                                    </div>
                                    <div className="space-y-1">
                                        {analysisHistory.slice(1).map((hist, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setResult(hist)}
                                                className="w-full text-left p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all text-xs"
                                            >
                                                <span className="text-primary font-semibold">{hist.metadata.analysisType}</span>
                                                <span className="text-muted-foreground mr-2"> — {new Date(hist.metadata.timestamp).toLocaleTimeString('ar')}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}

