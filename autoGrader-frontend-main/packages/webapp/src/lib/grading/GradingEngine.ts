/**
 * Lightweight Grading Engine
 * محرك التقييم الخفيف - مستوحى من n8n workflow
 */

export interface Assignment {
    studentId: string;
    assignmentId: string;
    assignmentText: string;
    rubricCriteria: string;
}

export interface GradingResult {
    studentId: string;
    assignmentId: string;
    grade: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    timestamp: string;
    error?: boolean;
}

export interface BatchGradingOptions {
    maxConcurrent?: number;  // عدد الطلبات المتزامنة (افتراضي: 3)
    delayBetweenRequests?: number;  // التأخير بين الطلبات بالثواني (افتراضي: 2)
    maxItems?: number;  // الحد الأقصى للعناصر (افتراضي: 20)
    onProgress?: (current: number, total: number) => void;
}

export class GradingEngine {
    private isProcessing = false;
    private abortController: AbortController | null = null;

    constructor(_apiKey?: string) {}

    /**
     * تهيئة API Key
     */
    async initialize(): Promise<void> {
        // API key stays server-side; initialization is handled by /api/groq-chat.
    }

    /**
     * تقييم واجب واحد
     */
    async gradeAssignment(assignment: Assignment): Promise<GradingResult> {
        try {
            const response = await fetch('/api/groq-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile', // نموذج أفضل من qwen
                    messages: [
                        {
                            role: 'system',
                            content: 'أنت مساعد تقييم خبير عربي. قم بتحليل الواجبات وتقديم ملاحظات منظمة باللغة العربية فقط بتنسيق JSON مع المفاتيح: grade (0-100), feedback (نص مفصل بالعربية), strengths (مصفوفة من النقاط القوية بالعربية), improvements (مصفوفة من التحسينات المقترحة بالعربية). استخدم اللغة العربية الفصحى فقط في جميع الردود.'
                        },
                        {
                            role: 'user',
                            content: `قيّم هذا الواجب بناءً على المعايير التالية: ${assignment.rubricCriteria}\n\nنص الواجب:\n${assignment.assignmentText}`
                        }
                    ],
                    temperature: 0.2,
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

            return this.parseAIResponse(assignment, aiResponse);

        } catch (error: any) {
            if (error.name === 'AbortError') {
                return this.createErrorResult(assignment, 'Request cancelled');
            }
            return this.createErrorResult(assignment, error.message);
        }
    }

    /**
     * تقييم دفعة من الواجبات (خفيف على الحاسوب)
     */
    async gradeBatch(
        assignments: Assignment[],
        options: BatchGradingOptions = {}
    ): Promise<GradingResult[]> {
        const {
            maxConcurrent = 3,  // 3 طلبات متزامنة فقط
            delayBetweenRequests = 2,  // تأخير 2 ثانية
            maxItems = 20,  // حد أقصى 20 عنصر
            onProgress
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
                    batch.map(assignment => this.gradeAssignment(assignment))
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
            const parsed = JSON.parse(aiResponse);

            return {
                studentId: assignment.studentId,
                assignmentId: assignment.assignmentId,
                grade: parsed.grade || 0,
                feedback: parsed.feedback || 'لا توجد ملاحظات',
                strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
                improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            // محاولة استخراج البيانات من النص
            const gradeMatch = aiResponse.match(/grade["\']?\s*:\s*(\d+)/i);
            const feedbackMatch = aiResponse.match(/feedback["\']?\s*:\s*["']([^"']+)/i);

            return {
                studentId: assignment.studentId,
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
    } {
        const successful = results.filter(r => !r.error);
        const failed = results.filter(r => r.error);
        
        const grades = successful.map(r => r.grade);
        const averageGrade = grades.length > 0 
            ? grades.reduce((a, b) => a + b, 0) / grades.length 
            : 0;
        
        return {
            total: results.length,
            successful: successful.length,
            failed: failed.length,
            averageGrade: Math.round(averageGrade),
            highestGrade: grades.length > 0 ? Math.max(...grades) : 0,
            lowestGrade: grades.length > 0 ? Math.min(...grades) : 0
        };
    }
}
