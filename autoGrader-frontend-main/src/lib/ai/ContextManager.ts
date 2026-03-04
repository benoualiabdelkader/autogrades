/**
 * ContextManager.ts
 * Intelligent Context Management System
 * Handles short-term and long-term memory without RAG
 * Manages conversation chunks, entity tracking, and context summarization
 */

export interface ContextChunk {
  id: string;
  topic: string;
  messages: ContextMessage[];
  intent: string;
  entities: string[];
  timestamp: number;
  summary: string;
  isActive: boolean;
}

export interface ContextMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  entities: string[];
}

export interface UserLongTermMemory {
  userId: string;
  preferredLanguage?: string;
  preferredStyle?: 'formal' | 'casual' | 'technical' | 'friendly';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives?: string[];
  frequentTopics?: string[];
  preferences: UserPreferences;
  learningHistory: LearningRecord[];
}

export interface UserPreferences {
  detailLevel: 'brief' | 'moderate' | 'detailed';
  codeExamples: boolean;
  visualDiagrams: boolean;
  stepByStep: boolean;
  emojisEnabled: boolean;
  responseFormat: 'bullet_points' | 'paragraphs' | 'mixed';
}

export interface LearningRecord {
  topic: string;
  successRate: number;
  lastAccessed: number;
  questionsAsked: number;
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  activeChunks: ContextChunk[];
  shortTermMemory: ContextMessage[];
  longTermMemory: UserLongTermMemory;
  recentTopics: string[];
  clarificationNeeded: Map<string, boolean>;
  sessionStart: number;
  lastActivity: number;
}

export interface ContextSummary {
  activeTopics: string[];
  keyEntities: string[];
  previousQuestions: string[];
  suggestedFollowUp: string;
  missingContext: string[];
  contextConfidence: number;
}

export class ContextManager {
  private static readonly MAX_SHORT_TERM_MESSAGES = 10;
  private static readonly MAX_CONTEXT_CHUNKS = 5;
  private static readonly CHUNK_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours

  private static sessions: Map<string, SessionContext> = new Map();
  private static userMemory: Map<string, UserLongTermMemory> = new Map();

  /**
   * Initialize or get existing session
   */
  static initializeSession(sessionId: string, userId: string): SessionContext {
    // Return existing session if active
    const existing = this.sessions.get(sessionId);
    if (existing && Date.now() - existing.lastActivity < this.SESSION_TIMEOUT) {
      return existing;
    }

    // Load or create long-term memory
    let longTermMemory = this.userMemory.get(userId);
    if (!longTermMemory) {
      longTermMemory = this.createDefaultUserMemory(userId);
      this.userMemory.set(userId, longTermMemory);
    }

    // Create new session
    const session: SessionContext = {
      sessionId,
      userId,
      activeChunks: [],
      shortTermMemory: [],
      longTermMemory,
      recentTopics: [],
      clarificationNeeded: new Map(),
      sessionStart: Date.now(),
      lastActivity: Date.now(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Add message to context
   */
  static addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    entities: string[] = []
  ): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    const message: ContextMessage = {
      role,
      content,
      timestamp: Date.now(),
      entities,
    };

    // Add to short-term memory
    session.shortTermMemory.push(message);
    if (session.shortTermMemory.length > this.MAX_SHORT_TERM_MESSAGES) {
      session.shortTermMemory.shift();
    }

    // Update last activity
    session.lastActivity = Date.now();

    // Update recent topics
    entities.forEach(entity => {
      if (!session.recentTopics.includes(entity)) {
        session.recentTopics.push(entity);
      }
    });
    if (session.recentTopics.length > 10) {
      session.recentTopics.shift();
    }

    // Update or create context chunk
    this.updateContextChunks(session, content, entities);
  }

  /**
   * Update context chunks
   */
  private static updateContextChunks(
    session: SessionContext,
    content: string,
    entities: string[]
  ): void {
    const now = Date.now();

    // Clean up expired chunks
    session.activeChunks = session.activeChunks.filter(
      chunk => now - chunk.timestamp < this.CHUNK_TIMEOUT
    );

    // Try to add to existing chunk or create new
    const mainEntity = entities[0];
    const existingChunk = session.activeChunks.find(
      chunk => chunk.topic === mainEntity
    );

    if (existingChunk) {
      existingChunk.messages.push({
        role: 'user',
        content,
        timestamp: now,
        entities,
      });
    } else if (session.activeChunks.length < this.MAX_CONTEXT_CHUNKS) {
      session.activeChunks.push({
        id: `chunk_${Date.now()}`,
        topic: mainEntity || 'general',
        messages: [{
          role: 'user',
          content,
          timestamp: now,
          entities,
        }],
        intent: 'query',
        entities,
        timestamp: now,
        summary: this.summarizeChunk(content),
        isActive: true,
      });
    }
  }

  /**
   * Summarize a chunk of conversation
   */
  private static summarizeChunk(content: string): string {
    // Simple summarization: extract first sentence or truncate
    const sentences = content.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 0) {
      return sentences[0].trim().substring(0, 100);
    }
    return content.substring(0, 100);
  }

