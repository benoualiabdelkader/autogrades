/**
 * Workflow Engine - محرك بناء وتنفيذ Workflows تلقائياً
 * يقوم ببناء workflow لكل task بناءً على الوصف والـ prompt
 */

export interface GradingRule {
    id: string;
    name: string;
    nameAr: string;
    weight: number;
    type: 'keyword' | 'length' | 'completeness' | 'accuracy' | 'structure' | 'custom';
    config: any;
}

export interface WorkflowConfig {
    id: string;
    taskId: number;
    taskTitle: string;
    description: string;
    systemPrompt: string;
    dataSource: {
        type: 'moodle' | 'local' | 'csv' | 'extension';
        config: {
            host: string;
            port: number;
            database: string;
            user: string;
            password: string;
            prefix: string;
        };
    };
    aiProvider: {
        type: 'groq';
        model: string;
        apiKey?: string;
    };
    outputFormat: 'csv' | 'pdf' | 'json' | 'html';
    processing: {
        maxConcurrent: number;
        delayBetweenRequests: number;
        maxItems: number;
    };
    gradingRules?: GradingRule[];
    steps: WorkflowStep[];
}

export interface WorkflowStep {
    id: string;
    type: 'fetch_data' | 'fetch_extension' | 'apply_rules' | 'process_ai' | 'transform' | 'export';
    name: string;
    config: any;
}

export interface WorkflowResult {
    success: boolean;
    data: any;
    stats: {
        totalProcessed: number;
        successful: number;
        failed: number;
        duration: number;
    };
    output?: string; // URL للملف المُصدّر
}

export class WorkflowEngine {
    private static instance: WorkflowEngine;
    private workflows: Map<number, WorkflowConfig> = new Map();

    private constructor() {}

    static getInstance(): WorkflowEngine {
        if (!WorkflowEngine.instance) {
            WorkflowEngine.instance = new WorkflowEngine();
        }
        return WorkflowEngine.instance;
    }

    /**
     * Build workflow automatically from task
     */
    async buildWorkflow(task: {
        id: number;
        title: string;
        description: string;
        prompt: string;
        icon: string;
    }, options?: {
        dataSourceType?: 'moodle' | 'extension';
        gradingRules?: GradingRule[];
    }): Promise<WorkflowConfig> {
        // Analyze task type and build appropriate workflow
        const workflowType = this.detectWorkflowType(task);
        const useExtension = options?.dataSourceType === 'extension' || this.shouldUseExtension(task);
        
        const workflow: WorkflowConfig = {
            id: `workflow_${task.id}_${Date.now()}`,
            taskId: task.id,
            taskTitle: task.title,
            description: task.description,
            systemPrompt: task.prompt,
            dataSource: {
                type: useExtension ? 'extension' : 'moodle',
                config: {
                    host: '127.0.0.1',
                    port: 3307,
                    database: 'moodle',
                    user: 'root',
                    password: '',
                    prefix: 'mdl_'
                }
            },
            aiProvider: {
                type: 'groq',
                model: 'llama-3.3-70b-versatile'
            },
            outputFormat: this.determineOutputFormat(workflowType),
            processing: {
                maxConcurrent: 3,
                delayBetweenRequests: 2,
                maxItems: 20
            },
            gradingRules: options?.gradingRules || this.getDefaultRules(workflowType),
            steps: this.buildSteps(workflowType, task, useExtension)
        };

        // Save workflow
        this.workflows.set(task.id, workflow);
        
        // Save to localStorage
        this.saveWorkflow(workflow);

        return workflow;
    }

