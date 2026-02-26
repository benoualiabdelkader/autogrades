/**
 * Task Workflows - Predefined workflows for the 4 tasks
 */

import { WorkflowEngine } from './WorkflowEngine';

export class TaskWorkflows {
    private static engine = WorkflowEngine.getInstance();

    /**
     * Build all workflows for the 4 tasks
     */
    static async buildAllWorkflows(tasks: any[]): Promise<void> {
        for (const task of tasks) {
            await this.engine.buildWorkflow(task);
        }
    }

    /**
     * Workflow 1: Grade Assignments
     */
    static async executeGradeAssignments(onProgress?: (step: string, progress: number) => void) {
        return await this.engine.executeWorkflow(1, onProgress);
    }

    /**
     * Workflow 2: Generate Rubric
     */
    static async executeGenerateRubric(onProgress?: (step: string, progress: number) => void) {
        return await this.engine.executeWorkflow(2, onProgress);
    }

    /**
     * Workflow 3: Student Analytics
     */
    static async executeStudentAnalytics(onProgress?: (step: string, progress: number) => void) {
        return await this.engine.executeWorkflow(3, onProgress);
    }

    /**
     * Workflow 4: Generate Feedback
     */
    static async executeGenerateFeedback(onProgress?: (step: string, progress: number) => void) {
        return await this.engine.executeWorkflow(4, onProgress);
    }

    /**
     * Execute workflow by task ID
     */
    static async executeWorkflowByTaskId(taskId: number, onProgress?: (step: string, progress: number) => void) {
        switch (taskId) {
            case 1:
                return await this.executeGradeAssignments(onProgress);
            case 2:
                return await this.executeGenerateRubric(onProgress);
            case 3:
                return await this.executeStudentAnalytics(onProgress);
            case 4:
                return await this.executeGenerateFeedback(onProgress);
            default:
                return await this.engine.executeWorkflow(taskId, onProgress);
        }
    }

    /**
     * Get workflow config for a task
     */
    static getWorkflowConfig(taskId: number) {
        return this.engine.loadWorkflow(taskId);
    }

    /**
     * Check if workflow exists for task
     */
    static hasWorkflow(taskId: number): boolean {
        return this.engine.loadWorkflow(taskId) !== null;
    }
}

/**
 * Workflow Definitions - Predefined workflows for the 4 tasks
 */
export const PREDEFINED_WORKFLOWS = {
    1: {
        // Grade Assignments
        name: 'Grade Assignments',
        description: 'Automatically grade student assignments using AI',
        outputFormat: 'csv',
        steps: [
            'Fetch ungraded assignments',
            'Analyze each assignment with AI',
            'Calculate grades and feedback',
            'Export results to CSV'
        ]
    },
    2: {
        // Generate Rubric
        name: 'Generate Rubric',
        description: 'Create comprehensive grading rubrics for assignments and tests',
        outputFormat: 'pdf',
        steps: [
            'Fetch assignment/test information',
            'Analyze requirements and objectives',
            'Generate detailed grading criteria',
            'Export rubric to PDF'
        ]
    },
    3: {
        // Student Analytics
        name: 'Student Analytics',
        description: 'Analyze student performance and identify at-risk students',
        outputFormat: 'pdf',
        steps: [
            'Fetch student and grade data',
            'Analyze patterns and trends',
            'Identify at-risk students',
            'Generate analytical PDF report'
        ]
    },
    4: {
        // Generate Feedback
        name: 'Generate Feedback',
        description: 'Create personalized and detailed feedback for each student',
        outputFormat: 'csv',
        steps: [
            'Fetch student performance data',
            'Analyze strengths and weaknesses',
            'Generate personalized feedback',
            'Export feedback to CSV'
        ]
    }
};
