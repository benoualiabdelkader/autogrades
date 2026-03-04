/**
 * IntentClassifier.ts
 * Advanced Intent Understanding and Classification System
 * Hierarchical multi-level intent recognition with entity extraction
 * Supports: Teaching, Code Examples, Simplification, Step-by-step, Advice, Custom Queries
 */

export interface IntentClassificationResult {
  primaryIntent: 'teaching' | 'code_example' | 'simplification' | 'steps' | 'advice' | 'query' | 'custom';
  secondaryIntent?: string;
  confidence: number;
  entities: ExtractedEntity[];
  clarificationNeeded: boolean;
  suggestedClarification?: string;
  originalQuery: string;
  refinedQuery: string;
  metadata: IntentMetadata;
}

export interface ExtractedEntity {
  type: 'language' | 'concept' | 'difficulty' | 'format' | 'domain' | 'action' | 'tool';
  value: string;
  confidence: number;
}

export interface IntentMetadata {
  userMood: 'neutral' | 'frustrated' | 'excited' | 'confused' | 'formal';
  urgency: 'low' | 'medium' | 'high';
  detailLevel: 'high' | 'medium' | 'low';
  interactionStyle: 'formal' | 'friendly' | 'technical' | 'casual';
}

export interface ContextualIntent {
  currentIntent: IntentClassificationResult;
  previousIntents: IntentClassificationResult[];
  relatedEntities: ExtractedEntity[];
  topicsHistory: string[];
  commonPatterns: string[];
  predictedNextIntent?: string;
}

export class IntentClassifier {
  private static readonly INTENT_KEYWORDS = {
    teaching: ['explain', 'شرح', 'how does', 'what is', 'tell me about', 'teach', 'learn'],
    code_example: ['example', 'مثال', 'code', 'show me', 'sample', 'implementation', 'استخدام'],
    simplification: ['simple', 'تبسيط', 'easy', 'explain like', 'eli5', 'basic', 'beginner'],
    steps: ['step', 'خطوات', 'process', 'how to', 'procedure', 'تعليمات', 'sequence'],
    advice: ['should', 'best practice', 'recomm', 'نصيحة', 'أفضل', 'suggestion', 'tips'],
    query: ['what', 'where', 'when', 'why', 'أي', 'أين', 'متى', 'لماذا'],
  };

  private static readonly ENTITY_PATTERNS = {
    language: /\b(python|javascript|typescript|java|c\+\+|rust|go|ruby|php|kotlin|swift)\b/gi,
    framework: /\b(react|vue|angular|next\.js|svelte|fastapi|django|spring|laravel)\b/gi,
    concept: /\b(llm|ai|machine learning|neural|transformer|api|database|cache|algorithm)\b/gi,
    difficulty: /\b(beginner|intermediate|advanced|expert|professional|entry-level)\b/gi,
  };

  private static sessionMemory: Map<string, ContextualIntent> = new Map();

  /**
   * Main classification method - analyzes user input for intent and entities
   */
  static classifyIntent(userInput: string, sessionId?: string): IntentClassificationResult {
    const normalized = userInput.toLowerCase().trim();
    
    // Extract entities first
    const entities = this.extractEntities(userInput);
    
    // Determine primary intent
    const primaryIntent = this.determinePrimaryIntent(normalized);
    
    // Detect metadata
    const metadata = this.detectMetadata(userInput);
    
    // Check if clarification is needed
    const clarificationNeeded = this.needsClarification(userInput, entities);
    
    // Refine query based on classification
    const refinedQuery = this.refineQuery(userInput, primaryIntent, entities);
    
    const result: IntentClassificationResult = {
      primaryIntent,
      confidence: this.calculateConfidence(normalized, primaryIntent),
      entities,
      clarificationNeeded,
      suggestedClarification: clarificationNeeded ? this.generateClarificationQuestion(primaryIntent, entities) : undefined,
      originalQuery: userInput,
      refinedQuery,
      metadata,
    };

    // Store in session memory if sessionId provided
    if (sessionId) {
      this.updateSessionMemory(sessionId, result);
    }

    return result;
  }

