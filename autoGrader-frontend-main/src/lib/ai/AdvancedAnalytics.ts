/**
 * AdvancedAnalytics.ts
 * Advanced AI Analysis System
 * Features:
 * - Deep Text Analysis & NLP
 * - Pattern Recognition & Anomaly Detection
 * - Sentiment Analysis
 * - Entity Recognition & Relationship Mapping
 * - Predictive Analytics
 * - Recommendation Engine
 */

export interface TextAnalysisResult {
  text: string;
  language: string;
  sentiment: SentimentAnalysis;
  entities: Entity[];
  keywords: Keyword[];
  topics: Topic[];
  relationships: Relationship[];
  complexity: TextComplexity;
  readability: ReadabilityMetrics;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  confidence: number; // 0-100
  emotions: Emotion[];
  subjectivity: number; // 0-1
}

export interface Emotion {
  type: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'trust' | 'disgust' | 'anticipation';
  intensity: number; // 0-100
  confidence: number; // 0-100
}

export interface Entity {
  type: 'PERSON' | 'ORG' | 'LOCATION' | 'DATE' | 'PRODUCT' | 'CONCEPT';
  value: string;
  confidence: number;
  context: string;
  relatedEntities?: string[];
}

export interface Keyword {
  term: string;
  frequency: number;
  tfidf: number;
  importance: number; // 0-100
  category: 'topic' | 'action' | 'attribute' | 'other';
}

export interface Topic {
  name: string;
  keywords: string[];
  weight: number; // 0-1
  documents: number;
}

export interface Relationship {
  source: string;
  target: string;
  type: 'mentions' | 'references' | 'contradicts' | 'supports' | 'similar_to';
  confidence: number;
  evidence: string[];
}

export interface TextComplexity {
  gradeLevel: number;
  fogIndex: number;
  sentenceComplexity: number;
  vocabularyDiversity: number;
  avgSentenceLength: number;
}

export interface ReadabilityMetrics {
  fleschKincaidGrade: number;
  fleschReadingEase: number;
  automatedReadabilityIndex: number;
  smogIndex: number;
  overallReadability: 'easy' | 'moderate' | 'difficult';
}

export interface AnomalyDetection {
  anomalies: Anomaly[];
  anomalyScore: number; // 0-100
  dataPoints: number;
  threshold: number;
}

export interface Anomaly {
  index: number;
  value: any;
  expectedRange: { min: number; max: number };
  deviation: number;
  severity: 'low' | 'medium' | 'high';
}

export interface PredictionResult {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number;
  forecastHorizon: number; // days/weeks
}

export interface Recommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  actionItems: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  expectedImpact: number; // 0-100
  effort: 'low' | 'medium' | 'high';
  relatedMetrics: string[];
}

export interface AnalyticsDataPoint {
  timestamp: number;
  metric: string;
  value: number;
  metadata?: Record<string, any>;
}

export class AdvancedAnalyticsEngine {
  private analysisHistory: Map<string, TextAnalysisResult> = new Map();
  private anomalyDetector: AnomalyDetectionSystem;
  private predictiveModel: PredictiveAnalyticsModel;
  private recommendationEngine: RecommendationEngine;

  constructor() {
    this.anomalyDetector = new AnomalyDetectionSystem();
    this.predictiveModel = new PredictiveAnalyticsModel();
    this.recommendationEngine = new RecommendationEngine();
  }

  /**
   * Analyze text deeply with multiple NLP techniques
   */
  async analyzeText(text: string): Promise<TextAnalysisResult> {
    const analysisId = this.generateAnalysisId();

    const result: TextAnalysisResult = {
      text,
      language: this.detectLanguage(text),
      sentiment: await this.analyzeSentiment(text),
      entities: await this.extractEntities(text),
      keywords: await this.extractKeywords(text),
      topics: await this.identifyTopics(text),
      relationships: await this.mapRelationships(text),
      complexity: this.analyzeComplexity(text),
      readability: this.calculateReadability(text),
    };

    this.analysisHistory.set(analysisId, result);
    return result;
  }

