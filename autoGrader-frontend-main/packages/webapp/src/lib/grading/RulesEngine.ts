/**
 * Rules Engine - محرك القواعد الذكي للتقييم
 * يحلل بيانات Extension وفق قواعد مخصصة ويعطي نتائج دقيقة وعبقرية
 */

export interface GradingRule {
    id: string;
    name: string;
    nameAr: string;
    weight: number; // 0-100
    type: 'keyword' | 'length' | 'completeness' | 'accuracy' | 'structure' | 'custom';
    config: RuleConfig;
}

export interface RuleConfig {
    // keyword matching
    keywords?: string[];
    requiredKeywords?: string[];
    bonusKeywords?: string[];
    penaltyKeywords?: string[];
    
    // length rules
    minLength?: number;
    maxLength?: number;
    idealLength?: number;
    
    // completeness
    requiredElements?: string[];
    
    // accuracy
    correctAnswers?: Record<string, string>;
    similarityThreshold?: number;
    
    // structure
    requireIntroduction?: boolean;
    requireConclusion?: boolean;
    requireExamples?: boolean;
    
    // custom function (serialized as string for portability)
    evaluator?: string;
}

export interface RuleEvaluation {
    ruleId: string;
    ruleName: string;
    ruleNameAr: string;
    score: number; // 0-100
    weight: number;
    weightedScore: number;
    details: string;
    detailsAr: string;
    passed: boolean;
    suggestions: string[];
    suggestionsAr: string[];
}

export interface AnalysisResult {
    studentId: string;
    studentName: string;
    question: string;
    answer: string;
    totalScore: number;
    grade: string;
    gradeAr: string;
    gradeColor: string;
    ruleEvaluations: RuleEvaluation[];
    strengths: string[];
    strengthsAr: string[];
    weaknesses: string[];
    weaknessesAr: string[];
    suggestions: string[];
    suggestionsAr: string[];
    aiAnalysis?: string;
    aiAnalysisAr?: string;
    timestamp: string;
}

export interface BatchAnalysisResult {
    results: AnalysisResult[];
    summary: AnalysisSummary;
    metadata: {
        totalStudents: number;
        totalQuestions: number;
        processingTime: number;
        rulesApplied: number;
        timestamp: string;
    };
}

export interface AnalysisSummary {
    averageScore: number;
    medianScore: number;
    highestScore: number;
    lowestScore: number;
    standardDeviation: number;
    passRate: number;
    gradeDistribution: Record<string, number>;
    topPerformers: string[];
    atRiskStudents: string[];
    commonStrengths: string[];
    commonWeaknesses: string[];
    ruleInsights: RuleInsight[];
}

export interface RuleInsight {
    ruleId: string;
    ruleName: string;
    averageScore: number;
    hardestFor: string[];
    easiestFor: string[];
}

// ─── Predefined Rule Templates ───

