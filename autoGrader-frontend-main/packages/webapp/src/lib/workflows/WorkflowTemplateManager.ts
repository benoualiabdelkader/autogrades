/**
 * Universal Workflow Template System
 * Provides boilerplate for creating new workflows with all quality enhancements
 * Ensures consistency, best practices, and AI integration across all workflows
 */

export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    version: '1.0';
    category: 'assessment' | 'review' | 'analysis' | 'feedback' | 'reporting';
    assignmentTypes: string[];
    nodes: WorkflowNode[];
    configuration: WorkflowConfiguration;
    aiIntegration: AIIntegrationConfig;
}

export interface WorkflowNode {
    id: string;
    name: string;
    type: string;
    position: { x: number; y: number };
    parameters: Record<string, unknown>;
    description: string;
}

export interface WorkflowConfiguration {
    autoRetry: boolean;
    timeoutSeconds: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    errorHandling: 'fail-fast' | 'continue-on-error' | 'collect-errors';
    dataValidation: boolean;
    outputFormat: 'json' | 'csv' | 'pdf' | 'mixed';
}

export interface AIIntegrationConfig {
    enabled: boolean;
    provider: 'groq' | 'openai' | 'anthropic';
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    dynamicPromptGeneration: boolean;
    rubricSystem: boolean;
    qualityMetrics: boolean;
}

export interface WorkflowTemplate {
    metadata: {
        createdAt: string;
        updatedAt: string;
        author: string;
        tags: string[];
        documentation: string;
    };
}

