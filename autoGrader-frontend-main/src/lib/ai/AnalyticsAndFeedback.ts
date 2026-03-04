/**
 * AnalyticsAndFeedback.ts
 * Intelligent Analytics and Continuous Improvement System
 * Tracks performance, collects feedback, and auto-improves prompts
 * Includes KPI monitoring and usage analytics
 */

export interface SessionFeedback {
  sessionId: string;
  userId: string;
  timestamp: number;
  responses: ResponseFeedback[];
  overallSatisfaction: number;
  improvementAreas: string[];
  notes?: string;
}

export interface ResponseFeedback {
  responseId: string;
  helpful: boolean;
  quality: 'excellent' | 'good' | 'okay' | 'poor';
  accuracy: number; // 0-100
  clarityRating: number; // 0-100
  relevance: number; // 0-100
  wasFollowUpAnswered: boolean;
  suggestedImprovements?: string;
}

export interface KPIMetrics {
  clarificationRate: number; // % of interactions requiring clarification
  sessionLength: number; // Average messages per session
  userSatisfaction: number; // 0-100
  responseAccuracy: number; // 0-100
  firstResponseHelpfulness: number; // 0-100
  followUpEngagementRate: number; // % of follow-ups clicked
  errorRate: number; // % incorrect or unhelpful responses
  learningProgressRate: number; // % visible improvement in user understanding
}

export interface ErrorLog {
  id: string;
  timestamp: number;
  sessionId: string;
  intent: string;
  userQuery: string;
  response: string;
  errorType: 'misclassified_intent' | 'inaccurate_info' | 'poor_clarity' | 'irrelevant' | 'other';
  errorDescription: string;
  suggestedPromptImprovement?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  intent: string;
  basePrompt: string;
  version: number;
  successRate: number;
  usageCount: number;
  lastUpdated: number;
}

export interface AnalyticsReport {
  periodStart: number;
  periodEnd: number;
  totalSessions: number;
  totalResponses: number;
  kpi: KPIMetrics;
  topErrors: ErrorLog[];
  prototypeImprovements: PromptTemplate[];
  recommendations: string[];
}

export class AnalyticsAndFeedback {
  private static feedbackDatabase: SessionFeedback[] = [];
  private static errorLogs: ErrorLog[] = [];
  private static promptTemplates: Map<string, PromptTemplate> = new Map();
  private static sessionMetrics: Map<string, any> = new Map();
  private static readonly FEEDBACK_RETENTION = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * Record user feedback on a response
   */
  static recordResponseFeedback(
    sessionId: string,
    userId: string,
    responseFeedback: ResponseFeedback
  ): void {
    let sessionFeedback = this.feedbackDatabase.find(
      f => f.sessionId === sessionId
    );

    if (!sessionFeedback) {
      sessionFeedback = {
        sessionId,
        userId,
        timestamp: Date.now(),
        responses: [],
        overallSatisfaction: 0,
        improvementAreas: [],
      };
      this.feedbackDatabase.push(sessionFeedback);
    }

    sessionFeedback.responses.push(responseFeedback);
    this.updateSessionMetrics(sessionId, responseFeedback);
  }

  /**
   * Record session feedback
   */
  static recordSessionFeedback(
    sessionId: string,
    userId: string,
    satisfaction: number,
    improvementAreas: string[],
    notes?: string
  ): void {
    const sessionFeedback = this.feedbackDatabase.find(
      f => f.sessionId === sessionId
    );

    if (sessionFeedback) {
      sessionFeedback.overallSatisfaction = satisfaction;
      sessionFeedback.improvementAreas = improvementAreas;
      sessionFeedback.notes = notes;
    }
  }

  /**
   * Log an error for analysis
   */
  static logError(
    sessionId: string,
    intent: string,
    userQuery: string,
    response: string,
    errorType: ErrorLog['errorType'],
    description: string
  ): void {
    const errorLog: ErrorLog = {
      id: `error_${Date.now()}`,
      timestamp: Date.now(),
      sessionId,
      intent,
      userQuery,
      response,
      errorType,
      errorDescription: description,
    };

    // Try to suggest improvement
    errorLog.suggestedPromptImprovement = this.suggestPromptImprovement(
      intent,
      userQuery,
      response,
      errorType
    );

    this.errorLogs.push(errorLog);

    // Update prompt template based on error
    if (errorLog.suggestedPromptImprovement) {
      this.updatePromptTemplate(intent, errorLog.suggestedPromptImprovement);
    }
  }

  /**
   * Suggest improvements for prompts based on error analysis
   */
  private static suggestPromptImprovement(
    intent: string,
    userQuery: string,
    response: string,
    errorType: string
  ): string | undefined {
    const improvements: Record<string, string> = {
      misclassified_intent: `Add specific keywords to intent classifier for ${intent}. Suggested: improve entity extraction for context words like "${userQuery.split(' ').slice(0, 3).join(' ')}"`,
      inaccurate_info: `Ensure factual accuracy for ${intent}. Add verification step: "Before responding, verify the accuracy of technical details."`,
      poor_clarity: `Improve clarity for ${intent}. Suggestion: Always start with TL;DR, use simpler language, break complex ideas into smaller steps.`,
      irrelevant: `Improve relevance detection. Ensure response directly addresses: "${userQuery}"`,
      other: `Review responses for ${intent} type queries. May need to refine prompt template.`,
    };

    return improvements[errorType];
  }

