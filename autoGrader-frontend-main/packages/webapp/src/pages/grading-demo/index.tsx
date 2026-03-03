"use client";

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faUsers, faQuestionCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import GradeAssignmentModal from '@/components/GradeAssignmentModal';
import Sidebar from '@/components/Sidebar';
import { PageHeader, Card, StatCard, Button } from "@/components/ui/UnifiedUI";

interface StudentData {
    name: string;
    answers: { [key: string]: string };
}

export default function GradingDemo() {
    const [students, setStudents] = useState<StudentData[]>([]);
    const [questions, setQuestions] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCSVData();
    }, []);

    const loadCSVData = async () => {
        try {
            const response = await fetch('/students_quiz.csv');
            const csvText = await response.text();

            // Parse CSV
            const lines = csvText.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',');

            // Extract questions (skip first column which is "Student Name")
            const questionHeaders = headers.slice(1).map(h => h.trim());
            setQuestions(questionHeaders);

            // Parse student data
            const studentData: StudentData[] = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                if (values.length > 1) {
                    const studentName = values[0].trim();
                    const answers: { [key: string]: string } = {};

                    for (let j = 1; j < values.length && j <= questionHeaders.length; j++) {
                        answers[questionHeaders[j - 1]] = values[j]?.trim() || '';
                    }

                    studentData.push({
                        name: studentName,
                        answers
                    });
                }
            }

            setStudents(studentData);
            setLoading(false);
        } catch (error) {
            console.error('Error loading CSV:', error);
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-background overflow-hidden text-foreground">
            <Sidebar />

            <main className="flex-1 ml-64 p-8 overflow-y-auto page-transition">
                {/* Background Gradients */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>

                <div className="relative z-10 max-w-6xl mx-auto">
                    <PageHeader
                        icon={faCheckCircle as any}
                        title="ديمو تقييم الواجبات"
                        subtitle="تجربة نظام التقييم الآلي باستخدام بيانات الطلاب الحقيقية"
                        gradient="primary"
                    />

                    {loading ? (
                        <Card className="p-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">جاري تحميل البيانات...</p>
                        </Card>
                    ) : (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-3 gap-6 mb-8">
                                <StatCard
                                    icon={faUsers as any}
                                    label="عدد الطلاب"
                                    value={students.length}
                                    color="blue"
                                    delay={0}
                                />
                                <StatCard
                                    icon={faQuestionCircle as any}
                                    label="عدد الأسئلة"
                                    value={questions.length}
                                    color="purple"
                                    delay={0.1}
                                />
                                <StatCard
                                    icon={faCheckCircle as any}
                                    label="إجمالي الإجابات"
                                    value={students.length * questions.length}
                                    color="green"
                                    delay={0.2}
                                />
                            </div>

                            {/* Questions List */}
                            <Card className="mb-8">
                                <h2 className="text-xl font-bold mb-4">الأسئلة المتاحة</h2>
                                <div className="space-y-3">
                                    {questions.map((q, idx) => (
                                        <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                                    <span className="text-primary font-bold">{idx + 1}</span>
                                                </div>
                                                <p className="text-sm flex-1">{q}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Students Preview */}
                            <Card className="mb-8">
                                <h2 className="text-xl font-bold mb-4">الطلاب المسجلون</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    {students.map((student, idx) => (
                                        <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                                <span className="text-primary font-bold">{idx + 1}</span>
                                            </div>
                                            <div>
                                                <p className="font-medium">{student.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {Object.keys(student.answers).length} إجابة
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Start Grading Button */}
                            <div className="glass-card p-8 text-center">
                                <h2 className="text-2xl font-bold mb-4">جاهز للبدء؟</h2>
                                <p className="text-muted-foreground mb-6">
                                    انقر على الزر أدناه لفتح نافذة التقييم واختيار السؤال الذي تريد تقييمه
                                </p>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="premium-gradient px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 mx-auto hover:shadow-lg hover:shadow-blue-500/20 transition-all"
                                >
                                    <FontAwesomeIcon icon={faPlay as any} />
                                    بدء التقييم الآن
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Grading Modal */}
            <GradeAssignmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                students={students}
                questions={questions}
            />
        </div>
    );
}

