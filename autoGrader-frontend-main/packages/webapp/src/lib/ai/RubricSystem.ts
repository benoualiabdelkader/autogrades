/**
 * Advanced Rubric System for Universal Workflow Grading
 * Provides intelligent rubric generation and evaluation framework
 * Works across all workflow types with adaptive AI assistance
 */

export interface RubricCriteria {
    id: string;
    name: string;
    description: string;
    weight: number; // Percentage weight (0-100)
    maxScore: number; // Maximum achievable score
    indicators: PerformanceIndicator[];
}

export interface PerformanceIndicator {
    level: 'advanced' | 'proficient' | 'developing' | 'beginning' | 'incomplete';
    score: number; // 0-100
    description: string;
    examples: string[];
}

export interface RubricEvaluation {
    criteriaId: string;
    criteriaName: string;
    score: number;
    performanceLevel: string;
    evidence: string;
    feedback: string;
}

export interface ComprehensiveGradingResult {
    overallGrade: number; // 0-100
    performanceLevel: 'advanced' | 'proficient' | 'developing' | 'beginning' | 'incomplete';
    completionPercentage: number;
    evaluationDetails: RubricEvaluation[];
    strengths: string[];
    areasForImprovement: string[];
    recommendedActions: string[];
    detailedAnalysis: string;
    submissions: {
        content: string;
        length: number;
        complexity: 'low' | 'medium' | 'high';
    };
}

export class RubricSystem {
    /**
     * Generate dynamic rubric based on assignment type
     */
    static generateRubric(
        assignmentType: 'essay' | 'project' | 'presentation' | 'practical' | 'discussion' | 'quiz' | 'custom',
        courseLevel: 'introductory' | 'intermediate' | 'advanced' = 'intermediate',
        customCriteria?: Partial<RubricCriteria>[]
    ): RubricCriteria[] {
        const baseRubrics = {
            essay: this.essayRubric(),
            project: this.projectRubric(),
            presentation: this.presentationRubric(),
            practical: this.practicalRubric(),
            discussion: this.discussionRubric(),
            quiz: this.quizRubric(),
            custom: this.customRubric()
        };

        let rubric = baseRubrics[assignmentType] || baseRubrics.custom;

        // Adjust weights based on course level
        if (courseLevel === 'advanced') {
            rubric = rubric.map(c => ({
                ...c,
                weight: c.id === 'depth' ? c.weight + 10 : c.weight === 25 ? c.weight - 5 : c.weight
            }));
        } else if (courseLevel === 'introductory') {
            rubric = rubric.map(c => ({
                ...c,
                weight: c.id === 'clarity' ? c.weight + 10 : c.weight === 25 ? c.weight - 5 : c.weight
            }));
        }

        // Merge custom criteria if provided
        if (customCriteria && customCriteria.length > 0) {
            rubric = [...rubric, ...customCriteria.map(c => ({
                id: c.id || `custom_${Date.now()}`,
                name: c.name || 'Custom Criterion',
                description: c.description || '',
                weight: c.weight || 10,
                maxScore: c.maxScore || 100,
                indicators: c.indicators || this.defaultIndicators()
            }))];
        }

        // Normalize weights to sum to 100
        const totalWeight = rubric.reduce((sum, c) => sum + c.weight, 0);
        return rubric.map(c => ({
            ...c,
            weight: Math.round((c.weight / totalWeight) * 100)
        }));
    }

