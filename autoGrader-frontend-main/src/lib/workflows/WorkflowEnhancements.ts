/**
 * WorkflowEnhancements.ts
 * Advanced Workflow System Improvements
 * Features:
 * - Enhanced Error Handling & Recovery
 * - Workflow Monitoring & Performance Metrics
 * - Smart Retry Mechanism with Exponential Backoff
 * - Workflow State Persistence
 * - Advanced Logging & Debugging
 * - Workflow Versioning & Rollback
 */

export enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'transform' | 'validate';
  config: Record<string, any>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  dependencies?: string[];
  errorHandling?: ErrorHandlingConfig;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface ErrorHandlingConfig {
  onError: 'stop' | 'skip' | 'retry' | 'fallback';
  fallbackStep?: string;
  notifyUser: boolean;
  logError: boolean;
}

export interface WorkflowMetrics {
  executionTime: number;
  stepCount: number;
  successfulSteps: number;
  failedSteps: number;
  retryCount: number;
  resourceUsage: {
    memory: number;
    cpu: number;
    apiCalls: number;
  };
  kpis: {
    successRate: number;
    avgExecutionTime: number;
    avgRetryCount: number;
  };
}

export interface WorkflowHistory {
  executionId: string;
  workflowId: string;
  userId: string;
  status: WorkflowStatus;
  startTime: number;
  endTime?: number;
  steps: StepExecution[];
  metrics: WorkflowMetrics;
  errors: WorkflowError[];
  logs: WorkflowLog[];
}

export interface StepExecution {
  stepId: string;
  stepName: string;
  status: WorkflowStatus;
  startTime: number;
  endTime?: number;
  duration: number;
  retries: number;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: WorkflowError;
}

export interface WorkflowError {
  id: string;
  timestamp: number;
  stepId: string;
  severity: ErrorSeverity;
  type: string;
  message: string;
  stack?: string;
  recoveryAttempts: number;
  resolved: boolean;
}

export interface WorkflowLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  stepId: string;
  message: string;
  data?: Record<string, any>;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  createdAt: number;
  createdBy: string;
  changes: string[];
  isActive: boolean;
  testResults?: {
    passed: number;
    failed: number;
    coverage: number;
  };
}

export class WorkflowExecutionEngine {
  private executionHistory: Map<string, WorkflowHistory> = new Map();
  private workflowVersions: Map<string, WorkflowVersion[]> = new Map();
  private metrics: Map<string, WorkflowMetrics> = new Map();

  /**
   * Execute workflow with enhanced error handling and monitoring
   */
  async executeWorkflow(
    workflowId: string,
    userId: string,
    steps: WorkflowStep[],
    config?: {
      enableMonitoring?: boolean;
      enableLogging?: boolean;
      timeout?: number;
    }
  ): Promise<WorkflowHistory> {
    const executionId = this.generateExecutionId();
    const history: WorkflowHistory = {
      executionId,
      workflowId,
      userId,
      status: WorkflowStatus.RUNNING,
      startTime: Date.now(),
      steps: [],
      metrics: {
        executionTime: 0,
        stepCount: steps.length,
        successfulSteps: 0,
        failedSteps: 0,
        retryCount: 0,
        resourceUsage: { memory: 0, cpu: 0, apiCalls: 0 },
        kpis: { successRate: 0, avgExecutionTime: 0, avgRetryCount: 0 },
      },
      errors: [],
      logs: [],
    };

    const enableMonitoring = config?.enableMonitoring ?? true;
    const enableLogging = config?.enableLogging ?? true;

    try {
      for (const step of steps) {
        await this.executeStep(step, history, enableLogging, config?.timeout);
      }

      history.status = WorkflowStatus.COMPLETED;
      history.metrics.successfulSteps = history.steps.filter(
        s => s.status === WorkflowStatus.COMPLETED
      ).length;
    } catch (error) {
      history.status = WorkflowStatus.FAILED;
      history.errors.push(
        this.createWorkflowError(
          'WORKFLOW_EXECUTION_FAILED',
          error as Error,
          'root'
        )
      );
    }

    history.endTime = Date.now();
    history.metrics.executionTime = history.endTime - history.startTime;
    history.metrics.failedSteps = history.steps.filter(
      s => s.status === WorkflowStatus.FAILED
    ).length;

    if (enableMonitoring) {
      this.updateMetrics(workflowId, history.metrics);
    }

    this.executionHistory.set(executionId, history);
    return history;
  }

