"use client";

import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faTimes,
    faPlay,
    faSpinner,
    faCheckCircle,
    faDownload,
    faExclamationTriangle
} from "@fortawesome/free-solid-svg-icons";
import { TaskWorkflows, PREDEFINED_WORKFLOWS } from "@/lib/workflow/TaskWorkflows";

interface WorkflowExecutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: {
        id: number;
        title: string;
        description: string;
        icon: string;
    } | null;
}

export default function WorkflowExecutionModal({
    isOpen,
    onClose,
    task
}: WorkflowExecutionModalProps) {
    const [isExecuting, setIsExecuting] = useState(false);
    const [currentStep, setCurrentStep] = useState('');
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && task) {
            // إعادة تعيين الحالة
            setIsExecuting(false);
            setCurrentStep('');
            setProgress(0);
            setResult(null);
            setError(null);
        }
    }, [isOpen, task]);

    const handleExecute = async () => {
        if (!task) return;

        setIsExecuting(true);
        setError(null);
        setProgress(0);

        try {
            const workflowResult = await TaskWorkflows.executeWorkflowByTaskId(
                task.id,
                (step, prog) => {
                    setCurrentStep(step);
                    setProgress(prog);
                }
            );

            if (workflowResult.success) {
                setResult(workflowResult);
                setProgress(100);
            } else {
                setError('فشل تنفيذ الـ workflow. يرجى المحاولة مرة أخرى.');
            }
        } catch (err: any) {
            setError(err.message || 'حدث خطأ غير متوقع');
        } finally {
            setIsExecuting(false);
        }
    };

    if (!isOpen || !task) return null;

    const workflowInfo = PREDEFINED_WORKFLOWS[task.id as keyof typeof PREDEFINED_WORKFLOWS];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-white/10 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="text-4xl">{task.icon}</div>
                        <div>
                            <h2 className="text-2xl font-bold premium-text-gradient">
                                {task.title}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {task.description}
                            </p>
                        </div>
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
                    {!result && !error ? (
                        <>
                            {/* Workflow Info */}
                            {workflowInfo && (
                                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                                    <h3 className="text-sm font-bold text-blue-500 mb-3">Workflow Steps</h3>
                                    <div className="space-y-2">
                                        {workflowInfo.steps.map((step, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-500">
                                                    {idx + 1}
                                                </div>
                                                <span className="text-sm">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Data Source Info */}
                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                                <h3 className="text-sm font-bold text-purple-500 mb-2">Data Source</h3>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Host:</span>
                                        <span className="font-mono">127.0.0.1</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Port:</span>
                                        <span className="font-mono">3307</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Database:</span>
                                        <span className="font-mono">moodle</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Prefix:</span>
                                        <span className="font-mono">mdl_</span>
                                    </div>
                                </div>
                            </div>

                            {/* AI Provider Info */}
                            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                                <h3 className="text-sm font-bold text-green-500 mb-2">AI Provider</h3>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Provider:</span>
                                        <span className="font-mono">Groq API</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Model:</span>
                                        <span className="font-mono">qwen/qwen3-32b</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Output:</span>
                                        <span className="font-mono uppercase">{workflowInfo?.outputFormat}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Language:</span>
                                        <span className="font-mono">English/French</span>
                                    </div>
                                </div>
                            </div>

                            {/* Execute Button */}
                            <button
                                onClick={handleExecute}
                                disabled={isExecuting}
                                className="w-full premium-gradient p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50"
                            >
                                {isExecuting ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner as any} spin />
                                        Executing... {Math.round(progress)}%
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faPlay as any} />
                                        Execute Workflow
                                    </>
                                )}
                            </button>

                            {/* Progress */}
                            {isExecuting && (
                                <div className="space-y-3">
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    {currentStep && (
                                        <p className="text-sm text-center text-muted-foreground">
                                            {currentStep}
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    ) : error ? (
                        /* Error State */
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                                <FontAwesomeIcon icon={faExclamationTriangle as any} className="text-3xl text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-red-500 mb-2">Execution Failed</h3>
                            <p className="text-muted-foreground mb-6">{error}</p>
                            <button
                                onClick={() => {
                                    setError(null);
                                    setResult(null);
                                }}
                                className="bg-white/5 border border-white/10 px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-all"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        /* Success State */
                        <div className="space-y-4">
                            <div className="text-center py-6">
                                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                                    <FontAwesomeIcon icon={faCheckCircle as any} className="text-3xl text-green-500" />
                                </div>
                                <h3 className="text-xl font-bold text-green-500 mb-2">Successfully Executed!</h3>
                                <p className="text-muted-foreground">
                                    Processed {result.stats.totalProcessed} items in {(result.stats.duration / 1000).toFixed(1)} seconds
                                </p>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-green-500">{result.stats.successful}</div>
                                    <div className="text-xs text-muted-foreground">Successful</div>
                                </div>
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-red-500">{result.stats.failed}</div>
                                    <div className="text-xs text-muted-foreground">Failed</div>
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-blue-500">{result.stats.totalProcessed}</div>
                                    <div className="text-xs text-muted-foreground">Total</div>
                                </div>
                            </div>

                            {/* Download Button */}
                            {result.output && (
                                <button
                                    className="w-full bg-primary/10 text-primary border border-primary/20 p-3 rounded-xl font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faDownload as any} />
                                    Downloaded Automatically
                                </button>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="w-full bg-white/5 border border-white/10 p-3 rounded-xl font-bold hover:bg-white/10 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