export const RULE_TEMPLATES: Record<string, GradingRule[]> = {
    'arabic_essay': [
        {
            id: 'accuracy',
            name: 'Scientific Accuracy',
            nameAr: 'الدقة العلمية',
            weight: 35,
            type: 'keyword',
            config: {
                requiredKeywords: [],
                bonusKeywords: [],
                penaltyKeywords: ['خطأ', 'غير صحيح']
            }
        },
        {
            id: 'completeness',
            name: 'Answer Completeness',
            nameAr: 'اكتمال الإجابة',
            weight: 25,
            type: 'completeness',
            config: {
                minLength: 20,
                idealLength: 150,
                requiredElements: []
            }
        },
        {
            id: 'structure',
            name: 'Organization & Structure',
            nameAr: 'التنظيم والبنية',
            weight: 20,
            type: 'structure',
            config: {
                requireIntroduction: false,
                requireConclusion: false,
                requireExamples: true
            }
        },
        {
            id: 'language',
            name: 'Language Quality',
            nameAr: 'جودة اللغة',
            weight: 20,
            type: 'length',
            config: {
                minLength: 10,
                maxLength: 2000,
                idealLength: 200
            }
        }
    ],
    'quiz_mcq': [
        {
            id: 'correct_answer',
            name: 'Correct Answer',
            nameAr: 'صحة الإجابة',
            weight: 100,
            type: 'accuracy',
            config: {
                correctAnswers: {},
                similarityThreshold: 0.8
            }
        }
    ],
    'programming': [
        {
            id: 'code_correctness',
            name: 'Code Correctness',
            nameAr: 'صحة الكود',
            weight: 40,
            type: 'keyword',
            config: {
                requiredKeywords: ['function', 'return'],
                bonusKeywords: ['class', 'const', 'async'],
                penaltyKeywords: ['eval', 'var']
            }
        },
        {
            id: 'code_quality',
            name: 'Code Quality',
            nameAr: 'جودة الكود',
            weight: 30,
            type: 'structure',
            config: {
                requireExamples: false
            }
        },
        {
            id: 'code_completeness',
            name: 'Completeness',
            nameAr: 'الاكتمال',
            weight: 30,
            type: 'completeness',
            config: {
                minLength: 20,
                idealLength: 500
            }
        }
    ],
    'general': [
        {
            id: 'content_quality',
            name: 'Content Quality',
            nameAr: 'جودة المحتوى',
            weight: 40,
            type: 'keyword',
            config: {}
        },
        {
            id: 'answer_depth',
            name: 'Answer Depth',
            nameAr: 'عمق الإجابة',
            weight: 30,
            type: 'completeness',
            config: {
                minLength: 15,
                idealLength: 200
            }
        },
        {
            id: 'presentation',
            name: 'Presentation',
            nameAr: 'طريقة العرض',
            weight: 30,
            type: 'length',
            config: {
                minLength: 5,
                maxLength: 3000,
                idealLength: 150
            }
        }
    ]
};

// ─── Rules Engine Class ───

export class RulesEngine {
    private rules: GradingRule[] = [];
    
    constructor(rules?: GradingRule[]) {
        this.rules = rules || RULE_TEMPLATES['general'];
    }

    setRules(rules: GradingRule[]): void {
        this.rules = rules;
    }

    loadTemplate(templateName: string): void {
        this.rules = RULE_TEMPLATES[templateName] || RULE_TEMPLATES['general'];
    }

    getRules(): GradingRule[] {
        return [...this.rules];
    }

