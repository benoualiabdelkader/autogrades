/**
 * Workflow Engine - محرك بناء وتنفيذ Workflows تلقائياً
 * يقوم ببناء workflow لكل task بناءً على الوصف والـ prompt
 */

export interface WorkflowConfig {
    id: string;
    taskId: number;
    taskTitle: string;
    description: string;
    systemPrompt: string;
    dataSource: {
        type: 'moodle' | 'local' | 'csv';
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
    steps: WorkflowStep[];
}

export interface WorkflowStep {
    id: string;
    type: 'fetch_data' | 'process_ai' | 'transform' | 'export';
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
    }): Promise<WorkflowConfig> {
        // Analyze task type and build appropriate workflow
        const workflowType = this.detectWorkflowType(task);
        
        const workflow: WorkflowConfig = {
            id: `workflow_${task.id}_${Date.now()}`,
            taskId: task.id,
            taskTitle: task.title,
            description: task.description,
            systemPrompt: task.prompt,
            dataSource: {
                type: 'moodle',
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
            steps: this.buildSteps(workflowType, task)
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

        if (text.includes('grade') || text.includes('grading') || text.includes('correction')) {
            return 'grading';
        } else if (text.includes('rubric') || text.includes('criteria')) {
            return 'rubric_generation';
        } else if (text.includes('analytic') || text.includes('analysis') || text.includes('at-risk')) {
            return 'analytics';
        } else if (text.includes('feedback') || text.includes('comment')) {
            return 'feedback_generation';
        } else {
            return 'general';
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
    private buildSteps(workflowType: string, task: any): WorkflowStep[] {
        const baseSteps: WorkflowStep[] = [
            {
                id: 'step_1_fetch',
                type: 'fetch_data',
                name: 'Fetching data from database',
                config: {
                    query: this.buildQuery(workflowType)
                }
            },
            {
                id: 'step_2_process',
                type: 'process_ai',
                name: 'Processing with AI',
                config: {
                    systemPrompt: task.prompt,
                    batchSize: 3,
                    delay: 2
                }
            },
            {
                id: 'step_3_transform',
                type: 'transform',
                name: 'Transforming results',
                config: {
                    format: this.determineOutputFormat(workflowType)
                }
            },
            {
                id: 'step_4_export',
                type: 'export',
                name: 'Exporting results',
                config: {
                    format: this.determineOutputFormat(workflowType),
                    filename: `${task.title.replace(/\s+/g, '_')}_${Date.now()}`
                }
            }
        ];

        return baseSteps;
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
     * Process single item with AI
     */
    private async processItemWithAI(item: any, systemPrompt: string, workflow: WorkflowConfig): Promise<any> {
        try {
            const response = await fetch('/api/groq-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: workflow.aiProvider.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: JSON.stringify(item) }
                    ],
                    temperature: 0.2,
                    response_format: { type: 'json_object' }
                })
            });

            const result = await response.json();
            if (!response.ok || !result?.success) {
                throw new Error(result?.error || 'AI processing failed');
            }
            const aiResponse = JSON.parse(result.content || '{}');

            return {
                ...item,
                ai_result: aiResponse
            };

        } catch (error) {
            return {
                ...item,
                ai_result: { error: 'Processing failed' }
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