  /**
   * Update prompt template based on improvements
   */
  private static updatePromptTemplate(intent: string, improvement: string): void {
    let template = this.promptTemplates.get(intent);

    if (!template) {
      template = {
        id: `template_${intent}`,
        name: `Default ${intent} Template`,
        intent,
        basePrompt: '',
        version: 1,
        successRate: 0.5,
        usageCount: 0,
        lastUpdated: Date.now(),
      };
      this.promptTemplates.set(intent, template);
    }

    // Update prompt with improvement suggestion
    template.basePrompt += `\n\n[Improvement added]: ${improvement}`;
    template.version++;
    template.lastUpdated = Date.now();
  }

  /**
   * Update session metrics based on feedback
   */
  private static updateSessionMetrics(
    sessionId: string,
    feedback: ResponseFeedback
  ): void {
    let metrics = this.sessionMetrics.get(sessionId) || {
      totalResponses: 0,
      helpfulCount: 0,
      accuracyScores: [],
      clarityScores: [],
      relevanceScores: [],
    };

    metrics.totalResponses++;
    if (feedback.helpful) metrics.helpfulCount++;
    metrics.accuracyScores.push(feedback.accuracy);
    metrics.clarityScores.push(feedback.clarityRating);
    metrics.relevanceScores.push(feedback.relevance);

    this.sessionMetrics.set(sessionId, metrics);
  }

  /**
   * Get KPI metrics for a period
   */
  static getKPIMetrics(startTime?: number, endTime?: number): KPIMetrics {
    const start = startTime || Date.now() - 7 * 24 * 60 * 60 * 1000; // Last 7 days
    const end = endTime || Date.now();

    // Filter feedback within period
    const relevantFeedback = this.feedbackDatabase.filter(
      f => f.timestamp >= start && f.timestamp <= end
    );

    // Filter errors within period
    const relevantErrors = this.errorLogs.filter(
      e => e.timestamp >= start && e.timestamp <= end
    );

    // Calculate KPIs
    let totalResponses = 0;
    let helpfulResponses = 0;
    let accuracyScores: number[] = [];
    let clarityScores: number[] = [];
    let relevanceScores: number[] = [];
    let followUpAnswered = 0;

    relevantFeedback.forEach(session => {
      session.responses.forEach(response => {
        totalResponses++;
        if (response.helpful) helpfulResponses++;
        accuracyScores.push(response.accuracy);
        clarityScores.push(response.clarityRating);
        relevanceScores.push(response.relevance);
        if (response.wasFollowUpAnswered) followUpAnswered++;
      });
    });

    const calculateAverage = (arr: number[]): number => {
      if (arr.length === 0) return 0;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    };

    return {
      clarificationRate: this.calculateClarificationRate(relevantFeedback),
      sessionLength: relevantFeedback.length > 0
        ? relevantFeedback.reduce((sum, f) => sum + f.responses.length, 0) / relevantFeedback.length
        : 0,
      userSatisfaction: relevantFeedback.length > 0
        ? relevantFeedback.reduce((sum, f) => sum + f.overallSatisfaction, 0) / relevantFeedback.length
        : 0,
      responseAccuracy: calculateAverage(accuracyScores),
      firstResponseHelpfulness: totalResponses > 0
        ? (helpfulResponses / totalResponses) * 100
        : 0,
      followUpEngagementRate: totalResponses > 0
        ? (followUpAnswered / totalResponses) * 100
        : 0,
      errorRate: totalResponses > 0
        ? (relevantErrors.length / totalResponses) * 100
        : 0,
      learningProgressRate: this.calculateLearningProgress(relevantFeedback),
    };
  }

  /**
   * Calculate clarification rate
   */
  private static calculateClarificationRate(feedback: SessionFeedback[]): number {
    if (feedback.length === 0) return 0;

    let clarificationsNeeded = 0;
    feedback.forEach(session => {
      session.responses.forEach(response => {
        if (!response.helpful && response.quality === 'poor') {
          clarificationsNeeded++;
        }
      });
    });

    const totalResponses = feedback.reduce((sum, f) => sum + f.responses.length, 0);
    return (clarificationsNeeded / totalResponses) * 100;
  }

  /**
   * Calculate learning progress
   */
  private static calculateLearningProgress(feedback: SessionFeedback[]): number {
    if (feedback.length < 2) return 0;

    // Compare first half vs second half of feedback
    const midpoint = Math.floor(feedback.length / 2);
    const firstHalf = feedback.slice(0, midpoint);
    const secondHalf = feedback.slice(midpoint);

    const calculateQuality = (sessions: SessionFeedback[]): number => {
      let totalQuality = 0;
      let count = 0;
      sessions.forEach(session => {
        session.responses.forEach(response => {
          if (response.helpful) totalQuality++;
          count++;
        });
      });
      return count > 0 ? (totalQuality / count) * 100 : 0;
    };

    const firstHalfQuality = calculateQuality(firstHalf);
    const secondHalfQuality = calculateQuality(secondHalf);

    return Math.max(0, secondHalfQuality - firstHalfQuality);
  }

