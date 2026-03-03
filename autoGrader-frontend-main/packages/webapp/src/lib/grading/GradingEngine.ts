/**
 * Enhanced Grading Engine with Rules Integration
 * محرك التقييم المحسن مع دعم القواعد والتحليل العميق
 */

import { RulesEngine, type GradingRule as RE_GradingRule, type AnalysisResult } from './RulesEngine';

export interface Assignment {
    studentId: string;
    studentName?: string;
    assignmentId: string;
    assignmentText: string;
    rubricCriteria: string;
    questionText?: string;
}

export interface GradingResult {
    studentId: string;
    studentName?: string;
    assignmentId: string;
    grade: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    timestamp: string;
    error?: boolean;
    ruleEvaluation?: {
        ruleScore: number;
        breakdown: Record<string, number>;
    };
    aiAnalysis?: string;
    blendedScore?: number;
}

export interface BatchGradingOptions {
    maxConcurrent?: number;
    delayBetweenRequests?: number;
    maxItems?: number;
    onProgress?: (current: number, total: number) => void;
    useRules?: boolean;
    rules?: RE_GradingRule[];
    blendMode?: 'ai_only' | 'rules_only' | 'blended';
    blendRatio?: { ai: number; rules: number };
}

export class GradingEngine {
    private isProcessing = false;
    private abortController: AbortController | null = null;
    private rulesEngine: RulesEngine;

    constructor(_apiKey?: string) {
        this.rulesEngine = new RulesEngine();
    }

    /**
     * تهيئة API Key
     */
    async initialize(): Promise<void> {
        // API key stays server-side; initialization is handled by /api/groq-chat.
    }

    /**
     * Get the rules engine instance
     */
    getRulesEngine(): RulesEngine {
        return this.rulesEngine;
    }

