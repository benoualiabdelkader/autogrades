/**
 * ResponseBuilder.ts
 * Intelligent Response Generation System
 * Creates natural, interactive, multi-level responses
 * Supports: TL;DR + Explanation + Example + Follow-up
 * Adaptive personality and emotion-aware responses
 */

import { IntentClassificationResult } from './IntentClassifier';
import { ContextSummary } from './ContextManager';

export interface ResponseTemplate {
  type: 'tldr' | 'explanation' | 'example' | 'steps' | 'advice' | 'query_response';
  structure: ResponseSection[];
  personality: ResponsePersonality;
}

export interface ResponseSection {
  heading?: string;
  content: string;
  format: 'text' | 'code' | 'bullet_points' | 'numbered_list' | 'diagram';
  priority: 'high' | 'medium' | 'low';
}

export interface ResponsePersonality {
  tone: 'formal' | 'casual' | 'friendly' | 'technical';
  emotionalAwareness: boolean;
  includeEmojis: boolean;
  greetingStyle: 'formal' | 'casual' | 'technical';
}

export interface StructuredResponse {
  tldr: string;
  explanation: string;
  example?: string;
  followUpQuestion: string;
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  estimatedReadTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  requiresCode: boolean;
  relatedTopics: string[];
  confidence: number;
}

export interface AdaptivePromptConfig {
  intent: string;
  entities: string[];
  contextSummary: ContextSummary;
  userMood: 'neutral' | 'frustrated' | 'excited' | 'confused' | 'formal';
  detailLevel: 'high' | 'medium' | 'low';
  interactionStyle: 'formal' | 'friendly' | 'technical' | 'casual';
}

export class ResponseBuilder {
  private static readonly TEMPLATES: Record<string, ResponseTemplate> = {
    teaching: {
      type: 'explanation',
      structure: [
        { heading: 'Overview', content: '', format: 'text', priority: 'high' },
        { heading: 'Key Concepts', content: '', format: 'bullet_points', priority: 'high' },
        { heading: 'How It Works', content: '', format: 'text', priority: 'medium' },
      ],
      personality: { tone: 'friendly', emotionalAwareness: true, includeEmojis: false, greetingStyle: 'formal' },
    },
    code_example: {
      type: 'example',
      structure: [
        { heading: 'Quick Explanation', content: '', format: 'text', priority: 'medium' },
        { heading: 'Code Example', content: '', format: 'code', priority: 'high' },
        { heading: 'Explanation', content: '', format: 'text', priority: 'medium' },
      ],
      personality: { tone: 'technical', emotionalAwareness: false, includeEmojis: false, greetingStyle: 'formal' },
    },
    steps: {
      type: 'steps',
      structure: [
        { heading: 'Overview', content: '', format: 'text', priority: 'medium' },
        { heading: 'Steps', content: '', format: 'numbered_list', priority: 'high' },
        { heading: 'Tips', content: '', format: 'bullet_points', priority: 'medium' },
      ],
      personality: { tone: 'friendly', emotionalAwareness: true, includeEmojis: true, greetingStyle: 'casual' },
    },
    simplification: {
      type: 'explanation',
      structure: [
        { heading: 'Simple Explanation', content: '', format: 'text', priority: 'high' },
        { heading: 'Analogy', content: '', format: 'text', priority: 'high' },
        { heading: 'Real Example', content: '', format: 'text', priority: 'medium' },
      ],
      personality: { tone: 'casual', emotionalAwareness: true, includeEmojis: true, greetingStyle: 'casual' },
    },
    advice: {
      type: 'advice',
      structure: [
        { heading: 'Recommendation', content: '', format: 'text', priority: 'high' },
        { heading: 'Why This Approach', content: '', format: 'text', priority: 'high' },
        { heading: 'Alternative Approaches', content: '', format: 'bullet_points', priority: 'medium' },
      ],
      personality: { tone: 'technical', emotionalAwareness: true, includeEmojis: false, greetingStyle: 'formal' },
    },
  };

  private static readonly EMOTION_RESPONSES = {
    frustrated: {
      opening: "I understand this can be tricky 😌 ",
      tone: 'supportive',
    },
    excited: {
      opening: "Great! I love your enthusiasm! 🚀 ",
      tone: 'energetic',
    },
    confused: {
      opening: "No worries! Let me break this down clearly 👇 ",
      tone: 'patient',
    },
    neutral: {
      opening: "Here's what you need to know: ",
      tone: 'neutral',
    },
    formal: {
      opening: "Regarding your inquiry, ",
      tone: 'professional',
    },
  };