  /**
   * Get error analysis
   */
  static getErrorAnalysis(count: number = 10) {
    const errors = this.errorLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);

    return {
      totalErrors: this.errorLogs.length,
      recentErrors: errors,
      errorsByType: this.groupErrorsByType(),
      errorsByIntent: this.groupErrorsByIntent(),
    };
  }

  /**
   * Group errors by type
   */
  private static groupErrorsByType(): Record<string, number> {
    const grouped: Record<string, number> = {};
    this.errorLogs.forEach(error => {
      grouped[error.errorType] = (grouped[error.errorType] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Group errors by intent
   */
  private static groupErrorsByIntent(): Record<string, number> {
    const grouped: Record<string, number> = {};
    this.errorLogs.forEach(error => {
      grouped[error.intent] = (grouped[error.intent] || 0) + 1;
    });
    return grouped;
  }

  /**
   * Get prompt template performance
   */
  static getPromptPerformance(intent: string): PromptTemplate | undefined {
    return this.promptTemplates.get(intent);
  }

  /**
   * Generate comprehensive analytics report
   */
  static generateAnalyticsReport(
    startTime?: number,
    endTime?: number
  ): AnalyticsReport {
    const start = startTime || Date.now() - 7 * 24 * 60 * 60 * 1000;
    const end = endTime || Date.now();

    const kpi = this.getKPIMetrics(start, end);
    const errorAnalysis = this.getErrorAnalysis(5);
    const templates = Array.from(this.promptTemplates.values()).sort(
      (a, b) => b.usageCount - a.usageCount
    );

    const recommendations = this.generateRecommendations(kpi, errorAnalysis);

    return {
      periodStart: start,
      periodEnd: end,
      totalSessions: this.feedbackDatabase.filter(
        f => f.timestamp >= start && f.timestamp <= end
      ).length,
      totalResponses: this.feedbackDatabase
        .filter(f => f.timestamp >= start && f.timestamp <= end)
        .reduce((sum, f) => sum + f.responses.length, 0),
      kpi,
      topErrors: errorAnalysis.recentErrors,
      prototypeImprovements: templates.slice(0, 5),
      recommendations,
    };
  }

  /**
   * Generate recommendations based on metrics
   */
  private static generateRecommendations(
    kpi: KPIMetrics,
    errorAnalysis: ReturnType<typeof AnalyticsAndFeedback.getErrorAnalysis>
  ): string[] {
    const recommendations: string[] = [];

    // Clarification recommendations
    if (kpi.clarificationRate > 20) {
      recommendations.push(
        '⚠️ High clarification rate (>20%). Consider improving intent classification and adding more specific entity extraction.'
      );
    }

    // Accuracy recommendations
    if (kpi.responseAccuracy < 70) {
      recommendations.push(
        '⚠️ Response accuracy below 70%. Review error logs for patterns and update prompt templates accordingly.'
      );
    }

    // User satisfaction
    if (kpi.userSatisfaction < 70) {
      recommendations.push(
        '⚠️ User satisfaction below 70%. Focus on improving clarity and relevance of responses.'
      );
    }

    // Follow-up engagement
    if (kpi.followUpEngagementRate < 30) {
      recommendations.push(
        '📊 Low follow-up engagement. Consider making follow-up questions more relevant and compelling.'
      );
    }

    // Learning progress
    if (kpi.learningProgressRate > 10) {
      recommendations.push(
        '✅ Good learning progress detected. Users showing improvement in satisfaction over time.'
      );
    }

    // Error analysis
    const topErrorType = Object.entries(errorAnalysis.errorsByType).sort(
      (a, b) => b[1] - a[1]
    )[0];
    if (topErrorType) {
      recommendations.push(
        `🔧 Focus on reducing "${topErrorType[0]}" errors (${topErrorType[1]} occurrences). Update prompts that handle this case.`
      );
    }

    return recommendations;
  }

  /**
   * Get session summary
   */
  static getSessionSummary(sessionId: string) {
    const feedback = this.feedbackDatabase.find(f => f.sessionId === sessionId);
    const metrics = this.sessionMetrics.get(sessionId);

    return {
      feedback,
      metrics,
      avgAccuracy: metrics?.accuracyScores.reduce((a: number, b: number) => a + b, 0) / (metrics?.accuracyScores.length || 1) || 0,
      avgClarity: metrics?.clarityScores.reduce((a: number, b: number) => a + b, 0) / (metrics?.clarityScores.length || 1) || 0,
    };
  }

  /**
   * Clean up old feedback
   */
  static cleanupOldFeedback(maxAge: number = this.FEEDBACK_RETENTION): void {
    const cutoff = Date.now() - maxAge;
    this.feedbackDatabase = this.feedbackDatabase.filter(f => f.timestamp > cutoff);
    this.errorLogs = this.errorLogs.filter(e => e.timestamp > cutoff);
  }
}

export default AnalyticsAndFeedback;