    /**
     * Essay-specific rubric
     */
    private static essayRubric(): RubricCriteria[] {
        return [
            {
                id: 'thesis-clarity',
                name: 'Thesis Clarity & Focus',
                description: 'Clear, specific thesis statement that guides the essay',
                weight: 20,
                maxScore: 100,
                indicators: [
                    {
                        level: 'advanced',
                        score: 90,
                        description: 'Exceptional thesis that is clear, specific, and arguable',
                        examples: ['Compelling argument statement', 'Sets up logical framework']
                    },
                    {
                        level: 'proficient',
                        score: 80,
                        description: 'Clear thesis that is mostly specific and serves as essay guide',
                        examples: ['Well-defined main idea', 'Directly addresses prompt']
                    },
                    {
                        level: 'developing',
                        score: 70,
                        description: 'Somewhat clear thesis but may lack specificity or focus',
                        examples: ['General main idea present', 'Could be more precise']
                    },
                    {
                        level: 'beginning',
                        score: 55,
                        description: 'Thesis present but unclear, vague, or unfocused',
                        examples: ['Broad statement', 'Lacks clear direction']
                    },
                    {
                        level: 'incomplete',
                        score: 0,
                        description: 'No clear thesis statement',
                        examples: ['Missing main argument']
                    }
                ]
            },
            {
                id: 'evidence-support',
                name: 'Evidence & Support',
                description: 'Use of relevant, credible evidence to support claims',
                weight: 25,
                maxScore: 100,
                indicators: [
                    {
                        level: 'advanced',
                        score: 90,
                        description: 'Abundant, specific, relevant evidence from credible sources',
                        examples: ['Peer-reviewed citations', 'Primary sources', 'Specific examples']
                    },
                    {
                        level: 'proficient',
                        score: 80,
                        description: 'Good selection of relevant evidence with proper attribution',
                        examples: ['Multiple credible sources', 'Well-integrated quotes']
                    },
                    {
                        level: 'developing',
                        score: 70,
                        description: 'Some evidence present but may be general or lacking attribution',
                        examples: ['Basic examples', 'Limited sources']
                    },
                    {
                        level: 'beginning',
                        score: 55,
                        description: 'Minimal evidence or evidence that is vague/unsupported',
                        examples: ['Few examples', 'Unsourced claims']
                    },
                    {
                        level: 'incomplete',
                        score: 0,
                        description: 'Little or no evidence provided',
                        examples: ['Unsubstantiated claims']
                    }
                ]
            },
            {
                id: 'organization',
                name: 'Organization & Structure',
                description: 'Logical, coherent organization with smooth transitions',
                weight: 20,
                maxScore: 100,
                indicators: [
                    {
                        level: 'advanced',
                        score: 90,
                        description: 'Excellent organization with clear introduction, body, conclusion',
                        examples: ['Smooth transitions', 'Logical progression', 'Compelling narrative']
                    },
                    {
                        level: 'proficient',
                        score: 80,
                        description: 'Clear organization with introduction, body, conclusion',
                        examples: ['Good structure', 'Clear paragraphs']
                    },
                    {
                        level: 'developing',
                        score: 70,
                        description: 'Organization present but may have some unclear connections',
                        examples: ['Weak transitions', 'Somewhat unclear flow']
                    },
                    {
                        level: 'beginning',
                        score: 55,
                        description: 'Weak organization with unclear connections between ideas',
                        examples: ['Poor transitions', 'Confusing structure']
                    },
                    {
                        level: 'incomplete',
                        score: 0,
                        description: 'Disorganized or incoherent structure',
                        examples: ['No clear structure']
                    }
                ]
            },
            {
                id: 'analysis-depth',
                name: 'Critical Analysis & Depth',
                description: 'Deep analysis and sophisticated thinking beyond surface level',
                weight: 20,
                maxScore: 100,
                indicators: [
                    {
                        level: 'advanced',
                        score: 90,
                        description: 'Sophisticated analysis with nuanced understanding',
                        examples: ['Multiple perspectives', 'Recognizes complexity', 'Original insights']
                    },
                    {
                        level: 'proficient',
                        score: 80,
                        description: 'Good analysis with clear interpretation of evidence',
                        examples: ['Thoughtful examination', 'Clear reasoning']
                    },
                    {
                        level: 'developing',
                        score: 70,
                        description: 'Basic analysis present but may lack depth or nuance',
                        examples: ['Surface-level interpretation', 'Some gaps in reasoning']
                    },
                    {
                        level: 'beginning',
                        score: 55,
                        description: 'Minimal analysis, mostly summary or surface-level',
                        examples: ['Primarily descriptive', 'Limited interpretation']
                    },
                    {
                        level: 'incomplete',
                        score: 0,
                        description: 'No analysis, only facts or summary',
                        examples: ['Only description, no interpretation']
                    }
                ]
            },
            {
                id: 'writing-quality',
                name: 'Writing Quality & Clarity',
                description: 'Clear, concise writing with proper grammar and style',
                weight: 15,
                maxScore: 100,
                indicators: [
                    {
                        level: 'advanced',
                        score: 90,
                        description: 'Excellent writing with sophisticated vocabulary and style',
                        examples: ['Professional tone', 'Varied sentence structure', 'No errors']
                    },
                    {
                        level: 'proficient',
                        score: 80,
                        description: 'Clear writing with good grammar and appropriate style',
                        examples: ['Professional language', 'Few errors']
                    },
                    {
                        level: 'developing',
                        score: 70,
                        description: 'Generally clear but may have some grammatical errors',
                        examples: ['Some clarity issues', 'Minor errors']
                    },
                    {
                        level: 'beginning',
                        score: 55,
                        description: 'Writing has clarity issues and/or frequent errors',
                        examples: ['Grammatical errors', 'Unclear passages']
                    },
                    {
                        level: 'incomplete',
                        score: 0,
                        description: 'Writing is difficult to understand due to errors',
                        examples: ['Many errors', 'Incomprehensible passages']
                    }
                ]
            }
        ];
    }