    /**
     * Detect workflow type from description
     */
    private detectWorkflowType(task: any): string {
        const title = task.title.toLowerCase();
        const description = task.description.toLowerCase();
        const prompt = task.prompt.toLowerCase();
        
        const text = `${title} ${description} ${prompt}`;

        if (text.includes('grade') || text.includes('grading') || text.includes('correction') || text.includes('تقييم') || text.includes('تصحيح')) {
            return 'grading';
        } else if (text.includes('rubric') || text.includes('criteria') || text.includes('معايير')) {
            return 'rubric_generation';
        } else if (text.includes('analytic') || text.includes('analysis') || text.includes('at-risk') || text.includes('تحليل')) {
            return 'analytics';
        } else if (text.includes('feedback') || text.includes('comment') || text.includes('ملاحظات')) {
            return 'feedback_generation';
        } else if (text.includes('extension') || text.includes('إضافة') || text.includes('scraper')) {
            return 'extension_analysis';
        } else {
            return 'general';
        }
    }

    /**
     * Detect if extension data should be used
     */
    private shouldUseExtension(task: any): boolean {
        const text = `${task.title} ${task.description} ${task.prompt}`.toLowerCase();
        return text.includes('extension') || text.includes('إضافة') || text.includes('scraper') || text.includes('استخراج');
    }

    /**
     * Get default grading rules based on workflow type
     */
    private getDefaultRules(workflowType: string): GradingRule[] {
        switch (workflowType) {
            case 'grading':
            case 'extension_analysis':
                return [
                    { id: 'accuracy', name: 'Scientific Accuracy', nameAr: 'الدقة العلمية', weight: 35, type: 'keyword', config: {} },
                    { id: 'completeness', name: 'Completeness', nameAr: 'اكتمال الإجابة', weight: 25, type: 'completeness', config: { minLength: 20, idealLength: 150 } },
                    { id: 'structure', name: 'Structure', nameAr: 'التنظيم والبنية', weight: 20, type: 'structure', config: { requireExamples: true } },
                    { id: 'language', name: 'Language Quality', nameAr: 'جودة اللغة', weight: 20, type: 'length', config: { minLength: 10, idealLength: 200 } }
                ];
            case 'analytics':
                return [
                    { id: 'performance', name: 'Performance', nameAr: 'الأداء', weight: 50, type: 'accuracy', config: {} },
                    { id: 'engagement', name: 'Engagement', nameAr: 'المشاركة', weight: 30, type: 'completeness', config: {} },
                    { id: 'progress', name: 'Progress', nameAr: 'التقدم', weight: 20, type: 'length', config: {} }
                ];
            default:
                return [
                    { id: 'content', name: 'Content', nameAr: 'المحتوى', weight: 40, type: 'keyword', config: {} },
                    { id: 'depth', name: 'Depth', nameAr: 'العمق', weight: 30, type: 'completeness', config: { minLength: 15, idealLength: 200 } },
                    { id: 'presentation', name: 'Presentation', nameAr: 'العرض', weight: 30, type: 'length', config: { minLength: 5, idealLength: 150 } }
                ];
        }
    }

    /**
     * Determine output format
     */
    private determineOutputFormat(workflowType: string): 'csv' | 'pdf' | 'json' | 'html' {
        switch (workflowType) {
            case 'grading':
                return 'csv';
            case 'rubric_generation':
                return 'pdf';
            case 'analytics':
                return 'pdf';
            case 'feedback_generation':
                return 'csv';
            default:
                return 'json';
        }
    }

    /**
     * Build workflow steps
     */
    private buildSteps(workflowType: string, task: any, useExtension: boolean = false): WorkflowStep[] {
        const steps: WorkflowStep[] = [];

        // Step 1: Data fetching (extension or database)
        if (useExtension) {
            steps.push({
                id: 'step_1_fetch_extension',
                type: 'fetch_extension',
                name: 'جلب البيانات من Extension',
                config: {
                    transformationType: workflowType === 'grading' ? 'assignments' : 'students'
                }
            });
        } else {
            steps.push({
                id: 'step_1_fetch',
                type: 'fetch_data',
                name: 'Fetching data from database',
                config: {
                    query: this.buildQuery(workflowType)
                }
            });
        }

        // Step 2: Apply rules-based evaluation
        steps.push({
            id: 'step_2_rules',
            type: 'apply_rules',
            name: 'تطبيق قواعد التقييم',
            config: {
                workflowType
            }
        });

        // Step 3: AI Enhancement
        steps.push({
            id: 'step_3_ai',
            type: 'process_ai',
            name: 'تحليل بالذكاء الاصطناعي',
            config: {
                systemPrompt: this.buildEnhancedPrompt(task.prompt, workflowType),
                batchSize: 3,
                delay: 2
            }
        });

        // Step 4: Transform
        steps.push({
            id: 'step_4_transform',
            type: 'transform',
            name: 'Transforming results',
            config: {
                format: this.determineOutputFormat(workflowType)
            }
        });

        // Step 5: Export
        steps.push({
            id: 'step_5_export',
            type: 'export',
            name: 'Exporting results',
            config: {
                format: this.determineOutputFormat(workflowType),
                filename: `${task.title.replace(/\s+/g, '_')}_${Date.now()}`
            }
        });

        return steps;
    }