  /**
   * Build complete structured response
   */
  static buildStructuredResponse(
    userQuery: string,
    intent: IntentClassificationResult,
    contextSummary: ContextSummary,
    config: AdaptivePromptConfig
  ): StructuredResponse {
    const template = this.getTemplate(intent.primaryIntent);
    const personality = this.adaptPersonality(intent, config);

    // Generate TLDR
    const tldr = this.generateTLDR(userQuery, intent, config);

    // Generate explanation
    const explanation = this.generateExplanation(
      userQuery,
      intent,
      contextSummary,
      personality,
      config
    );

    // Generate example if applicable
    const example = intent.primaryIntent === 'code_example' || config.detailLevel === 'high'
      ? this.generateExample(userQuery, intent, contextSummary)
      : undefined;

    // Generate follow-up question
    const followUpQuestion = this.generateFollowUpQuestion(
      intent,
      contextSummary,
      config.interactionStyle
    );

    // Calculate metadata
    const metadata = this.calculateMetadata(
      tldr,
      explanation,
      example,
      intent,
      config
    );

    return {
      tldr,
      explanation,
      example,
      followUpQuestion,
      metadata,
    };
  }

  /**
   * Generate TLDR (Too Long; Didn't Read) summary
   */
  private static generateTLDR(
    userQuery: string,
    intent: IntentClassificationResult,
    config: AdaptivePromptConfig
  ): string {
    const directAnswers: Record<string, string> = {
      'what is': 'a concept or tool used for',
      'how to': 'you can accomplish this by',
      'why': 'because it provides',
      'when': 'this is useful when',
    };

    let tldr = 'In short: ';

    for (const [pattern, answer] of Object.entries(directAnswers)) {
      if (userQuery.toLowerCase().includes(pattern)) {
        tldr += answer;
        return tldr;
      }
    }

    // Default TLDR based on intent
    switch (intent.primaryIntent) {
      case 'teaching':
        tldr += 'key concepts and understanding';
        break;
      case 'code_example':
        tldr += 'practical code you can use';
        break;
      case 'simplification':
        tldr += 'a simple explanation';
        break;
      case 'steps':
        tldr += 'a step-by-step process';
        break;
      case 'advice':
        tldr += 'best practices and recommendations';
        break;
      default:
        tldr += 'the information you need';
    }

    return tldr;
  }

  /**
   * Generate detailed explanation
   */
  private static generateExplanation(
    userQuery: string,
    intent: IntentClassificationResult,
    contextSummary: ContextSummary,
    personality: ResponsePersonality,
    config: AdaptivePromptConfig
  ): string {
    let explanation = '';

    // Add emotional awareness opening
    const emotionResponse = this.EMOTION_RESPONSES[config.userMood];
    if (config.userMood !== 'neutral') {
      explanation += emotionResponse.opening;
    }

    // Adapt explanation depth based on detail level
    const depth = config.detailLevel === 'high'
      ? 'comprehensive'
      : config.detailLevel === 'low'
      ? 'brief'
      : 'moderate';

    // Build context-aware explanation
    if (contextSummary.keyEntities.length > 0) {
      explanation += `Based on what we've discussed about ${contextSummary.keyEntities.join(' and ')}, `;
    }

    // Add intent-specific explanation structure
    switch (intent.primaryIntent) {
      case 'teaching':
        explanation += this.buildTeachingExplanation(userQuery, intent, depth);
        break;
      case 'simplification':
        explanation += this.buildSimpleExplanation(userQuery, intent);
        break;
      case 'steps':
        explanation += this.buildStepsExplanation(userQuery, intent);
        break;
      case 'code_example':
        explanation += this.buildCodeExplanation(userQuery, intent);
        break;
      case 'advice':
        explanation += this.buildAdviceExplanation(userQuery, intent);
        break;
      default:
        explanation += this.buildGeneralExplanation(userQuery, intent);
    }

    // Add context-aware continuation
    if (contextSummary.missingContext.length > 0) {
      explanation += `\n\nTo give you an even better answer, could you clarify your experience level or preferred programming language?`;
    }

    return explanation;
  }

