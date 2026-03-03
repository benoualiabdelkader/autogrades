/**
 * API Endpoint: تحليل بيانات Extension بالذكاء الاصطناعي وفق Rules محددة
 * يستقبل بيانات الطلبة من Extension ويحللها باستخدام AI + Rules Engine
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';

// ─── Types ───
interface StudentData {
    id: string;
    name: string;
    answers: Record<string, string>;
}

interface GradingRule {
    id: string;
    name: string;
    nameAr: string;
    weight: number;
    type: string;
    config: any;
}

interface AnalysisRequest {
    students: StudentData[];
    questions: string[];
    rules?: GradingRule[];
    correctAnswers?: Record<string, string>;
    templateName?: string;
    useAI?: boolean;
    language?: 'ar' | 'en';
}

// ─── Rule Templates ───
const RULE_TEMPLATES: Record<string, GradingRule[]> = {
    'general': [
        { id: 'content', name: 'Content Quality', nameAr: 'جودة المحتوى', weight: 40, type: 'keyword', config: {} },
        { id: 'depth', name: 'Answer Depth', nameAr: 'عمق الإجابة', weight: 30, type: 'completeness', config: { minLength: 15, idealLength: 200 } },
        { id: 'presentation', name: 'Presentation', nameAr: 'العرض', weight: 30, type: 'length', config: { minLength: 5, maxLength: 3000, idealLength: 150 } }
    ],
    'arabic_essay': [
        { id: 'accuracy', name: 'Scientific Accuracy', nameAr: 'الدقة العلمية', weight: 35, type: 'keyword', config: {} },
        { id: 'completeness', name: 'Completeness', nameAr: 'الاكتمال', weight: 25, type: 'completeness', config: { minLength: 20, idealLength: 150 } },
        { id: 'structure', name: 'Structure', nameAr: 'البنية', weight: 20, type: 'structure', config: { requireExamples: true } },
        { id: 'language', name: 'Language', nameAr: 'اللغة', weight: 20, type: 'length', config: { minLength: 10, idealLength: 200 } }
    ],
    'quiz': [
        { id: 'correct', name: 'Correct Answer', nameAr: 'صحة الإجابة', weight: 100, type: 'accuracy', config: { similarityThreshold: 0.7 } }
    ]
};

// ─── Local Rule Evaluation ───
function evaluateRuleLocally(rule: GradingRule, answer: string, correctAnswer?: string): { score: number; comment: string; commentAr: string } {
    const normalized = (answer || '').trim().toLowerCase();
    const len = (answer || '').trim().length;

    switch (rule.type) {
        case 'keyword': {
            const cfg = rule.config || {};
            let score = len > 10 ? 60 + Math.min(40, len / 5) : (len > 0 ? 30 : 0);
            if (cfg.requiredKeywords?.length) {
                const found = cfg.requiredKeywords.filter((kw: string) => normalized.includes(kw.toLowerCase()));
                score = Math.round((found.length / cfg.requiredKeywords.length) * 80);
                if (cfg.bonusKeywords?.length) {
                    const bonus = cfg.bonusKeywords.filter((kw: string) => normalized.includes(kw.toLowerCase()));
                    score += Math.round((bonus.length / cfg.bonusKeywords.length) * 20);
                }
            }
            return { score: Math.min(100, Math.max(0, score)), comment: `Content score: ${score}`, commentAr: `درجة المحتوى: ${score}` };
        }
        case 'length': {
            const cfg = rule.config || {};
            const min = cfg.minLength || 5;
            const ideal = cfg.idealLength || 150;
            if (len === 0) return { score: 0, comment: 'No answer', commentAr: 'لا توجد إجابة' };
            if (len < min) return { score: Math.round((len / min) * 40), comment: `Too short (${len}/${min})`, commentAr: `قصيرة جداً (${len}/${min})` };
            const dev = Math.abs(len - ideal) / ideal;
            const score = Math.round(Math.max(60, 100 - dev * 40));
            return { score, comment: `Length OK (${len} chars)`, commentAr: `الطول مناسب (${len} حرف)` };
        }
        case 'completeness': {
            const cfg = rule.config || {};
            const min = cfg.minLength || 15;
            const ideal = cfg.idealLength || 200;
            const sentences = (answer || '').split(/[.!?،؟\n]+/).filter((s: string) => s.trim().length > 3);
            let score = 0;
            if (len >= ideal) score = 85 + Math.min(15, sentences.length * 3);
            else if (len >= min) score = 40 + Math.round(((len - min) / (ideal - min)) * 50);
            else if (len > 0) score = Math.round((len / min) * 40);
            return { score: Math.min(100, score), comment: `${sentences.length} sentences, ${len} chars`, commentAr: `${sentences.length} جمل، ${len} حرف` };
        }
        case 'accuracy': {
            if (!correctAnswer) {
                const score = len > 10 ? 60 : (len > 0 ? 30 : 0);
                return { score, comment: 'No reference answer', commentAr: 'لا توجد إجابة مرجعية' };
            }
            const words1 = new Set(normalized.split(/\s+/).filter(w => w.length > 1));
            const words2 = new Set(correctAnswer.toLowerCase().split(/\s+/).filter(w => w.length > 1));
            if (words1.size === 0 || words2.size === 0) return { score: 0, comment: 'Cannot compare', commentAr: 'لا يمكن المقارنة' };
            const intersection = [...words1].filter(w => words2.has(w)).length;
            const sim = (intersection / Math.min(words1.size, words2.size)) * 0.6 + (intersection / new Set([...words1, ...words2]).size) * 0.4;
            const score = Math.round(sim * 100);
            return { score, comment: `${score}% match`, commentAr: `${score}% تطابق` };
        }
        case 'structure': {
            const paragraphs = (answer || '').split(/\n\n+/).filter(p => p.trim().length > 5);
            const sentences = (answer || '').split(/[.!?،؟\n]+/).filter((s: string) => s.trim().length > 3);
            const hasExamples = /مثال|مثلاً|على سبيل|example|e\.g\./i.test(answer || '');
            let score = 40 + (paragraphs.length >= 2 ? 20 : 0) + (sentences.length >= 3 ? 15 : 0) + (hasExamples ? 15 : 0) + Math.min(10, len / 50);
            return { score: Math.min(100, Math.round(score)), comment: `${paragraphs.length} paragraphs, ${sentences.length} sentences`, commentAr: `${paragraphs.length} فقرات، ${sentences.length} جمل` };
        }
        default:
            return { score: 50, comment: 'Default', commentAr: 'افتراضي' };
    }
}

function getGradeInfo(score: number) {
    if (score >= 90) return { grade: 'Excellent', gradeAr: 'ممتاز', color: '#10b981' };
    if (score >= 80) return { grade: 'Very Good', gradeAr: 'جيد جداً', color: '#3b82f6' };
    if (score >= 70) return { grade: 'Good', gradeAr: 'جيد', color: '#f59e0b' };
    if (score >= 60) return { grade: 'Acceptable', gradeAr: 'مقبول', color: '#f97316' };
    if (score >= 50) return { grade: 'Weak', gradeAr: 'ضعيف', color: '#ef4444' };
    return { grade: 'Fail', gradeAr: 'راسب', color: '#dc2626' };
}

// ─── AI Enhanced Grading ───
async function gradeWithAI(
    studentName: string,
    question: string,
    answer: string,
    rules: GradingRule[],
    correctAnswer?: string
): Promise<any> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    const rulesDesc = rules.map((r, i) => `${i + 1}. ${r.nameAr} (الوزن: ${r.weight}%)`).join('\n');

    const systemPrompt = `أنت خبير تقييم تعليمي محترف وذكي. حلل إجابة الطالب بدقة عالية وفق القواعد المحددة.

قواعد التقييم:
${rulesDesc}

${correctAnswer ? `الإجابة الصحيحة المرجعية: ${correctAnswer}` : ''}

رد بصيغة JSON فقط:
{
  "grade": رقم 0-100,
  "feedback": "تعليق مفصل وبناء بالعربية",
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "weaknesses": ["نقطة ضعف 1"],
  "suggestions": ["اقتراح تحسين 1"],
  "ruleScores": {${rules.map(r => `"${r.id}": {"score": رقم, "comment": "شرح قصير"}`).join(', ')}},
  "analysis": "تحليل شامل ومختصر"
}`;

    try {
        const groq = new Groq({ apiKey });
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `السؤال: ${question}\n\nإجابة الطالب "${studentName}":\n${answer}` }
            ],
            temperature: 0.15,
            max_tokens: 1000,
            response_format: { type: 'json_object' }
        });

        const content = completion.choices?.[0]?.message?.content || '{}';
        return JSON.parse(content);
    } catch (error) {
        console.error('AI grading error:', error);
        return null;
    }
}

// ─── Main Handler ───
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const body = req.body as AnalysisRequest;
        const { students, questions, correctAnswers, useAI = false, language = 'ar' } = body;

        if (!students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ success: false, error: 'Students data is required' });
        }
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ success: false, error: 'Questions are required' });
        }

        // Select rules
        const rules = body.rules || RULE_TEMPLATES[body.templateName || 'general'] || RULE_TEMPLATES['general'];

        const startTime = Date.now();
        const results: any[] = [];

        for (const student of students) {
            for (const question of questions) {
                const answer = student.answers?.[question] || '';
                const correct = correctAnswers?.[question];

                // Local rule evaluation
                const ruleResults: Record<string, any> = {};
                let totalWeighted = 0;
                let totalWeight = 0;

                for (const rule of rules) {
                    const evaluation = evaluateRuleLocally(rule, answer, correct);
                    ruleResults[rule.id] = {
                        score: evaluation.score,
                        comment: language === 'ar' ? evaluation.commentAr : evaluation.comment,
                        weight: rule.weight,
                        weightedScore: (evaluation.score * rule.weight) / 100
                    };
                    totalWeighted += (evaluation.score * rule.weight) / 100;
                    totalWeight += rule.weight;
                }

                let localScore = totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 100) : 0;

                // AI Enhancement
                let aiResult = null;
                if (useAI) {
                    aiResult = await gradeWithAI(student.name, question, answer, rules, correct);
                    if (aiResult) {
                        // Blend: 40% local rules + 60% AI
                        const aiGrade = typeof aiResult.grade === 'number' ? aiResult.grade : localScore;
                        localScore = Math.round(localScore * 0.4 + aiGrade * 0.6);
                    }
                }

                const gradeInfo = getGradeInfo(localScore);

                results.push({
                    studentId: student.id,
                    studentName: student.name,
                    question,
                    answer: answer.substring(0, 500),
                    totalScore: localScore,
                    grade: gradeInfo.grade,
                    gradeAr: gradeInfo.gradeAr,
                    gradeColor: gradeInfo.color,
                    ruleScores: ruleResults,
                    aiAnalysis: aiResult ? {
                        feedback: aiResult.feedback,
                        strengths: aiResult.strengths || [],
                        weaknesses: aiResult.weaknesses || [],
                        suggestions: aiResult.suggestions || [],
                        analysis: aiResult.analysis
                    } : null,
                    timestamp: new Date().toISOString()
                });

                // Small delay for AI calls
                if (useAI) await new Promise(r => setTimeout(r, 500));
            }
        }

        // Generate summary
        const scores = results.map(r => r.totalScore);
        const sorted = [...scores].sort((a, b) => a - b);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];

        const gradeDistribution: Record<string, number> = {};
        results.forEach(r => {
            gradeDistribution[r.gradeAr] = (gradeDistribution[r.gradeAr] || 0) + 1;
        });

        // Per-student averages
        const studentAverages: Record<string, { total: number; count: number }> = {};
        results.forEach(r => {
            if (!studentAverages[r.studentName]) studentAverages[r.studentName] = { total: 0, count: 0 };
            studentAverages[r.studentName].total += r.totalScore;
            studentAverages[r.studentName].count += 1;
        });

        const studentRanking = Object.entries(studentAverages)
            .map(([name, s]) => ({ name, average: Math.round(s.total / s.count) }))
            .sort((a, b) => b.average - a.average);

        return res.status(200).json({
            success: true,
            results,
            summary: {
                averageScore: Math.round(avg),
                medianScore: Math.round(median),
                highestScore: Math.max(...scores),
                lowestScore: Math.min(...scores),
                passRate: Math.round((scores.filter(s => s >= 60).length / scores.length) * 100),
                gradeDistribution,
                studentRanking,
                topPerformers: studentRanking.filter(s => s.average >= 80).map(s => s.name),
                atRiskStudents: studentRanking.filter(s => s.average < 60).map(s => s.name),
                rulesUsed: rules.map(r => ({ id: r.id, name: r.nameAr, weight: r.weight }))
            },
            metadata: {
                totalStudents: students.length,
                totalQuestions: questions.length,
                totalResults: results.length,
                processingTime: Date.now() - startTime,
                aiEnhanced: useAI,
                rulesApplied: rules.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Analysis error:', error);
        return res.status(500).json({
            success: false,
            error: error?.message || 'Unknown error'
        });
    }
}