    /**
     * Build enhanced AI prompt incorporating rules
     */
    private buildEnhancedPrompt(basePrompt: string, workflowType: string): string {
        const rulesPrompt = `
أنت خبير تقييم تعليمي محترف. حلل بيانات الطلاب وفق القواعد التالية:

1. الدقة العلمية (35%): تحقق من صحة المعلومات والمفاهيم
2. اكتمال الإجابة (25%): تقييم شمولية الإجابة وتغطيتها للنقاط المطلوبة
3. التنظيم والبنية (20%): جودة التنظيم والتسلسل المنطقي
4. جودة اللغة (20%): سلامة اللغة والتعبير

قدم تحليلاً شاملاً يتضمن:
- الدرجة الإجمالية (0-100)
- نقاط القوة والضعف
- اقتراحات التحسين
- تقييم كل معيار على حدة

رد بصيغة JSON:
{
  "grade": رقم,
  "feedback": "تعليق بالعربية",
  "strengths": [],
  "weaknesses": [],
  "suggestions": [],
  "ruleScores": {},
  "analysis": "تحليل شامل"
}`;

        return basePrompt ? `${basePrompt}\n\n${rulesPrompt}` : rulesPrompt;
    }

    /**
     * Build SQL query based on workflow type
     */
    private buildQuery(workflowType: string): string {
        switch (workflowType) {
            case 'grading':
                return `
                    SELECT 
                        u.id as student_id,
                        CONCAT(u.firstname, ' ', u.lastname) as student_name,
                        a.name as assignment_name,
                        s.id as submission_id,
                        FROM_UNIXTIME(s.timemodified) as submitted_at,
                        s.status
                    FROM mdl_user u
                    JOIN mdl_assign_submission s ON u.id = s.userid
                    JOIN mdl_assign a ON s.assignment = a.id
                    ORDER BY s.timemodified DESC
                    LIMIT 20
                `;
            
            case 'analytics':
                return `
                    SELECT 
                        u.id as student_id,
                        CONCAT(u.firstname, ' ', u.lastname) as student_name,
                        c.fullname as course_name,
                        COUNT(DISTINCT l.id) as total_activities,
                        AVG(g.finalgrade) as average_grade,
                        MAX(l.timecreated) as last_activity
                    FROM mdl_user u
                    JOIN mdl_user_enrolments ue ON u.id = ue.userid
                    JOIN mdl_enrol e ON ue.enrolid = e.id
                    JOIN mdl_course c ON e.courseid = c.id
                    LEFT JOIN mdl_logstore_standard_log l ON u.id = l.userid
                    LEFT JOIN mdl_grade_grades g ON u.id = g.userid
                    GROUP BY u.id, c.id
                    LIMIT 20
                `;
            
            case 'rubric_generation':
                return `
                    SELECT 
                        a.id as assignment_id,
                        a.name as assignment_name,
                        a.intro as assignment_description,
                        c.fullname as course_name
                    FROM mdl_assign a
                    JOIN mdl_course c ON a.course = c.id
                    WHERE a.grade > 0
                    LIMIT 10
                `;
            
            case 'feedback_generation':
                return `
                    SELECT 
                        u.id as student_id,
                        CONCAT(u.firstname, ' ', u.lastname) as student_name,
                        g.finalgrade as grade,
                        gi.itemname as item_name,
                        c.fullname as course_name
                    FROM mdl_user u
                    JOIN mdl_grade_grades g ON u.id = g.userid
                    JOIN mdl_grade_items gi ON g.itemid = gi.id
                    JOIN mdl_course c ON gi.courseid = c.id
                    WHERE g.finalgrade IS NOT NULL
                    LIMIT 20
                `;
            
            default:
                return `SELECT * FROM mdl_user LIMIT 10`;
        }
    }