    /**
     * تقييم واجب واحد مع دعم القواعد
     */
    async gradeAssignment(assignment: Assignment, options?: { useRules?: boolean; rules?: RE_GradingRule[]; blendMode?: string; blendRatio?: { ai: number; rules: number } }): Promise<GradingResult> {
        try {
            // Step 1: Apply rules locally first (fast)
            let ruleEvaluation: { ruleScore: number; breakdown: Record<string, number> } | undefined;
            
            if (options?.useRules !== false) {
                const rulesResult = this.evaluateWithRules(assignment, options?.rules);
                ruleEvaluation = rulesResult;
            }

            // Step 2: AI evaluation with enhanced prompts
            const systemPrompt = this.buildSmartPrompt(assignment, ruleEvaluation);
            
            const response = await fetch('/api/groq-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: this.buildUserPrompt(assignment)
                        }
                    ],
                    temperature: 0.15,
                    max_tokens: 2000,
                    response_format: { type: 'json_object' }
                }),
                signal: this.abortController?.signal
            });

            if (!response.ok) {
                const failed = await response.json().catch(() => ({}));
                throw new Error(failed?.error || `API request failed: ${response.statusText}`);
            }

            const data = await response.json();
            const aiResponse = data?.content;

            const result = this.parseAIResponse(assignment, aiResponse);
            
            // Step 3: Blend scores
            if (ruleEvaluation) {
                result.ruleEvaluation = ruleEvaluation;
                const ratio = options?.blendRatio || { ai: 0.6, rules: 0.4 };
                const blendMode = options?.blendMode || 'blended';
                
                if (blendMode === 'rules_only') {
                    result.blendedScore = ruleEvaluation.ruleScore;
                } else if (blendMode === 'ai_only') {
                    result.blendedScore = result.grade;
                } else {
                    result.blendedScore = Math.round(
                        result.grade * ratio.ai + ruleEvaluation.ruleScore * ratio.rules
                    );
                }
                result.grade = result.blendedScore;
            }
            
            return result;

        } catch (error: any) {
            if (error.name === 'AbortError') {
                return this.createErrorResult(assignment, 'Request cancelled');
            }
            return this.createErrorResult(assignment, error.message);
        }
    }

    /**
     * Evaluate assignment with rules (local, no AI)
     */
    private evaluateWithRules(assignment: Assignment, customRules?: RE_GradingRule[]): { ruleScore: number; breakdown: Record<string, number> } {
        const text = assignment.assignmentText || '';
        const len = text.trim().length;
        const normalized = text.trim().toLowerCase();
        const sentences = text.split(/[.!?\u060C\u061F\n]+/).filter(s => s.trim().length > 3);
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 5);
        const hasExamples = /مثال|مثلاً|على سبيل|example/i.test(text);
        
        const breakdown: Record<string, number> = {};
        
        // Rule: Content accuracy (keyword-based)
        const accuracyScore = len > 10 ? 55 + Math.min(45, len / 5) : (len > 0 ? 20 : 0);
        breakdown['accuracy'] = Math.round(Math.min(100, accuracyScore));
        
        // Rule: Completeness
        const completenessScore = len >= 200 ? 90 + Math.min(10, sentences.length * 2) :
            len >= 50 ? 50 + ((len - 50) / 150) * 40 :
            len > 0 ? (len / 50) * 50 : 0;
        breakdown['completeness'] = Math.round(Math.min(100, completenessScore));
        
        // Rule: Structure
        const structureScore = 30 + 
            (paragraphs.length >= 2 ? 20 : 0) +
            (sentences.length >= 3 ? 15 : 0) +
            (hasExamples ? 15 : 0) +
            Math.min(20, len / 30);
        breakdown['structure'] = Math.round(Math.min(100, structureScore));
        
        // Rule: Language quality  
        const langScore = len >= 100 ? 70 + Math.min(30, sentences.length * 5) :
            len > 20 ? 40 + ((len - 20) / 80) * 30 :
            len > 0 ? 20 : 0;
        breakdown['language'] = Math.round(Math.min(100, langScore));
        
        // Weighted average (35/25/20/20)
        const ruleScore = Math.round(
            breakdown['accuracy'] * 0.35 +
            breakdown['completeness'] * 0.25 +
            breakdown['structure'] * 0.20 +
            breakdown['language'] * 0.20
        );
        
        return { ruleScore, breakdown };
    }

    /**
     * Build smart system prompt with rules context
     */
    private buildSmartPrompt(assignment: Assignment, ruleEvaluation?: { ruleScore: number; breakdown: Record<string, number> }): string {
        let prompt = `أنت خبير تقييم تعليمي محترف ومتخصص. قم بتحليل إجابة الطالب وتقديم تقييم شامل ودقيق.

معايير التقييم:
1. الدقة العلمية (35%): صحة المعلومات والمفاهيم والحقائق
2. اكتمال الإجابة (25%): شمولية التغطية للنقاط المطلوبة
3. التنظيم والبنية (20%): جودة الترتيب والتسلسل المنطقي
4. جودة اللغة (20%): سلامة التعبير والوضوح`;

        if (ruleEvaluation) {
            prompt += `\n\nنتائج التقييم الأولي بالقواعد:\n- الدرجة الأولية: ${ruleEvaluation.ruleScore}/100\n`;
            for (const [key, value] of Object.entries(ruleEvaluation.breakdown)) {
                prompt += `- ${key}: ${value}/100\n`;
            }
            prompt += `\nاستخدم هذه النتائج كمرجع واضبط التقييم بناءً على تحليلك العميق للمحتوى.`;
        }

        prompt += `\n\nقدم ردك بصيغة JSON بالضبط:
{
  "grade": رقم من 0 إلى 100,
  "feedback": "تعليق شامل بالعربية يوضح سبب الدرجة",
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "improvements": ["اقتراح تحسين 1", "اقتراح تحسين 2"],
  "analysis": "تحليل تفصيلي للإجابة"
}`;

        return prompt;
    }

    /**
     * Build user prompt with assignment details
     */
    private buildUserPrompt(assignment: Assignment): string {
        let prompt = '';
        if (assignment.questionText) {
            prompt += `السؤال: ${assignment.questionText}\n\n`;
        }
        prompt += `معايير التقييم: ${assignment.rubricCriteria}\n\n`;
        prompt += `إجابة الطالب${assignment.studentName ? ` (${assignment.studentName})` : ''}:\n${assignment.assignmentText}`;
        return prompt;
    }

    /**
     * تقييم دفعة من الواجبات (خفيف على الحاسوب)
     */
    async gradeBatch(
        assignments: Assignment[],
        options: BatchGradingOptions = {}
    ): Promise<GradingResult[]> {
        const {
            maxConcurrent = 3,
            delayBetweenRequests = 2,
            maxItems = 20,
            onProgress,
            useRules = true,
            rules,
            blendMode = 'blended',
            blendRatio = { ai: 0.6, rules: 0.4 }
        } = options;

        // تحديد العدد
        const limitedAssignments = assignments.slice(0, maxItems);
        const results: GradingResult[] = [];
        this.isProcessing = true;
        this.abortController = new AbortController();

        try {
            // معالجة على دفعات صغيرة
            for (let i = 0; i < limitedAssignments.length; i += maxConcurrent) {
                if (!this.isProcessing) break;

                const batch = limitedAssignments.slice(i, i + maxConcurrent);
                
                // معالجة الدفعة الحالية
                const batchResults = await Promise.all(
                    batch.map(assignment => this.gradeAssignment(assignment, {
                        useRules,
                        rules,
                        blendMode,
                        blendRatio
                    }))
                );

                results.push(...batchResults);

                // تحديث التقدم
                if (onProgress) {
                    onProgress(results.length, limitedAssignments.length);
                }

                // تأخير بين الدفعات (إلا في الدفعة الأخيرة)
                if (i + maxConcurrent < limitedAssignments.length) {
                    await this.delay(delayBetweenRequests * 1000);
                }
            }

            return results;

        } finally {
            this.isProcessing = false;
            this.abortController = null;
        }
    }

    /**
     * إيقاف المعالجة
     */
    cancel(): void {
        this.isProcessing = false;
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    /**
     * تحليل استجابة AI
     */
    private parseAIResponse(assignment: Assignment, aiResponse: string): GradingResult {
        try {
            // Handle /think tags from some models
            let cleanResponse = aiResponse;
            if (cleanResponse.includes('<think>')) {
                cleanResponse = cleanResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            }
            // Extract JSON from response
            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : cleanResponse;
            const parsed = JSON.parse(jsonStr);

            return {
                studentId: assignment.studentId,
                studentName: assignment.studentName,
                assignmentId: assignment.assignmentId,
                grade: Math.min(100, Math.max(0, parsed.grade || 0)),
                feedback: parsed.feedback || 'لا توجد ملاحظات',
                strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
                improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
                timestamp: new Date().toISOString(),
                aiAnalysis: parsed.analysis || ''
            };

        } catch (error) {
            // محاولة استخراج البيانات من النص
            const gradeMatch = aiResponse.match(/grade["\']?\s*:\s*(\d+)/i);
            const feedbackMatch = aiResponse.match(/feedback["\']?\s*:\s*["']([^"']+)/i);

            return {
                studentId: assignment.studentId,
                studentName: assignment.studentName,
                assignmentId: assignment.assignmentId,
                grade: gradeMatch ? parseInt(gradeMatch[1]) : 0,
                feedback: feedbackMatch ? feedbackMatch[1] : 'فشل تحليل الاستجابة',
                strengths: [],
                improvements: [],
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * إنشاء نتيجة خطأ
     */
    private createErrorResult(assignment: Assignment, errorMessage: string): GradingResult {
        return {
            studentId: assignment.studentId,
            studentName: assignment.studentName,
            assignmentId: assignment.assignmentId,
            grade: 0,
            feedback: `فشل التقييم: ${errorMessage}`,
            strengths: [],
            improvements: [],
            timestamp: new Date().toISOString(),
            error: true
        };
    }

    /**
     * تأخير
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * تحويل بيانات Extension إلى واجبات
     */
    static parseExtensionData(extensionData: any): Assignment[] {
        if (!extensionData) return [];
        
        // Handle different extension data formats
        const students = extensionData.students || extensionData.data || [];
        const questions = extensionData.questions || [];
        const assignments: Assignment[] = [];
        
        if (Array.isArray(students)) {
            for (const student of students) {
                const answers = student.answers || student.responses || [];
                if (Array.isArray(answers)) {
                    answers.forEach((answer: any, qi: number) => {
                        const answerText = typeof answer === 'string' ? answer : (answer?.text || answer?.value || '');
                        const questionText = questions[qi]?.text || questions[qi] || `سؤال ${qi + 1}`;
                        assignments.push({
                            studentId: student.id || student.studentId || `student_${students.indexOf(student) + 1}`,
                            studentName: student.name || student.studentName || '',
                            assignmentId: `q${qi + 1}`,
                            assignmentText: answerText,
                            rubricCriteria: 'الدقة العلمية، اكتمال الإجابة، التنظيم، جودة اللغة',
                            questionText: typeof questionText === 'string' ? questionText : questionText.text || ''
                        });
                    });
                }
            }
        }
        
        return assignments;
    }

    /**
     * تحويل CSV إلى واجبات
     */
    static parseCSV(csvData: any[]): Assignment[] {
        return csvData.map((row, index) => ({
            studentId: row.studentId || row.student_id || `student_${index + 1}`,
            assignmentId: row.assignmentId || row.assignment_id || `assignment_${index + 1}`,
            assignmentText: row.assignmentText || row.assignment_text || row.content || '',
            rubricCriteria: row.rubricCriteria || row.rubric || 'الوضوح، الدقة، الاكتمال'
        }));
    }

    /**
     * تحويل JSON إلى واجبات
     */
    static parseJSON(jsonData: any): Assignment[] {
        const data = Array.isArray(jsonData) ? jsonData : [jsonData];
        return data.map((item, index) => ({
            studentId: item.studentId || item.student_id || `student_${index + 1}`,
            assignmentId: item.assignmentId || item.assignment_id || `assignment_${index + 1}`,
            assignmentText: item.assignmentText || item.assignment_text || item.content || '',
            rubricCriteria: item.rubricCriteria || item.rubric || 'الوضوح، الدقة، الاكتمال'
        }));
    }

    /**
     * تصدير النتائج إلى CSV
     */
    static exportToCSV(results: GradingResult[]): string {
        const headers = ['studentId', 'assignmentId', 'grade', 'feedback', 'strengths', 'improvements', 'timestamp', 'error'];
        
        const rows = results.map(result => [
            result.studentId,
            result.assignmentId,
            result.grade,
            result.feedback,
            result.strengths.join('; '),
            result.improvements.join('; '),
            result.timestamp,
            result.error ? 'true' : 'false'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return csvContent;
    }

    /**
     * تنزيل النتائج كملف CSV
     */
    static downloadCSV(results: GradingResult[], filename?: string): void {
        const csv = this.exportToCSV(results);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename || `grading_results_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * حساب الإحصائيات
     */
    static calculateStats(results: GradingResult[]): {
        total: number;
        successful: number;
        failed: number;
        averageGrade: number;
        highestGrade: number;
        lowestGrade: number;
        gradeDistribution: { excellent: number; good: number; average: number; poor: number; fail: number };
        averageRuleScore?: number;
    } {
        const successful = results.filter(r => !r.error);
        const failed = results.filter(r => r.error);
        
        const grades = successful.map(r => r.grade);
        const averageGrade = grades.length > 0 
            ? grades.reduce((a, b) => a + b, 0) / grades.length 
            : 0;
        
        // Grade distribution
        const gradeDistribution = {
            excellent: grades.filter(g => g >= 90).length,
            good: grades.filter(g => g >= 75 && g < 90).length,
            average: grades.filter(g => g >= 60 && g < 75).length,
            poor: grades.filter(g => g >= 50 && g < 60).length,
            fail: grades.filter(g => g < 50).length
        };
        
        // Average rule score if available
        const ruleScores = successful
            .filter(r => r.ruleEvaluation)
            .map(r => r.ruleEvaluation!.ruleScore);
        const averageRuleScore = ruleScores.length > 0
            ? Math.round(ruleScores.reduce((a, b) => a + b, 0) / ruleScores.length)
            : undefined;

        return {
            total: results.length,
            successful: successful.length,
            failed: failed.length,
            averageGrade: Math.round(averageGrade),
            highestGrade: grades.length > 0 ? Math.max(...grades) : 0,
            lowestGrade: grades.length > 0 ? Math.min(...grades) : 0,
            gradeDistribution,
            averageRuleScore
        };
    }
}