  /**
   * Extract entities from user input
   */
  private static extractEntities(input: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const lowerInput = input.toLowerCase();

    // Extract programming languages
    const languages = input.match(this.ENTITY_PATTERNS.language) || [];
    languages.forEach(lang => {
      entities.push({
        type: 'language',
        value: lang.toLowerCase(),
        confidence: 0.95,
      });
    });

    // Extract concepts
    const concepts = input.match(this.ENTITY_PATTERNS.concept) || [];
    concepts.forEach(concept => {
      entities.push({
        type: 'concept',
        value: concept.toLowerCase(),
        confidence: 0.9,
      });
    });

    // Extract difficulty level
    const difficulty = input.match(this.ENTITY_PATTERNS.difficulty) || [];
    difficulty.forEach(level => {
      entities.push({
        type: 'difficulty',
        value: level.toLowerCase(),
        confidence: 0.92,
      });
    });

    // Detect response format preference
    if (lowerInput.includes('bullet') || lowerInput.includes('list') || lowerInput.includes('points')) {
      entities.push({
        type: 'format',
        value: 'bullet_points',
        confidence: 0.9,
      });
    }
    if (lowerInput.includes('paragraph') || lowerInput.includes('essay')) {
      entities.push({
        type: 'format',
        value: 'paragraph',
        confidence: 0.9,
      });
    }
    if (lowerInput.includes('code') || lowerInput.includes('implementation')) {
      entities.push({
        type: 'format',
        value: 'code_focused',
        confidence: 0.9,
      });
    }

    return entities;
  }