    /**
     * Execute workflow
     */
    async executeWorkflow(taskId: number, onProgress?: (step: string, progress: number) => void): Promise<WorkflowResult> {
        const workflow = this.workflows.get(taskId);
        if (!workflow) {
            throw new Error(`Workflow not found for task ${taskId}`);
        }

        const startTime = Date.now();
        let data: any = null;
        let stats = {
            totalProcessed: 0,
            successful: 0,
            failed: 0,
            duration: 0
        };

        try {
            // Execute each step
            for (let i = 0; i < workflow.steps.length; i++) {
                const step = workflow.steps[i];
                const progress = ((i + 1) / workflow.steps.length) * 100;
                
                if (onProgress) {
                    onProgress(step.name, progress);
                }

                data = await this.executeStep(step, data, workflow);
                
                // Small delay between steps
                if (i < workflow.steps.length - 1) {
                    await this.delay(500);
                }
            }

            stats.duration = Date.now() - startTime;
            stats.totalProcessed = Array.isArray(data) ? data.length : 1;
            stats.successful = stats.totalProcessed;

            return {
                success: true,
                data,
                stats,
                output: data.downloadUrl
            };

        } catch (error: any) {
            stats.duration = Date.now() - startTime;
            stats.failed = stats.totalProcessed;

            return {
                success: false,
                data: null,
                stats
            };
        }
    }

    /**
     * Execute single step
     */
    private async executeStep(step: WorkflowStep, inputData: any, workflow: WorkflowConfig): Promise<any> {
        switch (step.type) {
            case 'fetch_data':
                return await this.fetchData(step.config, workflow.dataSource);
            
            case 'fetch_extension':
                return await this.fetchExtensionData(step.config);
            
            case 'apply_rules':
                return await this.applyRules(inputData, workflow.gradingRules || []);
            
            case 'process_ai':
                return await this.processWithAI(inputData, step.config, workflow);
            
            case 'transform':
                return await this.transformData(inputData, step.config);
            
            case 'export':
                return await this.exportData(inputData, step.config);
            
            default:
                return inputData;
        }
    }