    /**
     * Evaluate a single answer against all rules
     */
    evaluateAnswer(
        studentId: string,
        studentName: string,
        question: string,
        answer: string,
        correctAnswer?: string
    ): AnalysisResult {
        const evaluations: RuleEvaluation[] = [];
        let totalWeightedScore = 0;
        let totalWeight = 0;

        for (const rule of this.rules) {
            const evaluation = this.evaluateRule(rule, answer, question, correctAnswer);
            evaluations.push(evaluation);
            totalWeightedScore += evaluation.weightedScore;
            totalWeight += rule.weight;
        }

        const totalScore = totalWeight > 0 
            ? Math.round((totalWeightedScore / totalWeight) * 100) / 100
            : 0;

        const { grade, gradeAr, gradeColor } = this.getGradeInfo(totalScore);
        const { strengths, strengthsAr, weaknesses, weaknessesAr, suggestions, suggestionsAr } 
            = this.generateFeedback(evaluations, totalScore);

        return {
            studentId,
            studentName,
            question,
            answer,
            totalScore: Math.round(totalScore),
            grade,
            gradeAr,
            gradeColor,
            ruleEvaluations: evaluations,
            strengths,
            strengthsAr,
            weaknesses,
            weaknessesAr,
            suggestions,
            suggestionsAr,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Evaluate a single rule
     */
    private evaluateRule(
        rule: GradingRule,
        answer: string,
        question: string,
        correctAnswer?: string
    ): RuleEvaluation {
        let score = 0;
        let details = '';
        let detailsAr = '';
        const suggestions: string[] = [];
        const suggestionsAr: string[] = [];

        const normalizedAnswer = (answer || '').trim().toLowerCase();
        const answerLength = (answer || '').trim().length;

        switch (rule.type) {
            case 'keyword': {
                const config = rule.config;
                let keywordScore = 50; // base score
                
                // Required keywords
                if (config.requiredKeywords && config.requiredKeywords.length > 0) {
                    const found = config.requiredKeywords.filter(kw => 
                        normalizedAnswer.includes(kw.toLowerCase())
                    );
                    const ratio = found.length / config.requiredKeywords.length;
                    keywordScore = Math.round(ratio * 70);
                    
                    if (ratio < 1) {
                        const missing = config.requiredKeywords.filter(kw => 
                            !normalizedAnswer.includes(kw.toLowerCase())
                        );
                        suggestions.push(`Missing required terms: ${missing.join(', ')}`);
                        suggestionsAr.push(`مصطلحات مطلوبة مفقودة: ${missing.join('، ')}`);
                    }
                }

                // Bonus keywords
                if (config.bonusKeywords && config.bonusKeywords.length > 0) {
                    const found = config.bonusKeywords.filter(kw => 
                        normalizedAnswer.includes(kw.toLowerCase())
                    );
                    keywordScore += Math.round((found.length / config.bonusKeywords.length) * 30);
                }

                // Penalty keywords
                if (config.penaltyKeywords && config.penaltyKeywords.length > 0) {
                    const found = config.penaltyKeywords.filter(kw => 
                        normalizedAnswer.includes(kw.toLowerCase())
                    );
                    keywordScore -= found.length * 10;
                }

                score = Math.max(0, Math.min(100, keywordScore));
                
                // If no keywords configured, give score based on content quality
                if (!config.requiredKeywords?.length && !config.bonusKeywords?.length) {
                    score = Math.min(100, Math.max(30, answerLength > 10 ? 60 + Math.min(40, answerLength / 5) : 20));
                }

                details = `Keyword analysis: scored ${score}/100`;
                detailsAr = `تحليل الكلمات المفتاحية: ${score}/100`;
                break;
            }

            case 'length': {
                const config = rule.config;
                const min = config.minLength || 5;
                const max = config.maxLength || 3000;
                const ideal = config.idealLength || 150;

                if (answerLength === 0) {
                    score = 0;
                    details = 'No answer provided';
                    detailsAr = 'لا توجد إجابة';
                    suggestions.push('Please provide an answer');
                    suggestionsAr.push('يرجى تقديم إجابة');
                } else if (answerLength < min) {
                    score = Math.round((answerLength / min) * 40);
                    details = `Answer too short (${answerLength}/${min} chars)`;
                    detailsAr = `الإجابة قصيرة جداً (${answerLength}/${min} حرف)`;
                    suggestions.push(`Answer should be at least ${min} characters`);
                    suggestionsAr.push(`يجب أن تكون الإجابة ${min} حرف على الأقل`);
                } else if (answerLength > max) {
                    score = 70;
                    details = `Answer exceeds maximum (${answerLength}/${max} chars)`;
                    detailsAr = `الإجابة تتجاوز الحد الأقصى (${answerLength}/${max} حرف)`;
                    suggestions.push('Consider being more concise');
                    suggestionsAr.push('حاول أن تكون أكثر إيجازاً');
                } else {
                    // Score based on proximity to ideal length
                    const deviation = Math.abs(answerLength - ideal) / ideal;
                    score = Math.round(Math.max(60, 100 - (deviation * 40)));
                    details = `Good length (${answerLength} chars, ideal: ${ideal})`;
                    detailsAr = `طول جيد (${answerLength} حرف، المثالي: ${ideal})`;
                }
                break;
            }

            case 'completeness': {
                const config = rule.config;
                let completenessScore = 0;

                // Length-based completeness
                const min = config.minLength || 15;
                const ideal = config.idealLength || 200;
                
                if (answerLength >= ideal) {
                    completenessScore = 90;
                } else if (answerLength >= min) {
                    completenessScore = 40 + Math.round(((answerLength - min) / (ideal - min)) * 50);
                } else if (answerLength > 0) {
                    completenessScore = Math.round((answerLength / min) * 40);
                }

                // Required elements check
                if (config.requiredElements && config.requiredElements.length > 0) {
                    const found = config.requiredElements.filter(el => 
                        normalizedAnswer.includes(el.toLowerCase())
                    );
                    const elemRatio = found.length / config.requiredElements.length;
                    completenessScore = Math.round((completenessScore * 0.5) + (elemRatio * 100 * 0.5));
                    
                    if (elemRatio < 1) {
                        const missing = config.requiredElements.filter(el => 
                            !normalizedAnswer.includes(el.toLowerCase())
                        );
                        suggestions.push(`Missing elements: ${missing.join(', ')}`);
                        suggestionsAr.push(`عناصر مفقودة: ${missing.join('، ')}`);
                    }
                }

                // Bonus for sentence structure (multiple sentences)
                const sentences = (answer || '').split(/[.!?،؟。\n]+/).filter(s => s.trim().length > 3);
                if (sentences.length > 2) {
                    completenessScore = Math.min(100, completenessScore + 10);
                }

                score = Math.max(0, Math.min(100, completenessScore));
                details = `Completeness: ${score}% (${answerLength} chars, ${sentences.length} sentences)`;
                detailsAr = `الاكتمال: ${score}% (${answerLength} حرف، ${sentences.length} جمل)`;
                break;
            }

            case 'accuracy': {
                const config = rule.config;
                
                if (correctAnswer) {
                    const similarity = this.calculateSimilarity(normalizedAnswer, correctAnswer.toLowerCase());
                    const threshold = config.similarityThreshold || 0.8;
                    
                    if (similarity >= threshold) {
                        score = Math.round(80 + (similarity - threshold) / (1 - threshold) * 20);
                    } else if (similarity >= threshold * 0.5) {
                        score = Math.round(40 + (similarity / threshold) * 40);
                    } else {
                        score = Math.round(similarity * 50);
                    }
                    
                    details = `Accuracy: ${Math.round(similarity * 100)}% match`;
                    detailsAr = `الدقة: ${Math.round(similarity * 100)}% تطابق`;
                } else {
                    // Without correct answer, use heuristic
                    score = answerLength > 10 ? 60 : (answerLength > 0 ? 30 : 0);
                    details = 'Accuracy evaluation (no reference answer)';
                    detailsAr = 'تقييم الدقة (بدون إجابة مرجعية)';
                }
                break;
            }

            case 'structure': {
                const config = rule.config;
                let structureScore = 60; // base

                // Check for paragraphs/structure
                const paragraphs = (answer || '').split(/\n\n+/).filter(p => p.trim().length > 5);
                if (paragraphs.length >= 2) structureScore += 15;

                // Check for examples
                if (config.requireExamples) {
                    const hasExamples = /مثال|مثلاً|على سبيل المثال|example|e\.g\.|for instance/i.test(answer || '');
                    if (hasExamples) {
                        structureScore += 15;
                    } else {
                        suggestions.push('Consider adding examples to support your answer');
                        suggestionsAr.push('حاول إضافة أمثلة لدعم إجابتك');
                    }
                }

                // Sentence variety
                const sentences = (answer || '').split(/[.!?،؟。\n]+/).filter(s => s.trim().length > 3);
                if (sentences.length >= 3) structureScore += 10;

                score = Math.max(0, Math.min(100, structureScore));
                details = `Structure: ${paragraphs.length} paragraphs, ${sentences.length} sentences`;
                detailsAr = `البنية: ${paragraphs.length} فقرات، ${sentences.length} جمل`;
                break;
            }

            default:
                score = 50;
                details = 'Default evaluation';
                detailsAr = 'تقييم افتراضي';
        }

        return {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleNameAr: rule.nameAr,
            score,
            weight: rule.weight,
            weightedScore: (score * rule.weight) / 100,
            details,
            detailsAr,
            passed: score >= 50,
            suggestions,
            suggestionsAr
        };
    }

    /**
     * Calculate text similarity (Jaccard + containment)
     */
    private calculateSimilarity(text1: string, text2: string): number {
        const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 1));
        const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 1));

        if (words1.size === 0 && words2.size === 0) return 1;
        if (words1.size === 0 || words2.size === 0) return 0;

        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const union = new Set([...words1, ...words2]);

        const jaccard = intersection.size / union.size;
        const containment = intersection.size / Math.min(words1.size, words2.size);

        return (jaccard * 0.4 + containment * 0.6);
    }

    /**
     * Get grade info from score
     */
    private getGradeInfo(score: number): { grade: string; gradeAr: string; gradeColor: string } {
        if (score >= 90) return { grade: 'Excellent', gradeAr: 'ممتاز', gradeColor: '#10b981' };
        if (score >= 80) return { grade: 'Very Good', gradeAr: 'جيد جداً', gradeColor: '#3b82f6' };
        if (score >= 70) return { grade: 'Good', gradeAr: 'جيد', gradeColor: '#f59e0b' };
        if (score >= 60) return { grade: 'Acceptable', gradeAr: 'مقبول', gradeColor: '#f97316' };
        if (score >= 50) return { grade: 'Weak', gradeAr: 'ضعيف', gradeColor: '#ef4444' };
        return { grade: 'Fail', gradeAr: 'راسب', gradeColor: '#dc2626' };
    }

    /**
     * Generate feedback from evaluations
     */
    private generateFeedback(evaluations: RuleEvaluation[], totalScore: number) {
        const strengths: string[] = [];
        const strengthsAr: string[] = [];
        const weaknesses: string[] = [];
        const weaknessesAr: string[] = [];
        const suggestions: string[] = [];
        const suggestionsAr: string[] = [];

        for (const ev of evaluations) {
            if (ev.score >= 75) {
                strengths.push(`${ev.ruleName}: ${ev.details}`);
                strengthsAr.push(`${ev.ruleNameAr}: ${ev.detailsAr}`);
            } else if (ev.score < 50) {
                weaknesses.push(`${ev.ruleName}: ${ev.details}`);
                weaknessesAr.push(`${ev.ruleNameAr}: ${ev.detailsAr}`);
            }
            suggestions.push(...ev.suggestions);
            suggestionsAr.push(...ev.suggestionsAr);
        }

        // Add general suggestions
        if (totalScore < 60) {
            suggestions.push('Focus on providing more detailed and complete answers');
            suggestionsAr.push('ركز على تقديم إجابات أكثر تفصيلاً واكتمالاً');
        }

        return { strengths, strengthsAr, weaknesses, weaknessesAr, suggestions, suggestionsAr };
    }

    /**
     * Batch evaluate multiple students
     */
    evaluateBatch(
        students: Array<{
            id: string;
            name: string;
            answers: Record<string, string>;
        }>,
        questions: string[],
        correctAnswers?: Record<string, string>
    ): BatchAnalysisResult {
        const startTime = Date.now();
        const results: AnalysisResult[] = [];

        for (const student of students) {
            for (const question of questions) {
                const answer = student.answers[question] || '';
                const correctAnswer = correctAnswers?.[question];
                
                const result = this.evaluateAnswer(
                    student.id,
                    student.name,
                    question,
                    answer,
                    correctAnswer
                );
                results.push(result);
            }
        }

        const summary = this.generateSummary(results, students);
        
        return {
            results,
            summary,
            metadata: {
                totalStudents: students.length,
                totalQuestions: questions.length,
                processingTime: Date.now() - startTime,
                rulesApplied: this.rules.length,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Generate comprehensive summary
     */
    private generateSummary(results: AnalysisResult[], students: any[]): AnalysisSummary {
        const scores = results.map(r => r.totalScore);
        const sorted = [...scores].sort((a, b) => a - b);

        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];

        const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);

        // Grade distribution
        const gradeDistribution: Record<string, number> = {
            'ممتاز': 0, 'جيد جداً': 0, 'جيد': 0, 'مقبول': 0, 'ضعيف': 0, 'راسب': 0
        };
        results.forEach(r => {
            gradeDistribution[r.gradeAr] = (gradeDistribution[r.gradeAr] || 0) + 1;
        });

        // Aggregate by student
        const studentScores: Record<string, number[]> = {};
        results.forEach(r => {
            if (!studentScores[r.studentName]) studentScores[r.studentName] = [];
            studentScores[r.studentName].push(r.totalScore);
        });

        const studentAverages = Object.entries(studentScores).map(([name, scores]) => ({
            name,
            avg: scores.reduce((a, b) => a + b, 0) / scores.length
        })).sort((a, b) => b.avg - a.avg);

        const topPerformers = studentAverages.filter(s => s.avg >= 80).map(s => s.name);
        const atRiskStudents = studentAverages.filter(s => s.avg < 60).map(s => s.name);

        // Common patterns
        const allStrengths = results.flatMap(r => r.strengthsAr);
        const allWeaknesses = results.flatMap(r => r.weaknessesAr);
        
        const strengthCounts = this.countOccurrences(allStrengths);
        const weaknessCounts = this.countOccurrences(allWeaknesses);

        const commonStrengths = Object.entries(strengthCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([s]) => s);
        const commonWeaknesses = Object.entries(weaknessCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([s]) => s);

        // Rule insights
        const ruleInsights: RuleInsight[] = this.rules.map(rule => {
            const ruleScores = results.flatMap(r => 
                r.ruleEvaluations.filter(e => e.ruleId === rule.id).map(e => ({
                    studentName: r.studentName,
                    score: e.score
                }))
            );
            
            const avgRuleScore = ruleScores.length > 0 
                ? ruleScores.reduce((sum, r) => sum + r.score, 0) / ruleScores.length 
                : 0;

            const sortedByScore = [...ruleScores].sort((a, b) => a.score - b.score);
            
            return {
                ruleId: rule.id,
                ruleName: rule.nameAr,
                averageScore: Math.round(avgRuleScore),
                hardestFor: sortedByScore.slice(0, 3).map(r => r.studentName),
                easiestFor: sortedByScore.slice(-3).reverse().map(r => r.studentName)
            };
        });

        return {
            averageScore: Math.round(avg),
            medianScore: Math.round(median),
            highestScore: Math.max(...scores),
            lowestScore: Math.min(...scores),
            standardDeviation: Math.round(stdDev * 10) / 10,
            passRate: Math.round((scores.filter(s => s >= 60).length / scores.length) * 100),
            gradeDistribution,
            topPerformers,
            atRiskStudents,
            commonStrengths,
            commonWeaknesses,
            ruleInsights
        };
    }

    private countOccurrences(arr: string[]): Record<string, number> {
        const counts: Record<string, number> = {};
        arr.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
        return counts;
    }
}

