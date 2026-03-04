/**
 * EnhancedAIAssistant.ts
 * Main orchestrator combining all AI enhancement systems
 * Integrates: Intent Classification, Context Management, Response Building, Analytics
 * Provides unified interface for intelligent conversational AI
 */

import IntentClassifier, { IntentClassificationResult } from './IntentClassifier';
import ContextManager, { ContextSummary, SessionContext } from './ContextManager';
import ResponseBuilder, { StructuredResponse, AdaptivePromptConfig } from './ResponseBuilder';
import AnalyticsAndFeedback, { ResponseFeedback, KPIMetrics, AnalyticsReport } from './AnalyticsAndFeedback';
import { RubricSystem } from './RubricSystem';
import { AIPromptBuilder } from './AIPromptBuilder';
import { WorkflowTemplateManager } from '../workflows/WorkflowTemplateManager';

export interface AIAssistantConfig {
  sessionId: string;
  userId: string;
  enableAnalytics: boolean;
  enableSelfCorrection: boolean;
  enablePromptChaining: boolean;
  modelName?: string;
  apiKey?: string;
}

export interface ConversationResponse {
  response: StructuredResponse;
  metadata: ResponseMetadata;
  suggestedActions: SuggestedAction[];
  performance: PerformanceMetrics;
}

export interface ResponseMetadata {
  intentClassification: IntentClassificationResult;
  contextSummary: ContextSummary;
  responseQuality: number; // 0-100
  confidenceScore: number; // 0-100
  processingTime: number; // ms
}

export interface SuggestedAction {
  action: 'ask_clarification' | 'provide_example' | 'simplify' | 'elaborate' | 'show_code' | 'create_workflow' | 'generate_rules';
  description: string;
  prompt: string;
}

export interface PerformanceMetrics {
  timeToFirstResponse: number;
  totalProcessingTime: number;
  tokenUsage?: { prompt: number; completion: number };
}

export interface WorkflowGenerationRequest {
  type: 'assessment' | 'peer_review' | 'analytics' | 'rubric_evaluation' | 'portfolio';
  assignmentType?: string;
  courseLevel?: string;
  rubricType?: string;
  specialRequirements?: string[];
}

export interface AIAssistantSession {
  sessionId: string;
  userId: string;
  startTime: number;
  messages: ConversationResponse[];
  context: SessionContext;
  performance: SessionPerformance;
}

export interface SessionPerformance {
  totalQueries: number;
  averageResponseTime: number;
  userSatisfaction?: number;
  clarificationCount: number;
  workflowsGenerated: number;
}

export class EnhancedAIAssistant {
  private config: AIAssistantConfig;
  private session: AIAssistantSession;
  private activeSessions: Map<string, AIAssistantSession> = new Map();

  constructor(config: AIAssistantConfig) {
    this.config = config;
    
    // Initialize context for this session
    const context = ContextManager.initializeSession(config.sessionId, config.userId);
    
    this.session = {
      sessionId: config.sessionId,
      userId: config.userId,
      startTime: Date.now(),
      messages: [],
      context,
      performance: {
        totalQueries: 0,
        averageResponseTime: 0,
        clarificationCount: 0,
        workflowsGenerated: 0,
      },
    };

    this.activeSessions.set(config.sessionId, this.session);
  }

  /**
   * Main method: Process user query and generate intelligent response
   */
  async processQuery(userQuery: string): Promise<ConversationResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Classify user intent
      const intentClassification = IntentClassifier.classifyIntent(
        userQuery,
        this.config.sessionId
      );

      // Step 2: Get context summary
      const contextSummary = ContextManager.getContextSummary(this.config.sessionId);

      // Step 3: Add message to context
      ContextManager.addMessage(
        this.config.sessionId,
        'user',
        userQuery,
        intentClassification.entities.map(e => e.value)
      );

      // Step 4: Build adaptive config for response generation
      const adaptiveConfig: AdaptivePromptConfig = {
        intent: intentClassification.primaryIntent,
        entities: intentClassification.entities.map(e => e.value),
        contextSummary,
        userMood: intentClassification.metadata.userMood,
        detailLevel: intentClassification.metadata.detailLevel,
        interactionStyle: intentClassification.metadata.interactionStyle,
      };

      // Step 5: Generate structured response
      const response = ResponseBuilder.buildStructuredResponse(
        userQuery,
        intentClassification,
        contextSummary,
        adaptiveConfig
      );