    /**
     * Project-specific rubric
     */
    private static projectRubric(): RubricCriteria[] {
        return [
            {
                id: 'objective-achievement',
                name: 'Objective Achievement',
                description: 'Project successfully achieves stated goals and objectives',
                weight: 25,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'technical-execution',
                name: 'Technical Execution',
                description: 'Proper implementation of technical requirements and standards',
                weight: 25,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'creativity-innovation',
                name: 'Creativity & Innovation',
                description: 'Original thinking and creative problem-solving',
                weight: 20,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'documentation',
                name: 'Documentation & Communication',
                description: 'Clear documentation and effective communication of process/results',
                weight: 15,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'polish',
                name: 'Polish & Presentation',
                description: 'Professional quality and attention to detail',
                weight: 15,
                maxScore: 100,
                indicators: this.defaultIndicators()
            }
        ];
    }

    /**
     * Presentation-specific rubric
     */
    private static presentationRubric(): RubricCriteria[] {
        return [
            {
                id: 'content-knowledge',
                name: 'Content Knowledge',
                description: 'Accurate, comprehensive understanding of subject matter',
                weight: 30,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'delivery',
                name: 'Delivery & Engagement',
                description: 'Clear delivery, appropriate pacing, audience engagement',
                weight: 25,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'visual-aids',
                name: 'Visual Aids & Media',
                description: 'Effective use of visuals, slides, and multimedia',
                weight: 20,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'organization',
                name: 'Organization & Flow',
                description: 'Logical structure and smooth transitions',
                weight: 15,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'q-and-a',
                name: 'Q&A & Interaction',
                description: 'Ability to answer questions and interact with audience',
                weight: 10,
                maxScore: 100,
                indicators: this.defaultIndicators()
            }
        ];
    }

