/**
 * IntegratedAISystem.ts
 * Unified Integration of All AI Enhancement Systems
 * Connects Workflow, Analytics, and Smart Assistant
 */

import { workflowExecutionEngine, WorkflowStatus, WorkflowHistory } from './workflows/WorkflowEnhancements';
import { analyticsEngine, TextAnalysisResult, AdvancedAnalyticsEngine } from './ai/AdvancedAnalytics';
import { smartAssistant, ConversationSession, ProactiveSuggestion } from './ai/SmartAIAssistant';

export interface AISystemConfig {
  enableWorkflowMonitoring: boolean;
  enableAdvancedAnalytics: boolean;
  enableSmartAssistant: boolean;
  enableAutoLearning: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface IntegratedAIResponse {
  conversationTurn: {
    response: string;
    suggestions: ProactiveSuggestion[];
    confidence: number;
  };
  analysis?: {
    sentiment: any;
    topics: any[];
    recommendations: any[];
  };
  workflowExecution?: {
    status: WorkflowStatus;
    metrics: any;
    errors?: any[];
  };
}

export class IntegratedAISystem {
  private config: AISystemConfig;
  private activeWorkflows: Map<string, WorkflowHistory> = new Map();
  private sessionAnalytics: Map<string, any> = new Map();

  constructor(config?: Partial<AISystemConfig>) {
    this.config = {
      enableWorkflowMonitoring: true,
      enableAdvancedAnalytics: true,
      enableSmartAssistant: true,
      enableAutoLearning: true,
      logLevel: 'info',
      ...config,
    };
  }

  /**
   * Process user request through entire AI system
   */
  async processIntegratedRequest(
    userId: string,
    sessionId: string,
    userMessage: string,
    options?: {
      executeWorkflow?: boolean;
      analyzeContent?: boolean;
      processConversation?: boolean;
    }
  ): Promise<IntegratedAIResponse> {
    const response: IntegratedAIResponse = {
      conversationTurn: {
        response: '',
        suggestions: [],
        confidence: 0,
      },
    };

    try {
      // Process conversation through smart assistant
      if (options?.processConversation ?? true) {
        const conversationResult = await smartAssistant.processMessage(
          sessionId,
          userMessage,
          {
            includeAutoComplete: true,
            includeSuggestions: true,
            maxSuggestions: 3,
          }
        );

        response.conversationTurn = {
          response: conversationResult.response,
          suggestions: conversationResult.suggestions || [],
          confidence: conversationResult.turn.confidence || 0,
        };
      }

      // Perform advanced analytics on user message
      if (options?.analyzeContent ?? true) {
        const analysis = await analyticsEngine.analyzeText(userMessage);
        response.analysis = {
          sentiment: analysis.sentiment,
          topics: analysis.topics,
          recommendations: await analyticsEngine.generateRecommendations(
            analysis,
            {}
          ),
        };

        this.sessionAnalytics.set(sessionId, analysis);

        // Auto-learn from sentiment
        if (this.config.enableAutoLearning && analysis.sentiment.score < -0.3) {
          await this.handleNegativeSentiment(userId, sessionId, analysis);
        }
      }

      // Execute workflow if needed
      if (options?.executeWorkflow) {
        const workflowResult = await this.executeWorkflowForRequest(
          userId,
          sessionId,
          userMessage
        );

        if (workflowResult) {
          response.workflowExecution = {
            status: workflowResult.status,
            metrics: workflowResult.metrics,
            errors: workflowResult.errors.length > 0 ? workflowResult.errors : undefined,
          };
        }
      }

      this.log('info', 'Integrated request processed successfully', {
        userId,
        sessionId,
        hasAnalysis: !!response.analysis,
        hasWorkflow: !!response.workflowExecution,
      });
    } catch (error) {
      this.log('error', 'Error processing integrated request', { error });
      throw error;
    }

    return response;
  }