      // Step 6: Apply self-correction if enabled
      let finalResponse = response;
      if (this.config.enableSelfCorrection) {
        finalResponse.explanation = ResponseBuilder.applySelfCorrection(response.explanation);
      }

      // Step 7: Add to context and analytics
      ContextManager.addMessage(
        this.config.sessionId,
        'assistant',
        finalResponse.explanation,
        intentClassification.entities.map(e => e.value)
      );

      // Step 8: Generate metadata
      const metadata: ResponseMetadata = {
        intentClassification,
        contextSummary,
        responseQuality: this.calculateResponseQuality(intentClassification, contextSummary),
        confidenceScore: intentClassification.confidence * 100,
        processingTime: Date.now() - startTime,
      };

      // Step 9: Generate suggested actions
      const suggestedActions = this.generateSuggestedActions(
        intentClassification,
        contextSummary
      );

      // Step 10: Calculate performance metrics
      const performance: PerformanceMetrics = {
        timeToFirstResponse: Date.now() - startTime,
        totalProcessingTime: Date.now() - startTime,
      };

      // Build final response
      const conversationResponse: ConversationResponse = {
        response: finalResponse,
        metadata,
        suggestedActions,
        performance,
      };

      // Update session
      this.session.messages.push(conversationResponse);
      this.updateSessionPerformance(performance, intentClassification);

      // Log to analytics if enabled
      if (this.config.enableAnalytics) {
        // Feedback will be collected later
      }