  /**
   * Build teaching-style explanation
   */
  private static buildTeachingExplanation(
    userQuery: string,
    intent: IntentClassificationResult,
    depth: string
  ): string {
    const explanations: Record<string, string> = {};
    
    if (depth === 'comprehensive') {
      return `I'll explain this in detail. First, understand that this concept is fundamental because it...`;
    } else if (depth === 'brief') {
      return `Simply put: this works by...`;
    } else {
      return `Here are the main ideas: this concept helps by...`;
    }
  }

  /**
   * Build simple explanation (ELI5 style)
   */
  private static buildSimpleExplanation(
    userQuery: string,
    intent: IntentClassificationResult
  ): string {
    return `Imagine... [use an analogy]. In programming terms, this means...`;
  }

  /**
   * Build step-by-step explanation
   */
  private static buildStepsExplanation(
    userQuery: string,
    intent: IntentClassificationResult
  ): string {
    return `Here are the steps:\n1. Start by...\n2. Then you need to...\n3. Finally...`;
  }

  /**
   * Build code-focused explanation
   */
  private static buildCodeExplanation(
    userQuery: string,
    intent: IntentClassificationResult
  ): string {
    const lang = intent.entities.find(e => e.type === 'language')?.value || 'Python';
    return `Here's how you do it in ${lang}. The key parts are...`;
  }

  /**
   * Build advice-style explanation
   */
  private static buildAdviceExplanation(
    userQuery: string,
    intent: IntentClassificationResult
  ): string {
    return `Based on best practices, the recommended approach is... The main advantages are...`;
  }

  /**
   * Build general explanation
   */
  private static buildGeneralExplanation(
    userQuery: string,
    intent: IntentClassificationResult
  ): string {
    return `To answer your question: `;
  }

  /**
   * Generate example
   */
  private static generateExample(
    userQuery: string,
    intent: IntentClassificationResult,
    contextSummary: ContextSummary
  ): string {
    const lang = intent.entities.find(e => e.type === 'language')?.value || 'Python';
    
    return `\n\n📝 Example (${lang}):\n\`\`\`${lang.toLowerCase()}\n# Example code here\nfunction example() {\n  // Implementation\n}\n\`\`\``;
  }

  /**
   * Generate follow-up question
   */
  private static generateFollowUpQuestion(
    intent: IntentClassificationResult,
    contextSummary: ContextSummary,
    style: string
  ): string {
    const questions: Record<string, string[]> = {
      teaching: [
        "Would you like to see a practical example?",
        "Any specific use case you're interested in?",
        "Should we dive deeper into any particular aspect?",
      ],
      code_example: [
        "Do you want to modify this example for a different use case?",
        "Need help understanding any particular line?",
        "Want to see variations of this approach?",
      ],
      simplification: [
        "Does this make sense now?",
        "Would you like me to explain it differently?",
        "Any part that still seems unclear?",
      ],
      steps: [
        "Want more detail on any specific step?",
        "Ready to try implementing this?",
        "Have questions about any step?",
      ],
      advice: [
        "Would you like to explore alternative approaches?",
        "Any concerns about this recommendation?",
        "Want to discuss trade-offs?",
      ],
      query: [
        "Does this answer your question?",
        "Want to know more about anything?",
        "Any follow-up questions?",
      ],
    };

    const typeQuestions = questions[intent.primaryIntent] || questions['query'];
    
    if (style === 'casual' || style === 'friendly') {
      return typeQuestions[Math.floor(Math.random() * typeQuestions.length)];
    } else {
      return typeQuestions[0];
    }
  }

  /**
   * Get template for intent
   */
  private static getTemplate(intent: string): ResponseTemplate {
    return this.TEMPLATES[intent] || this.TEMPLATES['query_response'] || {
      type: 'query_response',
      structure: [
        { heading: 'Answer', content: '', format: 'text', priority: 'high' },
      ],
      personality: { tone: 'friendly', emotionalAwareness: true, includeEmojis: false, greetingStyle: 'casual' },
    };
  }