  /**
   * Determine primary intent using keyword matching and heuristics
   */
  private static determinePrimaryIntent(
    normalized: string
  ): IntentClassificationResult['primaryIntent'] {
    let maxScore = 0;
    let detectedIntent: IntentClassificationResult['primaryIntent'] = 'query';

    for (const [intent, keywords] of Object.entries(this.INTENT_KEYWORDS)) {
      const score = keywords.reduce((acc, keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = (normalized.match(regex) || []).length;
        return acc + matches;
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        detectedIntent = intent as IntentClassificationResult['primaryIntent'];
      }
    }

    return detectedIntent;
  }

  /**
   * Detect user mood and interaction style
   */
  private static detectMetadata(input: string): IntentMetadata {
    const lowerInput = input.toLowerCase();
    
    let userMood: IntentMetadata['userMood'] = 'neutral';
    if (lowerInput.includes('!') && (lowerInput.includes('wow') || lowerInput.includes('amazing'))) {
      userMood = 'excited';
    } else if (lowerInput.includes('?!') || lowerInput.includes('confused') || lowerInput.includes('don\'t understand')) {
      userMood = 'confused';
    } else if (lowerInput.includes('!!!') || lowerInput.includes('help') || lowerInput.includes('stuck')) {
      userMood = 'frustrated';
    }

    let urgency: IntentMetadata['urgency'] = 'medium';
    if (lowerInput.includes('urgent') || lowerInput.includes('asap') || lowerInput.includes('quickly')) {
      urgency = 'high';
    } else if (lowerInput.includes('whenever') || lowerInput.includes('no rush')) {
      urgency = 'low';
    }

    let detailLevel: IntentMetadata['detailLevel'] = 'medium';
    if (lowerInput.includes('detail') || lowerInput.includes('comprehensive') || lowerInput.includes('thorough')) {
      detailLevel = 'high';
    } else if (lowerInput.includes('brief') || lowerInput.includes('quick') || lowerInput.includes('tl;dr')) {
      detailLevel = 'low';
    }

    let interactionStyle: IntentMetadata['interactionStyle'] = 'friendly';
    if (lowerInput.includes('formal') || input.match(/^[A-Z]/)) {
      interactionStyle = 'formal';
    } else if (lowerInput.includes('code') || lowerInput.includes('technical')) {
      interactionStyle = 'technical';
    }

    return {
      userMood,
      urgency,
      detailLevel,
      interactionStyle,
    };
  }

  /**
   * Determine if clarification is needed
   */
  private static needsClarification(input: string, entities: ExtractedEntity[]): boolean {
    // Needs clarification if:
    // - Very short query without entities
    if (input.split(' ').length < 3 && entities.length === 0) return true;
    
    // - Ambiguous words without context
    if ((input.match(/\b(it|this|that|its)\b/gi) || []).length > 2 && entities.length === 0) return true;
    
    // - Missing key information for certain intents
    if ((input.includes('how') || input.includes('how to')) && !input.includes('?')) return true;

    return false;
  }

  /**
   * Generate appropriate clarification question
   */
  private static generateClarificationQuestion(intent: string, entities: ExtractedEntity[]): string {
    const languageEntity = entities.find(e => e.type === 'language');
    const difficultyEntity = entities.find(e => e.type === 'difficulty');

    if (!languageEntity) {
      return 'Which programming language would you like? (Python, JavaScript, TypeScript, Java, etc.)';
    }
    if (!difficultyEntity) {
      return 'What is your experience level? (Beginner, Intermediate, Advanced)';
    }
    if (intent === 'steps') {
      return 'Do you want: 1) High-level overview, 2) Detailed step-by-step, or 3) Code implementation?';
    }

    return 'Could you provide more details about what you\'re trying to accomplish?';
  }

  /**
   * Calculate confidence score for classification
   */
  private static calculateConfidence(normalized: string, detectedIntent: string): number {
    const keywords = this.INTENT_KEYWORDS[detectedIntent as keyof typeof this.INTENT_KEYWORDS];
    if (!keywords) return 0.5;

    const matches = keywords.reduce((acc, keyword) => {
      return acc + (normalized.includes(keyword) ? 1 : 0);
    }, 0);

    return Math.min(0.95, 0.4 + (matches * 0.15));
  }

  /**
   * Refine user query for better processing
   */
  private static refineQuery(input: string, intent: string, entities: ExtractedEntity[]): string {
    let refined = input;

    // Add context based on detected intent
    const languageEntity = entities.find(e => e.type === 'language');
    const difficultyEntity = entities.find(e => e.type === 'difficulty');

    if (intent === 'code_example' && languageEntity) {
      refined = `Provide a ${languageEntity.value} code example for: ${input}`;
    } else if (intent === 'steps') {
      refined = `Explain step-by-step how to: ${input}`;
    } else if (intent === 'simplification') {
      refined = `Explain this concept in simple terms for a ${difficultyEntity?.value || 'beginner'}: ${input}`;
    }

    return refined;
  }

  /**
   * Update session memory with current intent
   */
  private static updateSessionMemory(sessionId: string, result: IntentClassificationResult): void {
    const existing = this.sessionMemory.get(sessionId);
    
    const previousIntents = existing?.previousIntents || [];
    previousIntents.push(result);
    if (previousIntents.length > 10) previousIntents.shift(); // Keep last 10

    const topicsHistory = existing?.topicsHistory || [];
    result.entities.forEach(entity => {
      if (!topicsHistory.includes(entity.value)) {
        topicsHistory.push(entity.value);
      }
    });

    const contextualIntent: ContextualIntent = {
      currentIntent: result,
      previousIntents,
      relatedEntities: this.getRelatedEntities(result, existing),
      topicsHistory: topicsHistory.slice(-20), // Last 20 topics
      commonPatterns: this.detectPatterns(previousIntents),
      predictedNextIntent: this.predictNextIntent(previousIntents),
    };

    this.sessionMemory.set(sessionId, contextualIntent);
  }

  /**
   * Get related entities from previous context
   */
  private static getRelatedEntities(
    current: IntentClassificationResult,
    existing?: ContextualIntent
  ): ExtractedEntity[] {
    const related = [...current.entities];
    
    if (existing?.relatedEntities) {
      existing.relatedEntities.forEach(entity => {
        if (!related.find(e => e.value === entity.value)) {
          related.push(entity);
        }
      });
    }

    return related.slice(0, 15);
  }

  /**
   * Detect patterns in intent history
   */
  private static detectPatterns(intents: IntentClassificationResult[]): string[] {
    if (intents.length < 2) return [];

    const patterns: string[] = [];
    
    // Pattern: Progression from simplification to examples
    const hasSimplification = intents.some(i => i.primaryIntent === 'simplification');
    const hasCodeExample = intents.some(i => i.primaryIntent === 'code_example');
    if (hasSimplification && hasCodeExample) {
      patterns.push('simplification_to_code_flow');
    }

    // Pattern: Repeated questions about same topic
    const topicCounts: Record<string, number> = {};
    intents.forEach(i => {
      i.entities.forEach(e => {
        topicCounts[e.value] = (topicCounts[e.value] || 0) + 1;
      });
    });
    
    Object.entries(topicCounts).forEach(([topic, count]) => {
      if (count >= 2) {
        patterns.push(`repeated_interest_${topic}`);
      }
    });

    return patterns;
  }

  /**
   * Predict next likely intent
   */
  private static predictNextIntent(intents: IntentClassificationResult[]): string | undefined {
    if (intents.length < 2) return undefined;

    const lastIntent = intents[intents.length - 1];

    // Common sequences
    if (lastIntent.primaryIntent === 'teaching') {
      return 'likely_to_ask_for_code_example';
    }
    if (lastIntent.primaryIntent === 'simplification') {
      return 'likely_to_ask_for_detailed_explanation';
    }
    if (lastIntent.primaryIntent === 'steps') {
      return 'likely_to_ask_for_examples_or_clarification';
    }

    return undefined;
  }

  /**
   * Get session context for response generation
   */
  static getSessionContext(sessionId: string): ContextualIntent | undefined {
    return this.sessionMemory.get(sessionId);
  }

  /**
   * Clear session memory
   */
  static clearSession(sessionId: string): void {
    this.sessionMemory.delete(sessionId);
  }

  /**
   * Get all active sessions
   */
  static getActiveSessions(): string[] {
    return Array.from(this.sessionMemory.keys());
  }
}

export default IntentClassifier;