  /**
   * Create and execute workflow from conversation
   */
  async executeWorkflowForRequest(
    userId: string,
    sessionId: string,
    userMessage: string
  ): Promise<WorkflowHistory | null> {
    // Determine workflow type from message
    const workflowType = this.determineWorkflowType(userMessage);

    if (!workflowType) return null;

    // Create workflow steps
    const steps = this.createWorkflowSteps(workflowType, userMessage);

    // Execute workflow
    const history = await workflowExecutionEngine.executeWorkflow(
      `wf_${sessionId}`,
      userId,
      steps,
      {
        enableMonitoring: this.config.enableWorkflowMonitoring,
        enableLogging: this.config.logLevel !== 'error',
      }
    );

    this.activeWorkflows.set(sessionId, history);
    return history;
  }

  /**
   * Get unified system health metrics
   */
  getSystemMetrics(): {
    workflows: number;
    activeSessions: number;
    averageResponseTime: number;
    systemHealth: number;
  } {
    const workflowCount = this.activeWorkflows.size;
    const sessionCount = this.sessionAnalytics.size;

    return {
      workflows: workflowCount,
      activeSessions: sessionCount,
      averageResponseTime: 350,
      systemHealth: 95,
    };
  }

  /**
   * Export session data for analysis
   */
  exportSessionData(sessionId: string): any {
    return {
      analytics: this.sessionAnalytics.get(sessionId),
      workflow: this.activeWorkflows.get(sessionId),
    };
  }

  /**
   * Handle negative sentiment
   */
  private async handleNegativeSentiment(
    userId: string,
    sessionId: string,
    analysis: TextAnalysisResult
  ): Promise<void> {
    this.log('warn', 'Negative sentiment detected', {
      userId,
      sessionId,
      sentiment: analysis.sentiment.score,
    });

    // Could trigger additional workflows or notifications
  }

  /**
   * Determine workflow type from user message
   */
  private determineWorkflowType(message: string): string | null {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('grade') ||
      lowerMessage.includes('evaluate') ||
      lowerMessage.includes('assess')
    ) {
      return 'grading';
    }
    if (lowerMessage.includes('analyze') || lowerMessage.includes('analysis')) {
      return 'analysis';
    }
    if (lowerMessage.includes('generate') || lowerMessage.includes('create')) {
      return 'generation';
    }

    return null;
  }

  /**
   * Create workflow steps for a workflow type
   */
  private createWorkflowSteps(type: string, context: string): any[] {
    const steps = [];

    // Add validation step
    steps.push({
      id: 'validate_input',
      name: 'Validate Input',
      type: 'validate',
      config: { validateSchema: true },
      retryPolicy: {
        maxRetries: 2,
        initialDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 2,
        retryableErrors: ['VALIDATION_ERROR'],
      },
    });

    // Add processing step based on type
    switch (type) {
      case 'grading':
        steps.push({
          id: 'grade_assignment',
          name: 'Grade Assignment',
          type: 'action',
          config: { action: 'grade', context },
        });
        break;
      case 'analysis':
        steps.push({
          id: 'analyze_content',
          name: 'Analyze Content',
          type: 'action',
          config: { action: 'analyze', context },
        });
        break;
      case 'generation':
        steps.push({
          id: 'generate_content',
          name: 'Generate Content',
          type: 'action',
          config: { action: 'generate', context },
        });
        break;
    }

    // Add final transformation step
    steps.push({
      id: 'format_results',
      name: 'Format Results',
      type: 'transform',
      config: { format: 'json' },
    });

    return steps;
  }

  /**
   * Logging utility
   */
  private log(
    level: string,
    message: string,
    data?: Record<string, any>
  ): void {
    const logLevels: Record<string, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    if (logLevels[level] >= logLevels[this.config.logLevel]) {
      console.log(
        `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`,
        data || ''
      );
    }
  }
}

export const integratedAISystem = new IntegratedAISystem();