  /**
   * Get comprehensive context summary for response generation
   */
  static getContextSummary(sessionId: string): ContextSummary {
    const session = this.getSession(sessionId);
    if (!session) {
      return {
        activeTopics: [],
        keyEntities: [],
        previousQuestions: [],
        suggestedFollowUp: 'Let me know what you\'d like to learn about.',
        missingContext: [],
        contextConfidence: 0,
      };
    }

    const activeTopics = session.activeChunks
      .filter(chunk => chunk.isActive)
      .map(chunk => chunk.topic);

    const keyEntities = Array.from(
      new Set(session.activeChunks.flatMap(chunk => chunk.entities))
    ).slice(0, 5);

    const previousQuestions = session.shortTermMemory
      .filter(msg => msg.role === 'user')
      .slice(-3)
      .map(msg => msg.content);

    const missingContext = this.determineMissingContext(
      keyEntities,
      session.longTermMemory
    );

    const suggestedFollowUp = this.generateFollowUpSuggestion(
      activeTopics,
      previousQuestions
    );

    const contextConfidence = Math.min(
      1.0,
      (keyEntities.length + activeTopics.length) / 10
    );

    return {
      activeTopics,
      keyEntities,
      previousQuestions,
      suggestedFollowUp,
      missingContext,
      contextConfidence,
    };
  }

  /**
   * Determine what context is missing for better responses
   */
  private static determineMissingContext(
    keyEntities: string[],
    longTermMemory: UserLongTermMemory
  ): string[] {
    const missing: string[] = [];

    if (!longTermMemory.preferredLanguage && keyEntities.some(e => 
      ['python', 'javascript', 'java', 'typescript', 'rust'].includes(e.toLowerCase())
    )) {
      missing.push('programming_language_preference');
    }

    if (!longTermMemory.experienceLevel) {
      missing.push('experience_level');
    }

    if (keyEntities.length === 0) {
      missing.push('specific_topic_focus');
    }

    return missing;
  }

  /**
   * Generate context-aware follow-up suggestion
   */
  private static generateFollowUpSuggestion(
    activeTopics: string[],
    previousQuestions: string[]
  ): string {
    if (activeTopics.includes('python') || activeTopics.includes('code')) {
      return 'Would you like to see a code example or explanation?';
    }
    if (previousQuestions.some(q => q.includes('how'))) {
      return 'Would you like more details on any specific step?';
    }
    if (activeTopics.length === 0) {
      return 'What topic would you like to explore?';
    }
    return `Want to dive deeper into ${activeTopics[0]}?`;
  }