    /**
     * Practical/Lab-specific rubric
     */
    private static practicalRubric(): RubricCriteria[] {
        return [
            {
                id: 'procedure-execution',
                name: 'Procedure Execution',
                description: 'Proper execution of experimental or practical procedures',
                weight: 25,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'safety-accuracy',
                name: 'Safety & Accuracy',
                description: 'Adherence to safety protocols and measurement accuracy',
                weight: 25,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'data-analysis',
                name: 'Data Analysis & Interpretation',
                description: 'Correct analysis and interpretation of results',
                weight: 20,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'reporting',
                name: 'Laboratory Reporting',
                description: 'Clear, organized, complete lab report or documentation',
                weight: 20,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'problem-solving',
                name: 'Problem-Solving',
                description: 'Ability to troubleshoot and adapt procedures',
                weight: 10,
                maxScore: 100,
                indicators: this.defaultIndicators()
            }
        ];
    }

    /**
     * Discussion-specific rubric
     */
    private static discussionRubric(): RubricCriteria[] {
        return [
            {
                id: 'initial-post',
                name: 'Initial Post Quality',
                description: 'Thoughtful, substantive initial contribution',
                weight: 25,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'engagement',
                name: 'Class Engagement',
                description: 'Active participation and responsiveness to others',
                weight: 25,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'critical-thinking',
                name: 'Critical Thinking',
                description: 'Analysis, questioning, and synthesis of ideas',
                weight: 25,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'respect-professionalism',
                name: 'Respect & Professionalism',
                description: 'Respectful tone and professional communication',
                weight: 15,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'evidence',
                name: 'Evidence & Support',
                description: 'Use of relevant examples and credible sources',
                weight: 10,
                maxScore: 100,
                indicators: this.defaultIndicators()
            }
        ];
    }

    /**
     * Quiz-specific rubric
     */
    private static quizRubric(): RubricCriteria[] {
        return [
            {
                id: 'accuracy',
                name: 'Answer Accuracy',
                description: 'Correct answers with proper reasoning',
                weight: 50,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'completeness',
                name: 'Answer Completeness',
                description: 'Thorough, complete responses',
                weight: 20,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'clarity',
                name: 'Clarity & Communication',
                description: 'Clear explanation of reasoning and concepts',
                weight: 20,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'efficiency',
                name: 'Efficiency & Conciseness',
                description: 'Concise answers without unnecessary information',
                weight: 10,
                maxScore: 100,
                indicators: this.defaultIndicators()
            }
        ];
    }

    /**
     * Custom/Generic rubric
     */
    private static customRubric(): RubricCriteria[] {
        return [
            {
                id: 'content-quality',
                name: 'Content Quality',
                description: 'Overall quality and relevance of content',
                weight: 30,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'completeness',
                name: 'Completeness',
                description: 'Addresses all requirements and expectations',
                weight: 25,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'organization',
                name: 'Organization',
                description: 'Clear structure and logical flow',
                weight: 20,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'clarity',
                name: 'Clarity & Expression',
                description: 'Clear communication and articulation',
                weight: 15,
                maxScore: 100,
                indicators: this.defaultIndicators()
            },
            {
                id: 'professionalism',
                name: 'Professionalism',
                description: 'Professional quality and attention to detail',
                weight: 10,
                maxScore: 100,
                indicators: this.defaultIndicators()
            }
        ];
    }

    /**
     * Default performance indicators for all criteria
     */
    private static defaultIndicators(): PerformanceIndicator[] {
        return [
            {
                level: 'advanced',
                score: 90,
                description: 'Exceptional work that exceeds expectations',
                examples: ['Outstanding quality', 'Exceptional execution']
            },
            {
                level: 'proficient',
                score: 80,
                description: 'Good work that meets expectations',
                examples: ['Quality work', 'Meets all requirements']
            },
            {
                level: 'developing',
                score: 70,
                description: 'Adequate work that is developing',
                examples: ['Needs improvement', 'Some areas incomplete']
            },
            {
                level: 'beginning',
                score: 55,
                description: 'Beginning work with significant gaps',
                examples: ['Below expectations', 'Incomplete understanding']
            },
            {
                level: 'incomplete',
                score: 0,
                description: 'Incomplete or missing work',
                examples: ['Not attempted', 'Severely incomplete']
            }
        ];
    }