    /**
     * Fetch data from Extension
     */
    private async fetchExtensionData(config: any): Promise<any[]> {
        try {
            const response = await fetch('/api/extension/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transformationType: config.transformationType || 'assignments'
                })
            });

            const result = await response.json();
            if (result.success && result.data) {
                console.log(`✅ Fetched ${result.data.length} items from Extension`);
                return result.data;
            }
            return [];
        } catch (error) {
            console.error('Error fetching extension data:', error);
            return [];
        }
    }

    /**
     * Apply grading rules locally before AI processing
     */
    private async applyRules(data: any[], rules: GradingRule[]): Promise<any[]> {
        if (!Array.isArray(data) || data.length === 0 || !rules || rules.length === 0) {
            return data;
        }

        return data.map(item => {
            const text = item.assignment_text || item.answer || item.value || '';
            const ruleScores: Record<string, { score: number; comment: string }> = {};
            let totalWeighted = 0;
            let totalWeight = 0;

            for (const rule of rules) {
                const score = this.evaluateRule(rule, text);
                ruleScores[rule.id] = {
                    score,
                    comment: `${rule.nameAr}: ${score}/100`
                };
                totalWeighted += (score * rule.weight) / 100;
                totalWeight += rule.weight;
            }

            const ruleScore = totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 100) : 0;

            return {
                ...item,
                rule_evaluation: {
                    ruleScore,
                    ruleScores,
                    rulesApplied: rules.length
                }
            };
        });
    }

    /**
     * Evaluate a single rule against text
     */
    private evaluateRule(rule: GradingRule, text: string): number {
        const len = (text || '').trim().length;
        const normalized = (text || '').trim().toLowerCase();

        switch (rule.type) {
            case 'keyword': {
                if (rule.config?.requiredKeywords?.length) {
                    const found = rule.config.requiredKeywords.filter((kw: string) => normalized.includes(kw.toLowerCase()));
                    return Math.round((found.length / rule.config.requiredKeywords.length) * 100);
                }
                return Math.min(100, len > 10 ? 55 + Math.min(45, len / 4) : (len > 0 ? 20 : 0));
            }
            case 'length': {
                const min = rule.config?.minLength || 10;
                const ideal = rule.config?.idealLength || 200;
                if (len === 0) return 0;
                if (len < min) return Math.round((len / min) * 40);
                return Math.round(Math.max(60, 100 - Math.abs(len - ideal) / ideal * 40));
            }
            case 'completeness': {
                const min = rule.config?.minLength || 15;
                const ideal = rule.config?.idealLength || 200;
                const sentences = text.split(/[.!?،؟\n]+/).filter(s => s.trim().length > 3);
                if (len >= ideal) return Math.min(100, 85 + sentences.length * 3);
                if (len >= min) return 40 + Math.round(((len - min) / (ideal - min)) * 50);
                return len > 0 ? Math.round((len / min) * 40) : 0;
            }
            case 'structure': {
                const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 5);
                const sentences = text.split(/[.!?،؟\n]+/).filter(s => s.trim().length > 3);
                const hasExamples = /مثال|مثلاً|على سبيل|example/i.test(text);
                return Math.min(100, Math.round(40 + (paragraphs.length >= 2 ? 20 : 0) + (sentences.length >= 3 ? 15 : 0) + (hasExamples ? 15 : 0) + Math.min(10, len / 50)));
            }
            case 'accuracy':
                return len > 10 ? 60 + Math.min(30, len / 10) : (len > 0 ? 25 : 0);
            default:
                return 50;
        }
    }

    /**
     * Fetch data from database
     */
    private async fetchData(config: any, dataSource: any): Promise<any[]> {
        try {
            const response = await fetch('/api/moodle/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...dataSource.config,
                    query: config.query
                })
            });

            const result = await response.json();
            return result.data || [];
        } catch (error) {
            console.error('Error fetching data:', error);
            return [];
        }
    }

    /**
     * Process with AI
     */
    private async processWithAI(data: any[], config: any, workflow: WorkflowConfig): Promise<any[]> {
        if (!Array.isArray(data) || data.length === 0) {
            return [];
        }

        const results: any[] = [];
        const batchSize = config.batchSize || 3;
        const delay = config.delay || 2;

        // Process in batches
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            const batchResults = await Promise.all(
                batch.map(item => this.processItemWithAI(item, config.systemPrompt, workflow))
            );

            results.push(...batchResults);

            // Delay between batches
            if (i + batchSize < data.length) {
                await this.delay(delay * 1000);
            }
        }

        return results;
    }

    /**
     * Process single item with AI (enhanced with rules context)
     */
    private async processItemWithAI(item: any, systemPrompt: string, workflow: WorkflowConfig): Promise<any> {
        try {
            // Build enhanced user message with rules context
            let userContent = '';
            const ruleEval = item.rule_evaluation;
            
            if (ruleEval) {
                userContent += `تقييم أولي بالقواعد: ${ruleEval.ruleScore}/100\n`;
                if (ruleEval.ruleScores) {
                    for (const [key, val] of Object.entries(ruleEval.ruleScores) as [string, any][]) {
                        userContent += `- ${val.comment}\n`;
                    }
                }
                userContent += '\n';
            }
            
            // Build item description  
            const itemText = item.assignment_text || item.answer || item.value || '';
            const studentName = item.student_name || item.studentName || '';
            const questionText = item.question || item.questionText || '';
            
            if (studentName) userContent += `الطالب: ${studentName}\n`;
            if (questionText) userContent += `السؤال: ${questionText}\n`;
            userContent += `الإجابة:\n${itemText}\n`;
            
            // If empty text, add note
            if (!itemText.trim()) {
                userContent += '\n(لم يقدم الطالب إجابة)\n';
            }

            const response = await fetch('/api/groq-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: workflow.aiProvider.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ],
                    temperature: 0.15,
                    max_tokens: 2000,
                    response_format: { type: 'json_object' }
                })
            });

            const result = await response.json();
            if (!response.ok || !result?.success) {
                throw new Error(result?.error || 'AI processing failed');
            }
            
            // Parse response, handling potential /think tags
            let contentStr = result.content || '{}';
            if (contentStr.includes('<think>')) {
                contentStr = contentStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            }
            const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
            const aiResponse = JSON.parse(jsonMatch ? jsonMatch[0] : contentStr);

            // Blend AI score with rule score if available
            const blendedResult: any = {
                ...item,
                ai_result: aiResponse,
            };
            
            if (ruleEval && aiResponse.grade) {
                blendedResult.blended_score = Math.round(
                    aiResponse.grade * 0.6 + ruleEval.ruleScore * 0.4
                );
            }

            return blendedResult;

        } catch (error) {
            return {
                ...item,
                ai_result: { error: 'Processing failed', grade: item.rule_evaluation?.ruleScore || 0 }
            };
        }
    }

    /**
     * Transform data
     */
    private async transformData(data: any[], config: any): Promise<any> {
        // Transform based on required format
        return data;
    }

    /**
     * Export data
     */
    private async exportData(data: any[], config: any): Promise<any> {
        const format = config.format;
        const filename = config.filename;

        switch (format) {
            case 'csv':
                return this.exportToCSV(data, filename);
            case 'pdf':
                return this.exportToPDF(data, filename);
            case 'json':
                return this.exportToJSON(data, filename);
            default:
                return data;
        }
    }

    /**
     * Export to CSV
     */
    private exportToCSV(data: any[], filename: string): any {
        if (!data || data.length === 0) return { downloadUrl: null };

        const headers = Object.keys(data[0]);
        const rows = data.map(item => 
            headers.map(header => `"${item[header] || ''}"`).join(',')
        );

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        // Auto download
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        link.click();

        return { downloadUrl: url, data };
    }

    /**
     * Export to PDF
     */
    private exportToPDF(data: any[], filename: string): any {
        // Will be implemented later with PDF library
        console.log('PDF export not implemented yet');
        return { downloadUrl: null, data };
    }

    /**
     * Export to JSON
     */
    private exportToJSON(data: any[], filename: string): any {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.json`;
        link.click();

        return { downloadUrl: url, data };
    }

    /**
     * Initialize API Key
     */
    private async initializeApiKey(): Promise<void> {
        // Kept for backwards compatibility with previous API.
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Save workflow to localStorage
     */
    private saveWorkflow(workflow: WorkflowConfig): void {
        const saved = localStorage.getItem('workflows') || '{}';
        const workflows = JSON.parse(saved);
        workflows[workflow.taskId] = workflow;
        localStorage.setItem('workflows', JSON.stringify(workflows));
    }

    /**
     * Load workflow from localStorage
     */
    loadWorkflow(taskId: number): WorkflowConfig | null {
        const saved = localStorage.getItem('workflows');
        if (!saved) return null;
        
        const workflows = JSON.parse(saved);
        return workflows[taskId] || null;
    }

    /**
     * Get all workflows
     */
    getAllWorkflows(): WorkflowConfig[] {
        const saved = localStorage.getItem('workflows');
        if (!saved) return [];
        
        const workflows = JSON.parse(saved);
        return Object.values(workflows);
    }
}