/**
 * Build AI system prompt incorporating rules
 */
export function buildAIGradingPrompt(rules: GradingRule[], language: 'ar' | 'en' = 'ar'): string {
    const rulesDescription = rules.map((r, i) => {
        const name = language === 'ar' ? r.nameAr : r.name;
        return `${i + 1}. ${name} (الوزن: ${r.weight}%)`;
    }).join('\n');

    if (language === 'ar') {
        return `أنت خبير تقييم تعليمي ذكي. قم بتحليل إجابة الطالب وفق القواعد التالية:

قواعد التقييم:
${rulesDescription}

يجب أن ترد بصيغة JSON دقيقة تحتوي على:
{
  "grade": رقم من 0 إلى 100,
  "feedback": "تعليق مفصل بالعربية عن الإجابة",
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2"],
  "suggestions": ["اقتراح 1", "اقتراح 2"],
  "ruleScores": {
    ${rules.map(r => `"${r.id}": { "score": رقم, "comment": "شرح" }`).join(',\n    ')}
  },
  "analysis": "تحليل شامل ومفصل للإجابة"
}

ملاحظات مهمة:
- كن دقيقاً وعادلاً في التقييم
- قدم تغذية راجعة بناءة
- حدد نقاط القوة والضعف بوضوح
- اقترح تحسينات عملية
- استخدم اللغة العربية الفصحى`;
    }

    return `You are an expert educational grading AI. Analyze the student's answer according to these rules:

Grading Rules:
${rulesDescription}

Respond in exact JSON format:
{
  "grade": number 0-100,
  "feedback": "detailed feedback",
  "strengths": ["strength 1"],
  "weaknesses": ["weakness 1"],
  "suggestions": ["suggestion 1"],
  "ruleScores": {
    ${rules.map(r => `"${r.id}": { "score": number, "comment": "explanation" }`).join(',\n    ')}
  },
  "analysis": "comprehensive analysis"
}`;
}