  /**
   * Adapt personality based on user context
   */
  private static adaptPersonality(
    intent: IntentClassificationResult,
    config: AdaptivePromptConfig
  ): ResponsePersonality {
    return {
      tone: config.interactionStyle as any,
      emotionalAwareness: config.userMood !== 'neutral',
      includeEmojis: config.interactionStyle === 'casual' || config.interactionStyle === 'friendly',
      greetingStyle: config.interactionStyle === 'formal' ? 'formal' : 'casual',
    };
  }

  /**
   * Calculate response metadata
   */
  private static calculateMetadata(
    tldr: string,
    explanation: string,
    example: string | undefined,
    intent: IntentClassificationResult,
    config: AdaptivePromptConfig
  ): ResponseMetadata {
    const totalLength = tldr.length + explanation.length + (example?.length || 0);
    const estimatedReadTime = Math.ceil(totalLength / 200); // Assume 200 chars per minute

    return {
      estimatedReadTime,
      difficulty: this.calculateDifficulty(intent, config),
      requiresCode: !!example || intent.primaryIntent === 'code_example',
      relatedTopics: intent.entities.map(e => e.value),
      confidence: intent.confidence,
    };
  }

  /**
   * Calculate difficulty level
   */
  private static calculateDifficulty(
    intent: IntentClassificationResult,
    config: AdaptivePromptConfig
  ): 'beginner' | 'intermediate' | 'advanced' {
    let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';

    if (intent.primaryIntent === 'simplification') {
      difficulty = 'beginner';
    } else if (intent.primaryIntent === 'code_example' && config.detailLevel === 'high') {
      difficulty = 'advanced';
    }

    return difficulty;
  }

  /**
   * Build adaptive prompt for LLM based on all context
   */
  static buildAdaptivePrompt(
    userQuery: string,
    intent: IntentClassificationResult,
    contextSummary: ContextSummary,
    config: AdaptivePromptConfig
  ): string {
    let prompt = '';

    // System role based on intent
    prompt += `You are an expert helpful assistant providing ${intent.primaryIntent} responses.`;
    prompt += `\nUser mood: ${config.userMood}, preferred style: ${config.interactionStyle}.`;

    // Detail level instruction
    if (config.detailLevel === 'high') {
      prompt += `\nProvide a comprehensive, detailed response with multiple perspectives.`;
    } else if (config.detailLevel === 'low') {
      prompt += `\nProvide a brief, concise response - keep it under 100 words.`;
    } else {
      prompt += `\nProvide a balanced response with good detail.`;
    }

    // Context instruction
    if (contextSummary.keyEntities.length > 0) {
      prompt += `\nContext: We've been discussing ${contextSummary.keyEntities.join(', ')}.`;
    }

    // Format instruction
    prompt += `\n\nFormatting:`;
    prompt += `\n- Start with TL;DR`;
    prompt += `\n- Then provide explanation`;
    if (intent.primaryIntent === 'code_example') {
      prompt += `\n- Include code example in ${intent.entities.find(e => e.type === 'language')?.value || 'your preferred language'}`;
    }
    prompt += `\n- End with a follow-up question`;

    // Quality guidelines
    prompt += `\n\nQuality Guidelines:`;
    prompt += `\n- Be accurate and concise`;
    prompt += `\n- Use analogies when explaining complex concepts`;
    prompt += `\n- Adapt your tone to ${config.interactionStyle}`;
    
    if (config.userMood === 'frustrated') {
      prompt += `\n- Be empathetic and supportive`;
    } else if (config.userMood === 'excited') {
      prompt += `\n- Match the enthusiasm`;
    }

    prompt += `\n\nUser Query: ${userQuery}`;

    return prompt;
  }

  /**
   * Apply self-correction to response
   */
  static applySelfCorrection(response: string): string {
    // Check for common issues
    let corrected = response;

    // Fix: Multiple TLDR
    if ((corrected.match(/TL;DR/g) || []).length > 1) {
      corrected = corrected.replace(/^TL;DR:? */gm, '');
      corrected = 'TL;DR: ' + corrected;
    }

    // Fix: Code blocks without language specified
    corrected = corrected.replace(/```\n/g, '```javascript\n');

    // Fix: Missing punctuation
    if (!corrected.trim().endsWith('.') && !corrected.trim().endsWith('?') && !corrected.trim().endsWith('!')) {
      corrected = corrected.trim() + '.';
    }

    return corrected;
  }
}

export default ResponseBuilder;