export class WorkflowTemplateManager {
    /**
     * Create a new assessment workflow with best practices
     */
    static createAssessmentWorkflow(
        workflowName: string,
        assignmentType: string,
        customConfiguration?: Partial<WorkflowConfiguration>
    ): WorkflowTemplate {
        return {
            id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: workflowName,
            description: `Automated assessment workflow for ${assignmentType} assignments`,
            version: '1.0',
            category: 'assessment',
            assignmentTypes: [assignmentType],
            
            nodes: [
                {
                    id: 'fetch-data',
                    name: 'Fetch Submission Data',
                    type: 'n8n-nodes-base.extensionData',
                    position: { x: 100, y: 100 },
                    parameters: {
                        operation: 'query',
                        dataSource: 'extension',
                        timeout: 30000,
                        retryOnFailure: true
                    },
                    description: 'Retrieve submission data from OnPage Scraper Extension'
                },
                {
                    id: 'validate-data',
                    name: 'Validate Submission Data',
                    type: 'n8n-nodes-base.code',
                    position: { x: 300, y: 100 },
                    parameters: {
                        language: 'javascript',
                        code: this.getDataValidationCode()
                    },
                    description: 'Validate data format and completeness'
                },
                {
                    id: 'analyze-submission',
                    name: 'Analyze Submission Content',
                    type: 'n8n-nodes-base.code',
                    position: { x: 500, y: 100 },
                    parameters: {
                        language: 'javascript',
                        code: this.getSubmissionAnalysisCode()
                    },
                    description: 'Analyze submission for structure, complexity, and characteristics'
                },
                {
                    id: 'generate-rubric',
                    name: 'Generate Evaluation Rubric',
                    type: 'n8n-nodes-base.code',
                    position: { x: 700, y: 100 },
                    parameters: {
                        language: 'javascript',
                        code: this.getRubricGenerationCode(assignmentType)
                    },
                    description: 'Generate appropriate rubric based on assignment type'
                },
                {
                    id: 'build-ai-prompt',
                    name: 'Build AI Evaluation Prompt',
                    type: 'n8n-nodes-base.code',
                    position: { x: 100, y: 300 },
                    parameters: {
                        language: 'javascript',
                        code: this.getPromptBuildingCode(assignmentType)
                    },
                    description: 'Generate contextual AI prompt with rubric and guidelines'
                },
                {
                    id: 'ai-grade',
                    name: 'AI Assessment',
                    type: 'n8n-nodes-base.httpRequest',
                    position: { x: 300, y: 300 },
                    parameters: {
                        url: '${GROQ_API_BASE_URL}/openai/v1/chat/completions',
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ${GROQ_API_KEY}',
                            'Content-Type': 'application/json'
                        },
                        bodyType: 'json',
                        body: this.getAIRequestBody(assignmentType)
                    },
                    description: 'Call Groq API for intelligent assessment'
                },
                {
                    id: 'process-assessment',
                    name: 'Process AI Assessment',
                    type: 'n8n-nodes-base.code',
                    position: { x: 500, y: 300 },
                    parameters: {
                        language: 'javascript',
                        code: this.getAssessmentProcessingCode()
                    },
                    description: 'Parse and structure AI assessment results'
                },
                {
                    id: 'apply-local-rules',
                    name: 'Apply Local Evaluation Rules',
                    type: 'n8n-nodes-base.code',
                    position: { x: 700, y: 300 },
                    parameters: {
                        language: 'javascript',
                        code: this.getLocalRulesApplicationCode(assignmentType)
                    },
                    description: 'Apply local rule-based evaluation for consistency'
                },
                {
                    id: 'generate-feedback',
                    name: 'Generate Structured Feedback',
                    type: 'n8n-nodes-base.code',
                    position: { x: 100, y: 500 },
                    parameters: {
                        language: 'javascript',
                        code: this.getFeedbackGenerationCode()
                    },
                    description: 'Structure feedback combining AI and rule-based results'
                },
                {
                    id: 'export-results',
                    name: 'Export Assessment Results',
                    type: 'n8n-nodes-base.code',
                    position: { x: 300, y: 500 },
                    parameters: {
                        language: 'javascript',
                        code: this.getExportCode()
                    },
                    description: 'Export results to CSV and prepare for delivery'
                }
            ],

            configuration: {
                autoRetry: true,
                timeoutSeconds: 120,
                logLevel: 'info',
                errorHandling: 'collect-errors',
                dataValidation: true,
                outputFormat: 'csv',
                ...customConfiguration
            },

            aiIntegration: {
                enabled: true,
                provider: 'groq',
                model: 'qwen2-32b',
                temperature: 0.7,
                maxTokens: 2000,
                systemPrompt: this.getSystemPrompt(assignmentType),
                dynamicPromptGeneration: true,
                rubricSystem: true,
                qualityMetrics: true
            },

            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                author: 'AutoGrader System',
                tags: ['assessment', assignmentType, 'automated'],
                documentation: `Automated ${assignmentType} assessment workflow with AI integration and local rule evaluation.
                Provides comprehensive grading with detailed feedback and structured output.`
            }
        } as unknown as WorkflowTemplate;
    }

    /**
     * Create a peer review workflow
     */
    static createPeerReviewWorkflow(
        workflowName: string,
        courseType: string
    ): WorkflowTemplate {
        const baseWorkflow = this.createAssessmentWorkflow(workflowName, 'peer-review');
        return {
            ...baseWorkflow,
            category: 'review',
            description: `Peer review workflow for ${courseType} courses`
        };
    }

    /**
     * Create an analytics workflow
     */
    static createAnalyticsWorkflow(
        workflowName: string,
        analyticsType: 'performance' | 'engagement' | 'progress'
    ): WorkflowTemplate {
        const baseWorkflow = this.createAssessmentWorkflow(workflowName, 'analytics');
        return {
            ...baseWorkflow,
            category: 'analysis',
            description: `Analytics workflow for ${analyticsType} tracking and reporting`
        };
    }

    /**
     * Get data validation code
     */
    private static getDataValidationCode(): string {
        return `
// Validate submission data structure and completeness
const validateSubmission = (data) => {
  const errors = [];
  
  // Check required fields
  if (!data.studentId) errors.push('Missing studentId');
  if (!data.assignmentId) errors.push('Missing assignmentId');
  if (!data.submissionContent) errors.push('Missing submissionContent');
  
  // Validate data types
  if (typeof data.studentId !== 'string') errors.push('studentId must be string');
  if (typeof data.submissionContent !== 'string') errors.push('submissionContent must be string');
  
  // Check content length
  if (data.submissionContent.trim().length === 0) {
    errors.push('Submission is empty');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: data,
    timestamp: new Date().toISOString()
  };
};

return items.map(item => ({
  json: validateSubmission(item.json)
}));`;
    }

    /**
     * Get submission analysis code
     */
    private static getSubmissionAnalysisCode(): string {
        return `
// Analyze submission characteristics for adaptive grading
const analyzeSubmission = (content) => {
  const wordCount = content.split(/\\s+/).length;
  const sentenceCount = content.split(/[.!?]+/).length;
  const paragraphCount = content.split(/\\n\\n+/).length;
  const avgWordsPerSentence = wordCount / sentenceCount || 0;
  
  // Detect complexity
  const hasAcademicLanguage = /therefore|furthermore|moreover|consequently/i.test(content);
  const hasCharacteristics = {
    lists: /[-*]\\s+\\w+|\\d+\\.\\s+\\w+/g.test(content),
    examples: /for example|e\\.g\\.|such as/i.test(content),
    citations: /\\([^)]*\\s+\\d{4}\\)|\\[\\d+\\]/g.test(content),
    questions: /\\?/g.test(content),
    emphasis: /\\*\\*|__/g.test(content)
  };
  
  const complexity = (wordCount > 200 && avgWordsPerSentence > 15) ? 'high' :
                     (wordCount > 100) ? 'medium' : 'low';
  
  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    averageWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    complexity,
    characteristics: hasCharacteristics,
    timestamp: new Date().toISOString()
  };
};

return items.map(item => ({
  json: {
    ...item.json,
    analysis: analyzeSubmission(item.json.submissionContent)
  }
}));`;
    }

    /**
     * Get rubric generation code
     */
    private static getRubricGenerationCode(assignmentType: string): string {
        return `
// Generate appropriate rubric based on assignment type
const getRubric = () => {
  const rubrics = {
    'essay': [
      { name: 'Thesis Clarity', weight: 20, maxScore: 100 },
      { name: 'Evidence & Support', weight: 25, maxScore: 100 },
      { name: 'Organization', weight: 20, maxScore: 100 },
      { name: 'Analysis & Depth', weight: 20, maxScore: 100 },
      { name: 'Writing Quality', weight: 15, maxScore: 100 }
    ],
    'project': [
      { name: 'Objective Achievement', weight: 25, maxScore: 100 },
      { name: 'Technical Execution', weight: 25, maxScore: 100 },
      { name: 'Creativity & Innovation', weight: 20, maxScore: 100 },
      { name: 'Documentation', weight: 20, maxScore: 100 },
      { name: 'Polish & Presentation', weight: 10, maxScore: 100 }
    ],
    'default': [
      { name: 'Content Quality', weight: 30, maxScore: 100 },
      { name: 'Completeness', weight: 25, maxScore: 100 },
      { name: 'Organization', weight: 20, maxScore: 100 },
      { name: 'Clarity', weight: 15, maxScore: 100 },
      { name: 'Professionalism', weight: 10, maxScore: 100 }
    ]
  };
  
  return rubrics['${assignmentType}'] || rubrics['default'];
};

return items.map(item => ({
  json: {
    ...item.json,
    rubric: getRubric()
  }
}));`;
    }

    /**
     * Get prompt building code
     */
    private static getPromptBuildingCode(assignmentType: string): string {
        return `
// Build comprehensive AI evaluation prompt
const buildPrompt = (data) => {
  const rubricText = data.rubric
    .map(c => \`- \${c.name} (\${c.weight}%): weight=\${c.weight}\`)
    .join('\\n');
  
  return \`You are an expert academic assessor evaluating student work using comprehensive rubrics.

ASSIGNMENT TYPE: ${assignmentType}
STUDENT: \${data.studentId}

EVALUATION RUBRIC:
\${rubricText}

SUBMISSION CONTENT:
\${data.submissionContent.substring(0, 3000)}

ANALYSIS CONTEXT:
- Word Count: \${data.analysis.wordCount}
- Complexity Level: \${data.analysis.complexity}
- Characteristics: \${JSON.stringify(data.analysis.characteristics)}

EVALUATION FRAMEWORK:
- Advanced (90-100): Exceptional work exceeding expectations
- Proficient (80-89): Strong understanding with minor gaps
- Developing (70-79): Adequate work with clear growth areas
- Beginning (60-69): Basic attempts with significant gaps
- Incomplete (0-59): Insufficient or missing components

REQUIRED OUTPUT (JSON ONLY):
{
  "overallGrade": <0-100>,
  "performanceLevel": <"advanced" | "proficient" | "developing" | "beginning" | "incomplete">,
  "completionPercentage": <0-100>,
  "criteria": [{"name": "<name>", "score": <0-100>, "feedback": "<feedback>"}],
  "strengths": [<strengths>],
  "improvements": [<improvements>],
  "detailedAnalysis": "<analysis>",
  "recommendedActions": [<actions>]
}\`;
};

return items.map(item => ({
  json: {
    ...item.json,
    aiPrompt: buildPrompt(item.json)
  }
}));`;
    }

    /**
     * Get AI request body
     */
    private static getAIRequestBody(assignmentType: string): string {
        return `{
  "model": "qwen2-32b",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert academic assessor providing comprehensive, fair, and constructive feedback."
    },
    {
      "role": "user",
      "content": "\${aiPrompt}"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}`;
    }

    /**
     * Get assessment processing code
     */
    private static getAssessmentProcessingCode(): string {
        return `
// Parse and structure AI assessment results
const processAssessment = (aiResponse) => {
  try {
    const content = aiResponse.choices[0].message.content;
    const assessment = JSON.parse(content);
    
    return {
      ...assessment,
      processedAt: new Date().toISOString(),
      valid: true
    };
  } catch (error) {
    return {
      error: 'Failed to parse AI assessment',
      details: error.message,
      processedAt: new Date().toISOString(),
      valid: false
    };
  }
};

return items.map(item => ({
  json: {
    ...item.json,
    assessment: processAssessment(item.json)
  }
}));`;
    }

    /**
     * Get local rules application code
     */
    private static getLocalRulesApplicationCode(assignmentType: string): string {
        return `
// Apply local evaluation rules for consistency
const applyLocalRules = (content, analysis) => {
  const rules = [];
  
  // Content length rule
  if (analysis.wordCount < 50) {
    rules.push({ rule: 'minimum_length', score: 30, message: 'Submission is too brief' });
  } else if (analysis.wordCount > 100) {
    rules.push({ rule: 'adequate_length', score: 80, message: 'Appropriate submission length' });
  }
  
  // Structure rule
  if (analysis.paragraphCount > 1) {
    rules.push({ rule: 'structure', score: 70, message: 'Good paragraph structure' });
  }
  
  // Examples rule
  if (analysis.characteristics.examples) {
    rules.push({ rule: 'examples', score: 85, message: 'Uses relevant examples' });
  }
  
  // Citations rule
  if (analysis.characteristics.citations) {
    rules.push({ rule: 'citations', score: 90, message: 'Includes proper citations' });
  }
  
  const averageLocalScore = rules.length > 0 
    ? Math.round(rules.reduce((sum, r) => sum + r.score, 0) / rules.length)
    : 50;
  
  return {
    rulesApplied: rules,
    averageLocalScore,
    criteria: \`${assignmentType}\`
  };
};

return items.map(item => ({
  json: {
    ...item.json,
    localEvaluation: applyLocalRules(item.json.submissionContent, item.json.analysis)
  }
}));`;
    }

    /**
     * Get feedback generation code
     */
    private static getFeedbackGenerationCode(): string {
        return `
// Generate structured feedback combining AI and rule-based results
const generateFeedback = (assessment, localEval) => {
  const finalGrade = Math.round(
    (assessment.overallGrade * 0.7 + localEval.averageLocalScore * 0.3)
  );
  
  return {
    grade: finalGrade,
    performanceLevel: assessment.performanceLevel,
    feedback: {
      strengths: assessment.strengths || [],
      improvements: assessment.improvements || [],
      analysis: assessment.detailedAnalysis || '',
      recommendations: assessment.recommendedActions || []
    },
    metadata: {
      aiScore: assessment.overallGrade,
      localScore: localEval.averageLocalScore,
      generatedAt: new Date().toISOString()
    }
  };
};

return items.map(item => ({
  json: {
    ...item.json,
    finalFeedback: generateFeedback(item.json.assessment, item.json.localEvaluation)
  }
}));`;
    }

    /**
     * Get export code
     */
    private static getExportCode(): string {
        return `
// Export assessment results to CSV format
const exportResults = (items) => {
  const headers = [
    'studentId', 'assignmentId', 'grade', 'performanceLevel',
    'strengths', 'improvements', 'recommendations', 'generatedAt'
  ];
  
  const rows = items.map(item => [
    item.json.studentId,
    item.json.assignmentId,
    item.json.finalFeedback.grade,
    item.json.finalFeedback.performanceLevel,
    (item.json.finalFeedback.feedback.strengths || []).join('; '),
    (item.json.finalFeedback.feedback.improvements || []).join('; '),
    (item.json.finalFeedback.feedback.recommendations || []).join('; '),
    item.json.finalFeedback.metadata.generatedAt
  ]);
  
  return {
    format: 'csv',
    headers,
    rows,
    recordCount: rows.length,
    exportedAt: new Date().toISOString()
  };
};

return items.map(item => ({
  json: exportResults([item.json])
}));`;
    }

    /**
     * Get system prompt for AI
     */
    private static getSystemPrompt(assignmentType: string): string {
        return `You are an expert academic assessor specializing in ${assignmentType} evaluation. 
Your role is to provide comprehensive, fair, and constructive feedback that helps students understand their strengths and areas for growth. 
You maintain high academic standards while being supportive and encouraging in your communication. 
Always provide specific, concrete feedback with exact references to the submission content. 
Balance recognition of strengths with actionable recommendations for improvement.`;
    }

    /**
     * Export workflow template as JSON
     */
    static exportWorkflowJSON(workflow: WorkflowTemplate): string {
        return JSON.stringify(workflow, null, 2);
    }

    /**
     * List all available template types
     */
    static getAvailableTemplates(): string[] {
        return [
            'assessment-essay',
            'assessment-project',
            'assessment-presentation',
            'assessment-practical',
            'assessment-discussion',
            'assessment-quiz',
            'assessment-code',
            'peer-review',
            'analytics-performance',
            'analytics-engagement',
            'analytics-progress'
        ];
    }
}