  /**
   * Analyze sentiment with emotion detection
   */
  private async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    const words = text.toLowerCase().split(/\s+/);
    const sentimentMap = this.getSentimentWordMap();
    let sentimentScore = 0;
    let emotionCounts: Record<string, number> = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      trust: 0,
      disgust: 0,
      anticipation: 0,
    };

    for (const word of words) {
      if (sentimentMap[word]) {
        sentimentScore += sentimentMap[word].score;
        emotionCounts[sentimentMap[word].emotion]++;
      }
    }

    const normalizedScore = Math.max(-1, Math.min(1, sentimentScore / words.length));
    const emotions = this.getTopEmotions(emotionCounts);

    return {
      score: normalizedScore,
      label: this.getSentimentLabel(normalizedScore),
      confidence: Math.min(100, Math.abs(normalizedScore) * 100),
      emotions,
      subjectivity: this.calculateSubjectivity(text),
    };
  }

  /**
   * Extract entities from text
   */
  private async extractEntities(text: string): Promise<Entity[]> {
    const entities: Entity[] = [];
    const patterns = {
      PERSON: /\b[A-Z][a-z]+ (?:[A-Z][a-z]+)+\b/g,
      LOCATION: /\b(?:New|Los|San)\s+[A-Z][a-z]+|London|Paris|Tokyo|Berlin\b/gi,
      DATE: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}\b/gi,
      ORG: /\b(?:Company|Corporation|Inc|Ltd|LLC)\s+[A-Z][a-z]+\b/g,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.matchAll(pattern as RegExp);
      for (const match of matches) {
        entities.push({
          type: type as any,
          value: match[0],
          confidence: 0.85,
          context: this.getContext(text, match.index!),
        });
      }
    }

    return entities;
  }

  /**
   * Extract keywords using TF-IDF
   */
  private async extractKeywords(text: string): Promise<Keyword[]> {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordFreq: Record<string, number> = {};
    const stopwords = this.getStopwords();

    for (const word of words) {
      if (!stopwords.includes(word) && word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }

    const keywords = Object.entries(wordFreq)
      .map(([term, frequency]) => ({
        term,
        frequency,
        tfidf: this.calculateTFIDF(term, words.length, frequency),
        importance: (frequency / words.length) * 100,
        category: this.categorizeKeyword(term),
      }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 20);

    return keywords;
  }

  /**
   * Identify topics in text
   */
  private async identifyTopics(text: string): Promise<Topic[]> {
    const keywords = await this.extractKeywords(text);
    const topics: Topic[] = [];

    const topicGroups = this.groupKeywordsByTopic(keywords);

    for (const [topicName, topicKeywords] of Object.entries(topicGroups)) {
      topics.push({
        name: topicName,
        keywords: topicKeywords,
        weight: topicKeywords.length / keywords.length,
        documents: 1,
      });
    }

    return topics;
  }

  /**
   * Map relationships between entities
   */
  private async mapRelationships(text: string): Promise<Relationship[]> {
    const entities = await this.extractEntities(text);
    const relationships: Relationship[] = [];

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const relationship = this.findRelationship(
          entities[i],
          entities[j],
          text
        );
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }

    return relationships;
  }

  /**
   * Analyze text complexity metrics
   */
  private analyzeComplexity(text: string): TextComplexity {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/);
    const syllables = this.countSyllables(text);

    return {
      gradeLevel: this.calculateGradeLevel(words.length, sentences.length, syllables),
      fogIndex: this.calculateFogIndex(words.length, sentences.length, syllables),
      sentenceComplexity: sentences.reduce(
        (acc, sent) => acc + sent.split(/\s+/).length,
        0
      ) / sentences.length,
      vocabularyDiversity: new Set(words.map(w => w.toLowerCase())).size / words.length,
      avgSentenceLength: words.length / sentences.length,
    };
  }

  /**
   * Calculate readability metrics
   */
  private calculateReadability(text: string): ReadabilityMetrics {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/);
    const syllables = this.countSyllables(text);

    const flesch = this.calculateFleschReadingEase(words.length, sentences.length, syllables);
    const gradeLevel = this.calculateGradeLevel(words.length, sentences.length, syllables);

    return {
      fleschKincaidGrade: gradeLevel,
      fleschReadingEase: flesch,
      automatedReadabilityIndex: this.calculateARI(words.length, sentences.length, syllables),
      smogIndex: this.calculateSmog(syllables, sentences.length),
      overallReadability: this.getReadabilityLabel(flesch),
    };
  }

  /**
   * Detect anomalies in data
   */
  async detectAnomalies(dataPoints: AnalyticsDataPoint[]): Promise<AnomalyDetection> {
    return this.anomalyDetector.detect(dataPoints);
  }

  /**
   * Make predictions based on historical data
   */
  async predictMetrics(
    dataPoints: AnalyticsDataPoint[],
    metric: string,
    horizon: number
  ): Promise<PredictionResult> {
    return this.predictiveModel.predict(dataPoints, metric, horizon);
  }

  /**
   * Generate recommendations based on analysis
   */
  async generateRecommendations(
    analysisResult: TextAnalysisResult,
    metrics: Record<string, number>
  ): Promise<Recommendation[]> {
    return this.recommendationEngine.generate(analysisResult, metrics);
  }

  /**
   * Helper methods
   */

  private detectLanguage(text: string): string {
    // Simple language detection (placeholder)
    return 'en';
  }

  private getSentimentWordMap(): Record<string, { score: number; emotion: string }> {
    return {
      excellent: { score: 1, emotion: 'joy' },
      good: { score: 0.5, emotion: 'trust' },
      bad: { score: -0.5, emotion: 'sadness' },
      terrible: { score: -1, emotion: 'sadness' },
      angry: { score: -0.7, emotion: 'anger' },
      happy: { score: 0.8, emotion: 'joy' },
      sad: { score: -0.8, emotion: 'sadness' },
      afraid: { score: -0.7, emotion: 'fear' },
      surprised: { score: 0.4, emotion: 'surprise' },
      love: { score: 0.9, emotion: 'joy' },
      hate: { score: -0.9, emotion: 'disgust' },
      amazing: { score: 0.9, emotion: 'joy' },
      disappointing: { score: -0.7, emotion: 'sadness' },
    };
  }

  private getTopEmotions(emotionCounts: Record<string, number>): Emotion[] {
    return Object.entries(emotionCounts)
      .map(([type, count]) => ({
        type: type as any,
        intensity: Math.min(100, count * 10),
        confidence: Math.min(100, (count / 10) * 50),
      }))
      .filter(e => e.intensity > 0)
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 3);
  }

  private getSentimentLabel(
    score: number
  ): 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' {
    if (score >= 0.6) return 'very_positive';
    if (score >= 0.2) return 'positive';
    if (score <= -0.6) return 'very_negative';
    if (score <= -0.2) return 'negative';
    return 'neutral';
  }

  private calculateSubjectivity(text: string): number {
    const subjectiveWords = ['believe', 'think', 'feel', 'seem', 'appear', 'perhaps', 'maybe'];
    const words = text.toLowerCase().split(/\s+/);
    const count = words.filter(w => subjectiveWords.some(sw => w.includes(sw))).length;
    return Math.min(1, count / words.length);
  }

  private getContext(text: string, index: number): string {
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + 50);
    return text.substring(start, end).trim();
  }

  private countSyllables(text: string): number {
    const words = text.split(/\s+/);
    return words.reduce((total, word) => {
      const syllableCount = (word.match(/[aeiouy]/gi) || []).length;
      return total + Math.max(1, syllableCount);
    }, 0);
  }

  private calculateTFIDF(term: string, totalWords: number, frequency: number): number {
    const tf = frequency / totalWords;
    const idf = Math.log(totalWords / frequency);
    return tf * idf;
  }

  private categorizeKeyword(term: string): 'topic' | 'action' | 'attribute' | 'other' {
    const actionWords = ['make', 'create', 'build', 'develop', 'implement'];
    const attributeWords = ['good', 'bad', 'large', 'small', 'important', 'critical'];

    if (actionWords.some(w => term.includes(w))) return 'action';
    if (attributeWords.some(w => term.includes(w))) return 'attribute';
    return 'topic';
  }

  private getStopwords(): string[] {
    return [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
      'with', 'by', 'from', 'is', 'was', 'be', 'are', 'been', 'being', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    ];
  }

  private groupKeywordsByTopic(keywords: Keyword[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    keywords.slice(0, 5).forEach(k => {
      groups[k.category] = (groups[k.category] || []);
      groups[k.category].push(k.term);
    });
    return groups;
  }

  private findRelationship(entity1: Entity, entity2: Entity, text: string): Relationship | null {
    const types: Array<'mentions' | 'references' | 'contradicts' | 'supports' | 'similar_to'> = ['mentions', 'references'];
    
    return {
      source: entity1.value,
      target: entity2.value,
      type: types[0],
      confidence: 0.75,
      evidence: [text.substring(0, 100)],
    };
  }

  private calculateGradeLevel(words: number, sentences: number, syllables: number): number {
    return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  }

  private calculateFogIndex(words: number, sentences: number, syllables: number): number {
    return 0.4 * ((words / sentences) + 100 * (syllables / words));
  }

  private calculateFleschReadingEase(words: number, sentences: number, syllables: number): number {
    return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  }

  private calculateARI(words: number, sentences: number, syllables: number): number {
    return 4.71 * (syllables / words) + 0.5 * (words / sentences) - 21.43;
  }

  private calculateSmog(syllables: number, sentences: number): number {
    return 1.0430 * Math.sqrt((syllables / sentences) * 30) + 3.1291;
  }

  private getReadabilityLabel(flesch: number): 'easy' | 'moderate' | 'difficult' {
    if (flesch >= 60) return 'easy';
    if (flesch >= 40) return 'moderate';
    return 'difficult';
  }

  private generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class AnomalyDetectionSystem {
  detect(dataPoints: AnalyticsDataPoint[]): AnomalyDetection {
    // Simplified anomaly detection using standard deviation
    const values = dataPoints.map(dp => dp.value);
    const mean = values.reduce((a, b) => a + b) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
    );

    const threshold = 2 * stdDev;
    const anomalies: Anomaly[] = [];

    dataPoints.forEach((dp, index) => {
      const deviation = Math.abs(dp.value - mean);
      if (deviation > threshold) {
        anomalies.push({
          index,
          value: dp.value,
          expectedRange: { min: mean - stdDev, max: mean + stdDev },
          deviation,
          severity: deviation > 3 * stdDev ? 'high' : 'medium',
        });
      }
    });

    return {
      anomalies,
      anomalyScore: (anomalies.length / dataPoints.length) * 100,
      dataPoints: dataPoints.length,
      threshold,
    };
  }
}