  /**
   * Update user long-term preferences based on behavior
   */
  static updateUserMemory(
    userId: string,
    updates: Partial<UserLongTermMemory>
  ): void {
    let userMemory = this.userMemory.get(userId);
    if (!userMemory) {
      userMemory = this.createDefaultUserMemory(userId);
    }

    if (updates.preferredLanguage) {
      userMemory.preferredLanguage = updates.preferredLanguage;
    }
    if (updates.preferredStyle) {
      userMemory.preferredStyle = updates.preferredStyle;
    }
    if (updates.experienceLevel) {
      userMemory.experienceLevel = updates.experienceLevel;
    }
    if (updates.learningObjectives) {
      userMemory.learningObjectives = updates.learningObjectives;
    }
    if (updates.preferences) {
      userMemory.preferences = { ...userMemory.preferences, ...updates.preferences };
    }

    this.userMemory.set(userId, userMemory);
  }

  /**
   * Record learning activity for analytics
   */
  static recordLearningActivity(
    userId: string,
    topic: string,
    successRate: number
  ): void {
    let userMemory = this.userMemory.get(userId);
    if (!userMemory) {
      userMemory = this.createDefaultUserMemory(userId);
    }

    const existing = userMemory.learningHistory.find(r => r.topic === topic);
    if (existing) {
      existing.successRate = (existing.successRate + successRate) / 2;
      existing.questionsAsked++;
      existing.lastAccessed = Date.now();
    } else {
      userMemory.learningHistory.push({
        topic,
        successRate,
        lastAccessed: Date.now(),
        questionsAsked: 1,
      });
    }

    this.userMemory.set(userId, userMemory);
  }

  /**
   * Get context-enriched prompt for LLM
   */
  static buildContextEnrichedPrompt(sessionId: string, userQuery: string): string {
    const session = this.getSession(sessionId);
    if (!session) return userQuery;

    const summary = this.getContextSummary(sessionId);
    const shortTermContext = session.shortTermMemory
      .slice(-3)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    let contextPrompt = userQuery;

    // Add context if available and confident
    if (summary.contextConfidence > 0.5) {
      contextPrompt += `\n\nContext from conversation:\n`;
      if (summary.activeTopics.length > 0) {
        contextPrompt += `- Topics discussed: ${summary.activeTopics.join(', ')}\n`;
      }
      if (summary.keyEntities.length > 0) {
        contextPrompt += `- Key concepts: ${summary.keyEntities.join(', ')}\n`;
      }
    }

    // Add user preferences
    if (session.longTermMemory.preferredLanguage) {
      contextPrompt += `\nUser preferes ${session.longTermMemory.preferredLanguage} code examples.\n`;
    }
    if (session.longTermMemory.experienceLevel) {
      contextPrompt += `User is ${session.longTermMemory.experienceLevel}.\n`;
    }

    return contextPrompt;
  }

  /**
   * Get short-term memory (last N messages)
   */
  static getShortTermMemory(sessionId: string, count: number = 5): ContextMessage[] {
    const session = this.getSession(sessionId);
    return session?.shortTermMemory.slice(-count) || [];
  }

  /**
   * Get long-term memory for user
   */
  static getLongTermMemory(userId: string): UserLongTermMemory | undefined {
    return this.userMemory.get(userId);
  }

  /**
   * Get session
   */
  private static getSession(sessionId: string): SessionContext | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    // Check timeout
    if (Date.now() - session.lastActivity > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    return session;
  }

  /**
   * Create default user memory
   */
  private static createDefaultUserMemory(userId: string): UserLongTermMemory {
    return {
      userId,
      preferences: {
        detailLevel: 'moderate',
        codeExamples: true,
        visualDiagrams: false,
        stepByStep: true,
        emojisEnabled: true,
        responseFormat: 'mixed',
      },
      learningHistory: [],
    };
  }

  /**
   * End session
   */
  static endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Get session analytics
   */
  static getSessionAnalytics(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    return {
      duration: Date.now() - session.sessionStart,
      messageCount: session.shortTermMemory.length,
      chunkCount: session.activeChunks.length,
      topicsExplored: session.recentTopics.length,
      lastActivity: Date.now() - session.lastActivity,
    };
  }
}

export default ContextManager;
