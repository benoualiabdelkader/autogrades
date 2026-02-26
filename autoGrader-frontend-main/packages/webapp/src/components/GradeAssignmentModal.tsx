"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faTimes,
    faPlay,
    faSpinner,
    faCheckCircle,
    faDownload,
    faCog
} from "@fortawesome/free-solid-svg-icons";
import { GradingEngine, Assignment, GradingResult } from "@/lib/grading/GradingEngine";

interface GradeAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Array<{
        name: string;
        answers: { [key: string]: string };
    }>;
    questions: string[];
}

const DEFAULT_RULES = `معايير التقييم:
1. الدقة والصحة العلمية (40%)
2. الوضوح والتنظيم (30%)
3. الأمثلة والتفاصيل (20%)
4. اللغة والإملاء (10%)

التقييم:
- 90-100: ممتاز - إجابة كاملة ودقيقة
- 80-89: جيد جداً - إجابة جيدة مع بعض النقص
- 70-79: جيد - إجابة مقبولة
- 60-69: مقبول - إجابة ناقصة
- أقل من 60: ضعيف - يحتاج تحسين`;

export default function GradeAssignmentModal({
    isOpen,
    onClose,
    students,
    questions
}: GradeAssignmentModalProps) {
    const [rules, setRules] = useState(DEFAULT_RULES);
    const [useDefaultRules, setUseDefaultRules] = useState(true);
    const [selectedQuestion, setSelectedQuestion] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<GradingResult[]>([]);
    const [showResults, setShowResults] = useState(false);

    const handleStartGrading = async () => {
        setIsProcessing(true);
        setProgress(0);
        setResults([]);

        try {
            const engine = new GradingEngine();
            await engine.initialize();

            const questionText = questions[selectedQuestion];
            const assignments: Assignment[] = students.map((student, idx) => ({
                studentId: student.name,
                assignmentId: `Q${selectedQuestion + 1}_${idx}`,
                assignmentText: student.answers[questionText] || "لا توجد إجابة",
                rubricCriteria: useDefaultRules ? DEFAULT_RULES : rules
            }));

            const gradingResults = await engine.gradeBatch(assignments, {
                maxConcurrent: 3,
                delayBetweenRequests: 2,
                maxItems: students.length,
                onProgress: (current, total) => {
                    setProgress(Math.round((current / total) * 100));
                }
            });

            setResults(gradingResults);
            setShowResults(true);
        } catch (error: any) {
            console.error('Grading failed:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadResults = () => {
        GradingEngine.downloadCSV(results, `grading_results_Q${selectedQuestion + 1}.csv`);
    };

    const stats = results.length > 0 ? GradingEngine.calculateStats(results) : null;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-white/10 p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold premium-text-gradient">
                            تقييم الواجبات بالذكاء الاصطناعي
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {students.length} طالب • {questions.length} سؤال
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                        <FontAwesomeIcon icon={faTimes as any} className="text-xl" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {!showResults ? (
                        <>
                            {/* Question Selection */}
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    اختر السؤال للتقييم
                                </label>
                                <select
                                    value={selectedQuestion}
                                    onChange={(e) => setSelectedQuestion(parseInt(e.target.value))}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                                >
                                    {questions.map((q, idx) => (
                                        <option key={idx} value={idx}>
                                            السؤال {idx + 1}: {q.substring(0, 50)}...
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Rules Toggle */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-muted-foreground">
                                        معايير التقييم
                                    </label>
                                    <button
                                        onClick={() => setUseDefaultRules(!useDefaultRules)}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                            useDefaultRules
                                                ? 'bg-primary/20 border-primary/50 text-primary'
                                                : 'bg-white/5 border-white/10 text-muted-foreground'
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={faCog as any} className="mr-1" />
                                        {useDefaultRules ? 'استخدام الافتراضي' : 'مخصص'}
                                    </button>
                                </div>

                                {useDefaultRules ? (
                                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                                        <pre className="text-xs text-primary whitespace-pre-wrap font-mono">
                                            {DEFAULT_RULES}
                                        </pre>
                                    </div>
                                ) : (
                                    <textarea
                                        value={rules}
                                        onChange={(e) => setRules(e.target.value)}
                                        placeholder="أدخل معايير التقييم المخصصة..."
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 min-h-[200px] focus:ring-2 focus:ring-primary outline-none font-mono text-sm"
                                    />
                                )}
                            </div>

                            {/* Preview */}
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                                <h3 className="text-sm font-bold text-blue-500 mb-2">معاينة</h3>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">عدد الطلاب:</span>
                                        <span className="font-bold">{students.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">السؤال:</span>
                                        <span className="font-bold">السؤال {selectedQuestion + 1}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">الوقت المتوقع:</span>
                                        <span className="font-bold">~{Math.ceil(students.length * 2 / 3)} ثانية</span>
                                    </div>
                                </div>
                            </div>

                            {/* Start Button */}
                            <button
                                onClick={handleStartGrading}
                                disabled={isProcessing}
                                className="w-full premium-gradient p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner as any} spin />
                                        جاري التقييم... {progress}%
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faPlay as any} />
                                        بدء التقييم
                                    </>
                                )}
                            </button>

                            {/* Progress Bar */}
                            {isProcessing && (
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Results */}
                            <div className="space-y-4">
                                {/* Stats */}
                                {stats && (
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                                            <div className="text-2xl font-bold text-green-500">{stats.successful}</div>
                                            <div className="text-xs text-muted-foreground">ناجح</div>
                                        </div>
                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                                            <div className="text-2xl font-bold text-blue-500">{stats.averageGrade}</div>
                                            <div className="text-xs text-muted-foreground">المتوسط</div>
                                        </div>
                                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                                            <div className="text-2xl font-bold text-purple-500">{stats.highestGrade}</div>
                                            <div className="text-xs text-muted-foreground">الأعلى</div>
                                        </div>
                                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                                            <div className="text-2xl font-bold text-orange-500">{stats.lowestGrade}</div>
                                            <div className="text-xs text-muted-foreground">الأدنى</div>
                                        </div>
                                    </div>
                                )}

                                {/* Results List */}
                                <div className="max-h-[400px] overflow-y-auto space-y-2">
                                    {results.map((result, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-xl border ${
                                                result.error
                                                    ? 'bg-red-500/5 border-red-500/20'
                                                    : 'bg-white/5 border-white/10'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold">{result.studentId}</span>
                                                <span className={`text-2xl font-bold ${
                                                    result.grade >= 90 ? 'text-green-500' :
                                                    result.grade >= 80 ? 'text-blue-500' :
                                                    result.grade >= 70 ? 'text-yellow-500' :
                                                    result.grade >= 60 ? 'text-orange-500' :
                                                    'text-red-500'
                                                }`}>
                                                    {result.grade}/100
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {result.feedback}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={downloadResults}
                                        className="flex-1 bg-primary/10 text-primary border border-primary/20 p-3 rounded-xl font-bold hover:bg-primary/20 transition-all"
                                    >
                                        <FontAwesomeIcon icon={faDownload as any} className="mr-2" />
                                        تحميل النتائج
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowResults(false);
                                            setResults([]);
                                            setProgress(0);
                                        }}
                                        className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl font-bold hover:bg-white/10 transition-all"
                                    >
                                        تقييم سؤال آخر
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