  /**
   * Execute single step with retry mechanism
   */
  private async executeStep(
    step: WorkflowStep,
    history: WorkflowHistory,
    enableLogging: boolean,
    globalTimeout?: number
  ): Promise<void> {
    const retryPolicy = step.retryPolicy || this.getDefaultRetryPolicy();
    let lastError: Error | null = null;
    let retryCount = 0;

    const stepExecution: StepExecution = {
      stepId: step.id,
      stepName: step.name,
      status: WorkflowStatus.RUNNING,
      startTime: Date.now(),
      duration: 0,
      retries: 0,
      input: {},
    };

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        if (enableLogging) {
          this.addLog(
            history,
            'info',
            step.id,
            `Executing step: ${step.name} (Attempt ${attempt + 1})`
          );
        }

        // Execute the actual step
        const result = await this.executeStepAction(step, globalTimeout);
        
        stepExecution.output = result;
        stepExecution.status = WorkflowStatus.COMPLETED;
        stepExecution.endTime = Date.now();
        stepExecution.duration = stepExecution.endTime - stepExecution.startTime;
        
        if (enableLogging) {
          this.addLog(
            history,
            'info',
            step.id,
            `Step completed successfully: ${step.name}`
          );
        }
        
        history.steps.push(stepExecution);
        return;
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        const shouldRetry =
          attempt < retryPolicy.maxRetries &&
          this.isRetryableError(error as Error, retryPolicy);

        if (shouldRetry) {
          const delay = this.calculateDelay(
            attempt,
            retryPolicy.initialDelay,
            retryPolicy.backoffMultiplier,
            retryPolicy.maxDelay
          );

          if (enableLogging) {
            this.addLog(
              history,
              'warn',
              step.id,
              `Step failed, retrying in ${delay}ms: ${(error as Error).message}`
            );
          }

          await this.sleep(delay);
          stepExecution.status = WorkflowStatus.RETRYING;
        } else {
          stepExecution.status = WorkflowStatus.FAILED;
          stepExecution.error = this.createWorkflowError(
            'STEP_EXECUTION_FAILED',
            error as Error,
            step.id
          );

          if (step.errorHandling?.onError === 'skip') {
            stepExecution.status = WorkflowStatus.COMPLETED;
            history.steps.push(stepExecution);
            if (enableLogging) {
              this.addLog(
                history,
                'info',
                step.id,
                `Step skipped due to error: ${(error as Error).message}`
              );
            }
            return;
          }

          history.steps.push(stepExecution);
          
          if (step.errorHandling?.onError === 'stop') {
            throw error;
          }
        }
      }
    }

    stepExecution.retries = retryCount - 1;
    history.metrics.retryCount += retryCount;
    throw lastError;
  }

  /**
   * Execute step action based on type
   */
  private async executeStepAction(
    step: WorkflowStep,
    timeout?: number
  ): Promise<Record<string, any>> {
    const timeoutMs = timeout || step.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let result: Record<string, any> = {};

      switch (step.type) {
        case 'action':
          result = await this.executeAction(step.config);
          break;
        case 'condition':
          result = await this.evaluateCondition(step.config);
          break;
        case 'transform':
          result = await this.transformData(step.config);
          break;
        case 'validate':
          result = await this.validateData(step.config);
          break;
      }

      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get workflow execution history
   */
  getExecutionHistory(executionId: string): WorkflowHistory | null {
    return this.executionHistory.get(executionId) || null;
  }

  /**
   * Get workflow metrics
   */
  getWorkflowMetrics(workflowId: string): WorkflowMetrics | null {
    return this.metrics.get(workflowId) || null;
  }

  /**
   * Save workflow version for rollback capability
   */
  saveWorkflowVersion(
    workflowId: string,
    steps: WorkflowStep[],
    userId: string,
    changes: string[]
  ): WorkflowVersion {
    const versions = this.workflowVersions.get(workflowId) || [];
    const version: WorkflowVersion = {
      id: this.generateVersionId(),
      workflowId,
      version: versions.length + 1,
      createdAt: Date.now(),
      createdBy: userId,
      changes,
      isActive: true,
    };

    versions.forEach(v => (v.isActive = false));
    versions.push(version);
    this.workflowVersions.set(workflowId, versions);

    return version;
  }

  /**
   * Rollback to previous workflow version
   */
  rollbackWorkflowVersion(
    workflowId: string,
    targetVersion: number
  ): WorkflowVersion | null {
    const versions = this.workflowVersions.get(workflowId);
    if (!versions) return null;

    const targetVersionObj = versions.find(v => v.version === targetVersion);
    if (!targetVersionObj) return null;

    versions.forEach(v => (v.isActive = false));
    targetVersionObj.isActive = true;

    return targetVersionObj;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(
    attempt: number,
    initialDelay: number,
    multiplier: number,
    maxDelay: number
  ): number {
    const delay = initialDelay * Math.pow(multiplier, attempt);
    return Math.min(delay, maxDelay);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, policy: RetryPolicy): boolean {
    return policy.retryableErrors.some(errType =>
      error.message.includes(errType) || error.name === errType
    );
  }

  /**
   * Create workflow error object
   */
  private createWorkflowError(
    type: string,
    error: Error,
    stepId: string
  ): WorkflowError {
    return {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      stepId,
      severity: this.determineSeverity(type),
      type,
      message: error.message,
      stack: error.stack,
      recoveryAttempts: 0,
      resolved: false,
    };
  }

  /**
   * Determine error severity
   */
  private determineSeverity(errorType: string): ErrorSeverity {
    if (errorType.includes('CRITICAL')) return ErrorSeverity.CRITICAL;
    if (errorType.includes('FAILED')) return ErrorSeverity.HIGH;
    if (errorType.includes('WARNING')) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * Add log entry to history
   */
  private addLog(
    history: WorkflowHistory,
    level: 'debug' | 'info' | 'warn' | 'error',
    stepId: string,
    message: string
  ): void {
    history.logs.push({
      timestamp: Date.now(),
      level,
      stepId,
      message,
    });
  }

  /**
   * Update workflow metrics
   */
  private updateMetrics(workflowId: string, metrics: WorkflowMetrics): void {
    this.metrics.set(workflowId, metrics);
  }

  /**
   * Get default retry policy
   */
  private getDefaultRetryPolicy(): RetryPolicy {
    return {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE'],
    };
  }

  /**
   * Placeholder methods for step actions
   */
  private async executeAction(config: Record<string, any>): Promise<Record<string, any>> {
    // Implementation for action execution
    return {};
  }

  private async evaluateCondition(config: Record<string, any>): Promise<Record<string, any>> {
    // Implementation for condition evaluation
    return { result: true };
  }

  private async transformData(config: Record<string, any>): Promise<Record<string, any>> {
    // Implementation for data transformation
    return {};
  }

  private async validateData(config: Record<string, any>): Promise<Record<string, any>> {
    // Implementation for data validation
    return { valid: true };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVersionId(): string {
    return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const workflowExecutionEngine = new WorkflowExecutionEngine();