    /**
     * Calculate comprehensive grading result based on rubric
     */
    static evaluateSubmission(
        submissionContent: string,
        rubric: RubricCriteria[],
        assignmentType: string = 'custom'
    ): ComprehensiveGradingResult {
        const contentLength = submissionContent.trim().length;
        const complexity = this.analyzeComplexity(submissionContent);
        const completionPercentage = Math.min(100, Math.max(10, (contentLength / 500) * 60 + 40));

        // Note: In real implementation, would call AI to evaluate against rubric criteria
        // This provides the framework for structured evaluation
        
        return {
            overallGrade: 0, // Will be filled by AI
            performanceLevel: 'beginning',
            completionPercentage,
            evaluationDetails: [],
            strengths: [],
            areasForImprovement: [],
            recommendedActions: [],
            detailedAnalysis: '',
            submissions: {
                content: submissionContent.substring(0, 200),
                length: contentLength,
                complexity
            }
        };
    }

    /**
     * Analyze submission complexity
     */
    private static analyzeComplexity(content: string): 'low' | 'medium' | 'high' {
        const wordCount = content.split(/\s+/).length;
        const sentenceCount = content.split(/[.!?]+/).length;
        const avgWordsPerSentence = wordCount / sentenceCount;

        const hasAcademicLanguage = /therefore|furthermore|moreover|consequently|initially|ultimately|paradoxically/i.test(content);
        const hasData = /\d{2,}|%|\$|[0-9]+\.[0-9]+/g.test(content);
        const hasCitations = /\([A-Z][^\)]*\s+\d{4}\)|[\[\d+\]]/g.test(content);

        const complexityScore = 
            (wordCount > 200 ? 1 : 0) +
            (avgWordsPerSentence > 15 ? 1 : 0) +
            (hasAcademicLanguage ? 1 : 0) +
            (hasData ? 1 : 0) +
            (hasCitations ? 1 : 0);

        if (complexityScore >= 4) return 'high';
        if (complexityScore >= 2) return 'medium';
        return 'low';
    }

    /**
     * Generate AI prompt for specific rubric evaluation
     */
    static generateAIPrompt(
        assignmentType: string,
        rubric: RubricCriteria[],
        customInstructions?: string
    ): string {
        const rubricText = rubric.map(c => 
            `- ${c.name} (${c.weight}%): ${c.description}`
        ).join('\n');

        return `You are an expert academic assessor evaluating student work using a comprehensive rubric system.

ASSIGNMENT TYPE: ${assignmentType}
EVALUATION RUBRIC:
${rubricText}

${customInstructions ? `SPECIAL INSTRUCTIONS:\n${customInstructions}\n` : ''}

EVALUATION FRAMEWORK:
- Advanced (90-100): Exceptional work exceeding expectations
- Proficient (80-89): Strong understanding, minor improvements needed
- Developing (70-79): Adequate work with clear development areas
- Beginning (60-69): Basic attempts with significant gaps
- Incomplete (0-59): Insufficient or missing components

REQUIRED OUTPUT (JSON ONLY):
{
  "overallGrade": <0-100>,
  "performanceLevel": <"advanced" | "proficient" | "developing" | "beginning" | "incomplete">,
  "completionPercentage": <0-100>,
  "contentQuality": <0-100>,
  "clarityScore": <0-100>,
  "criteria": [
    {
      "name": "<criterion name>",
      "score": <0-100>,
      "feedback": "<specific feedback>"
    }
  ],
  "strengths": [
    "<specific strength 1>",
    "<specific strength 2>",
    "<specific strength 3>"
  ],
  "improvements": [
    "<specific improvement 1>",
    "<specific improvement 2>",
    "<specific improvement 3>"
  ],
  "recommendedActions": [
    "<actionable recommendation 1>",
    "<actionable recommendation 2>"
  ],
  "detailedAnalysis": "<comprehensive analysis of the submission>"
}`;
    }
}