      return conversationResponse;
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  }

  /**
   * Generate workflow from conversation context
   */
  async generateWorkflow(request: WorkflowGenerationRequest) {
    const contextSummary = ContextManager.getContextSummary(this.config.sessionId);

    const workflowConfig = {
      name: `${request.type}_workflow_${Date.now()}`,
      assignmentType: request.assignmentType || 'custom',
      courseLevel: request.courseLevel || 'intermediate',
      specialRequirements: request.specialRequirements || [],
    };

    const workflow = WorkflowTemplateManager.createAssessmentWorkflow(
      workflowConfig.name,
      workflowConfig.assignmentType,
      {
        courseLevel: workflowConfig.courseLevel,
        specialRequirements: workflowConfig.specialRequirements,
      }
    );

    // Log workflow generation
    this.session.performance.workflowsGenerated++;

    // Add to context
    ContextManager.addMessage(
      this.config.sessionId,
      'assistant',
      `Generated ${request.type} workflow`,
      ['workflow', request.type]
    );

    return {
      workflow,
      exportedJSON: WorkflowTemplateManager.exportWorkflowJSON(workflow),
      metadata: {
        generatedAt: Date.now(),
        assignmentType: workflowConfig.assignmentType,
        courseLevel: workflowConfig.courseLevel,
      },
    };
  }

  /**
   * Generate rubric based on context
   */
  async generateRubric(assignmentType: string, courseLevel: string = 'intermediate') {
    const rubric = RubricSystem.generateRubric(assignmentType, courseLevel as any);

    // Add to context
    ContextManager.addMessage(
      this.config.sessionId,
      'assistant',
      `Generated rubric for ${assignmentType}`,
      ['rubric', assignmentType]
    );

    return rubric;
  }

  /**
   * Generate prompt for assignment grading
   */
  async generateGradingPrompt(
    assignmentType: string,
    submission: string,
    rubric?: any
  ) {
    const context = {
      assignmentType,
      submissionType: 'text',
      courseLevel: 'intermediate',
      specialRequirements: [],
    };

    const prompt = AIPromptBuilder.buildGradingPrompt(context);

    return {
      prompt,
      fullPrompt: `${prompt}\n\nSubmission to grade:\n${submission}`,
      metadata: {
        assignmentType,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Record feedback on response
   */
  recordFeedback(responseId: string, feedback: ResponseFeedback): void {
    if (!this.config.enableAnalytics) return;

    AnalyticsAndFeedback.recordResponseFeedback(
      this.config.sessionId,
      this.config.userId,
      feedback
    );
  }

  /**
   * Record session feedback
   */
  recordSessionFeedback(
    satisfaction: number,
    improvementAreas: string[],
    notes?: string
  ): void {
    if (!this.config.enableAnalytics) return;

    AnalyticsAndFeedback.recordSessionFeedback(
      this.config.sessionId,
      this.config.userId,
      satisfaction,
      improvementAreas,
      notes
    );
  }

  /**
   * Handle clarification request
   */
  async askForClarification(clarificationQuestion: string): Promise<ConversationResponse> {
    this.session.performance.clarificationCount++;

    // Re-process with clarification context
    const enhancedQuery = `Clarification: ${clarificationQuestion}`;
    return this.processQuery(enhancedQuery);
  }

  /**
   * Get KPI metrics for this session/user
   */
  getMetrics(period: 'session' | 'day' | 'week' | 'month' = 'session'): object {
    if (period === 'session') {
      return this.session.performance;
    }

    // Get metrics from analytics
    const kpi = AnalyticsAndFeedback.getKPIMetrics();
    return kpi;
  }

  /**
   * Get analytics report
   */
  getAnalyticsReport(startTime?: number, endTime?: number): AnalyticsReport {
    return AnalyticsAndFeedback.generateAnalyticsReport(startTime, endTime);
  }

  /**
   * End current session
   */
  endSession(): void {
    ContextManager.endSession(this.config.sessionId);
    AnalyticsAndFeedback.cleanupOldFeedback();
  }

  /**
   * Get session info
   */
  getSessionInfo() {
    return {
      sessionId: this.session.sessionId,
      userId: this.session.userId,
      startTime: this.session.startTime,
      duration: Date.now() - this.session.startTime,
      messageCount: this.session.messages.length,
      performance: this.session.performance,
      contextSnapshot: ContextManager.getContextSummary(this.config.sessionId),
    };
  }

  // ===== Private Methods =====

  /**
   * Calculate response quality score
   */
  private calculateResponseQuality(
    intent: IntentClassificationResult,
    context: ContextSummary
  ): number {
    let score = 50; // Base score

    // Increase if high intent confidence
    score += intent.confidence * 30;

    // Increase if good context
    if (context.contextConfidence > 0.7) score += 15;

    // Increase if clarification not needed
    if (!intent.clarificationNeeded) score += 10;

    return Math.min(100, score);
  }

  /**
   * Generate suggested follow-up actions
   */
  private generateSuggestedActions(
    intent: IntentClassificationResult,
    context: ContextSummary
  ): SuggestedAction[] {
    const actions: SuggestedAction[] = [];

    // If clarification was needed, suggest it
    if (intent.clarificationNeeded && intent.suggestedClarification) {
      actions.push({
        action: 'ask_clarification',
        description: 'Need clarification to provide better answer',
        prompt: intent.suggestedClarification,
      });
    }

    // If code example relevant, suggest it
    if (intent.entities.some(e => e.type === 'language') && intent.primaryIntent !== 'code_example') {
      actions.push({
        action: 'show_code',
        description: 'Would you like a code example?',
        prompt: 'Show me a code example',
      });
    }

    // If workflow-related, suggest workflow generation
    if (context.activeTopics.includes('workflow') || context.activeTopics.includes('grading')) {
      actions.push({
        action: 'create_workflow',
        description: 'Generate a workflow for this',
        prompt: 'Create a workflow for this',
      });
    }

    // If rubric-related, suggest rubric generation
    if (context.activeTopics.includes('rubric') || context.activeTopics.includes('grading')) {
      actions.push({
        action: 'generate_rules',
        description: 'Generate evaluation rules',
        prompt: 'Generate grading rules',
      });
    }

    return actions.slice(0, 3); // Return top 3
  }

  /**
   * Update session performance metrics
   */
  private updateSessionPerformance(
    performance: PerformanceMetrics,
    intent: IntentClassificationResult
  ): void {
    const perf = this.session.performance;
    perf.totalQueries++;

    // Update average response time
    perf.averageResponseTime =
      (perf.averageResponseTime * (perf.totalQueries - 1) + performance.totalProcessingTime) /
      perf.totalQueries;
  }

  /**
   * Static method: Create assistant for quick use
   */
  static create(config: Partial<AIAssistantConfig>): EnhancedAIAssistant {
    const fullConfig: AIAssistantConfig = {
      sessionId: config.sessionId || `session_${Date.now()}`,
      userId: config.userId || 'anonymous',
      enableAnalytics: config.enableAnalytics !== false,
      enableSelfCorrection: config.enableSelfCorrection !== false,
      enablePromptChaining: config.enablePromptChaining !== false,
      ...config,
    };

    return new EnhancedAIAssistant(fullConfig);
  }
}

export default EnhancedAIAssistant;