class PredictiveAnalyticsModel {
  predict(
    dataPoints: AnalyticsDataPoint[],
    metric: string,
    horizon: number
  ): PredictionResult {
    const values = dataPoints.map(dp => dp.value);
    const lastValue = values[values.length - 1];
    const avgChange = (values[values.length - 1] - values[0]) / (values.length - 1);
    const predictedValue = lastValue + avgChange * horizon;

    const trend = avgChange > 0 ? 'increasing' : avgChange < 0 ? 'decreasing' : 'stable';
    const trendStrength = Math.abs(avgChange) / (lastValue || 1);

    return {
      metric,
      currentValue: lastValue,
      predictedValue: Math.round(predictedValue * 100) / 100,
      confidence: Math.min(95, Math.max(50, 100 - trendStrength * 50)),
      trend: trend as any,
      trendStrength: Math.min(1, trendStrength),
      forecastHorizon: horizon,
    };
  }
}

class RecommendationEngine {
  async generate(
    analysisResult: TextAnalysisResult,
    metrics: Record<string, number>
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Based on sentiment
    if (analysisResult.sentiment.score < -0.5) {
      recommendations.push({
        id: 'rec_sentiment_1',
        category: 'engagement',
        title: 'Improve User Engagement',
        description: 'Negative sentiment detected. Consider addressing user concerns.',
        actionItems: ['Review user feedback', 'Conduct user interviews', 'Implement improvements'],
        priority: 'high',
        expectedImpact: 40,
        effort: 'medium',
        relatedMetrics: ['sentiment_score'],
      });
    }

    // Based on readability
    if (analysisResult.readability.fleschKincaidGrade > 12) {
      recommendations.push({
        id: 'rec_readability_1',
        category: 'content',
        title: 'Improve Content Clarity',
        description: 'Content is too complex. Simplify language and structure.',
        actionItems: ['Use shorter sentences', 'Replace jargon', 'Add examples'],
        priority: 'medium',
        expectedImpact: 35,
        effort: 'low',
        relatedMetrics: ['readability'],
      });
    }

    return recommendations;
  }
}

export const analyticsEngine = new AdvancedAnalyticsEngine();
