/**
 * Advanced AI Prompt Builder for Enhanced Workflow Grading
 * Generates contextual, intelligent prompts that adapt to assignment type
 * Ensures consistent quality across all workflow executions
 */

export interface GradingContext {
    assignmentType: string;
    courseLevel: 'introductory' | 'intermediate' | 'advanced';
    submissionType: 'text' | 'code' | 'multimedia' | 'mixed';
    criteria?: string[];
    specialRequirements?: string[];
    rubricFocus?: string;
}

export interface AIPromptConfiguration {
    systemRole: string;
    taskInstructions: string;
    evaluationFramework: string;
    outputFormat: string;
    qualityGuidelines: string;
}

export class AIPromptBuilder {
    /**
     * Build comprehensive AI grading prompt with context awareness
     */
    static buildGradingPrompt(context: GradingContext): string {
        const systemRole = this.buildSystemRole(context);
        const taskInstructions = this.buildTaskInstructions(context);
        const evaluationFramework = this.buildEvaluationFramework(context);
        const outputFormat = this.buildOutputFormat();
        const qualityGuidelines = this.buildQualityGuidelines(context);

        return `${systemRole}

${taskInstructions}

${evaluationFramework}

${outputFormat}

${qualityGuidelines}

IMPORTANT INSTRUCTIONS FOR AI ASSISTANT:
1. Provide specific, concrete feedback rather than generic praise
2. Reference exact parts of the submission when providing feedback
3. Balance constructive criticism with recognition of strengths
4. Offer actionable recommendations for improvement
5. Consider the student's course level when setting expectations
6. Ensure all feedback is respectful and encouraging while maintaining standards`;
    }

    /**
     * Build system role prompt
     */
    private static buildSystemRole(context: GradingContext): string {
        const expertise = this.getExpertiseDescription(context.assignmentType);
        return `SYSTEM ROLE:
You are an expert academic assessor with deep expertise in evaluating ${context.assignmentType} assignments. ${expertise} Your role is to provide comprehensive, fair, and constructive feedback that helps students understand their strengths and areas for growth. You maintain high academic standards while being supportive and encouraging in your communication.`;
    }

    /**
     * Build task instructions
     */
    private static buildTaskInstructions(context: GradingContext): string {
        const levelDescription = this.getLevelDescription(context.courseLevel);
        
        return `TASK INSTRUCTIONS:
Your task is to evaluate the following ${context.submissionType} ${context.assignmentType} submission at the ${context.courseLevel} level.

Course Level Context: ${levelDescription}

${context.specialRequirements ? `Special Requirements:\n${context.specialRequirements.map(r => `- ${r}`).join('\n')}\n` : ''}

Evaluation Approach:
1. First, assess the submission against key criteria
2. Identify specific strengths that demonstrate learning
3. Pinpoint areas where the student can improve
4. Provide concrete, actionable recommendations
5. Calculate an overall grade that reflects the holistic quality of the work`;
    }

    /**
     * Build evaluation framework
     */
    private static buildEvaluationFramework(context: GradingContext): string {
        const criteria = this.getDefaultCriteria(context.assignmentType);
        const scoringRubric = this.getScoringRubric();
        
        return `EVALUATION FRAMEWORK:

Evaluation Criteria:
${criteria.map((c, i) => `${i + 1}. ${c.name} (${c.weight}%)\n   Description: ${c.description}`).join('\n\n')}

${scoringRubric}`;
    }

    /**
     * Build output format specification
     */
    private static buildOutputFormat(): string {
        return `REQUIRED OUTPUT FORMAT (STRICT JSON):
{
  "assessment": {
    "overallGrade": <number 0-100>,
    "performanceLevel": <"advanced" | "proficient" | "developing" | "beginning" | "incomplete">,
    "completionPercentage": <number 0-100>
  },
  "scoring": {
    "contentQuality": <number 0-100>,
    "clarityAndExpression": <number 0-100>,
    "organizationAndStructure": <number 0-100>,
    "depthAndCriticalThinking": <number 0-100>,
    "completeness": <number 0-100>
  },
  "detailedEvaluation": {
    "strengths": [
      "<Specific strength 1: What the student did well>",
      "<Specific strength 2: Concrete example>",
      "<Specific strength 3: Evidence from submission>"
    ],
    "areasForImprovement": [
      "<Specific area 1: What needs improvement and why>",
      "<Specific area 2: Concrete example of gap>",
      "<Specific area 3: How to address this gap>"
    ],
    "detailedAnalysis": "<2-3 paragraph comprehensive analysis of the submission>",
    "contentAnalysis": "<Detailed analysis of the content itself>",
    "structureAnalysis": "<Analysis of organization and flow>",
    "evidenceAnalysis": "<Analysis of supporting evidence and examples>"
  },
  "recommendations": {
    "nextSteps": [
      "<Actionable step student should take>",
      "<Specific practice recommendation>",
      "<Resource or strategy to improve>"
    ],
    "learningFocus": "<Primary area for the student to focus on next>",
    "strengthToLeverageate": "<Strength the student should build upon>"
  },
  "metadata": {
    "submissionLength": <number>,
    "submissionComplexity": <"low" | "medium" | "high">,
    "estimatedEffort": <"minimal" | "adequate" | "excellent">
  }
}

CRITICAL: Respond with ONLY valid JSON. No additional text before or after.`;
    }

    /**
     * Build quality guidelines
     */
    private static buildQualityGuidelines(context: GradingContext): string {
        return `QUALITY ASSURANCE GUIDELINES:

Specificity Requirements:
- Every piece of feedback must reference specific elements from the submission
- Avoid generic statements like "good work" or "needs improvement"
- Provide exact examples when possible

Constructive Feedback Principles:
- Always start with recognition of what the student did well
- Frame improvements as growth opportunities, not failures
- Provide concrete strategies for improvement, not just problems
- Consider the student's experience level

Grading Standards:
- Advanced (90-100): Exceptional work that exceeds expectations in most areas
- Proficient (80-89): Solid work that meets expectations with minor gaps
- Developing (70-79): Work shows competency but has clear areas for growth
- Beginning (60-69): Foundational understanding present but many gaps
- Incomplete (Below 60): Insufficient evidence of meeting basic requirements

Academic Integrity:
- Assess based on the work substance, not presentation alone
- Give credit for original thinking and unique perspectives
- Recognize appropriate use of sources and ideas`;
    }

    /**
     * Get expertise description for assignment type
     */
    private static getExpertiseDescription(assignmentType: string): string {
        const descriptions: Record<string, string> = {
            'essay': 'You understand thesis development, argumentation, evidence integration, and academic writing standards.',
            'project': 'You understand project scope, technical execution, creativity, documentation standards, and professional presentation.',
            'presentation': 'You understand audience engagement, clarity of delivery, visual design, content accuracy, and presentation skills.',
            'practical': 'You understand experimental design, safety protocols, data collection accuracy, analysis, and proper reporting.',
            'discussion': 'You understand substantive participation, critical engagement, respectful dialogue, and collaborative learning.',
            'quiz': 'You understand question accuracy, conceptual understanding, justification quality, and application of knowledge.',
            'code': 'You understand code functionality, structure, efficiency, readability, documentation, and best practices.',
            'research': 'You understand research methodology, literature integration, analysis depth, and scholarly communication.'
        };
        
        return descriptions[assignmentType.toLowerCase()] || descriptions['essay'];
    }

    /**
     * Get course level description
     */
    private static getLevelDescription(level: 'introductory' | 'intermediate' | 'advanced'): string {
        const descriptions: Record<string, string> = {
            'introductory': 'Expect foundational understanding and basic competency. Value clarity and completeness over sophistication. Recognize effort in organizing ideas coherently.',
            'intermediate': 'Expect solid understanding and application of concepts. Look for integration of ideas and some critical thinking. Balance depth with clarity.',
            'advanced': 'Expect sophisticated analysis, original thinking, and expert-level work. Demand rigor in argumentation and sources. Value innovation and scholarly depth.'
        };
        
        return descriptions[level];
    }

    /**
     * Get default evaluation criteria for assignment type
     */
    private static getDefaultCriteria(assignmentType: string): Array<{name: string; weight: string; description: string}> {
        const criteria: Record<string, Array<{name: string; weight: string; description: string}>> = {
            'essay': [
                { name: 'Thesis and Focus', weight: '20', description: 'Clear, specific thesis that guides the entire essay' },
                { name: 'Evidence and Support', weight: '25', description: 'Relevant, credible evidence properly integrated' },
                { name: 'Organization and Flow', weight: '20', description: 'Logical structure with smooth transitions' },
                { name: 'Analysis and Critical Thinking', weight: '20', description: 'Deep analysis beyond surface-level description' },
                { name: 'Writing Quality', weight: '15', description: 'Clear writing with proper grammar and style' }
            ],
            'project': [
                { name: 'Objective Achievement', weight: '25', description: 'Successfully meets all project goals' },
                { name: 'Technical Execution', weight: '25', description: 'Proper implementation of requirements' },
                { name: 'Creativity and Innovation', weight: '20', description: 'Original thinking and problem-solving' },
                { name: 'Documentation', weight: '20', description: 'Clear communication of process and results' },
                { name: 'Polish and Presentation', weight: '10', description: 'Professional quality and attention to detail' }
            ],
            'presentation': [
                { name: 'Content Knowledge', weight: '30', description: 'Accurate and comprehensive understanding' },
                { name: 'Delivery and Engagement', weight: '25', description: 'Clear delivery with audience engagement' },
                { name: 'Visual Design', weight: '20', description: 'Effective use of visuals and multimedia' },
                { name: 'Organization', weight: '15', description: 'Logical structure and smooth flow' },
                { name: 'Interaction', weight: '10', description: 'Ability to respond to questions and feedback' }
            ],
            'code': [
                { name: 'Functionality', weight: '30', description: 'Code works correctly and meets specifications' },
                { name: 'Code Quality', weight: '25', description: 'Clean, well-structured, readable code' },
                { name: 'Efficiency', weight: '20', description: 'Optimal algorithms and performance' },
                { name: 'Documentation', weight: '15', description: 'Clear comments and documentation' },
                { name: 'Best Practices', weight: '10', description: 'Follows coding standards and conventions' }
            ]
        };
        
        return criteria[assignmentType.toLowerCase()] || [
            { name: 'Content Quality', weight: '30', description: 'Overall quality and relevance of content' },
            { name: 'Completeness', weight: '25', description: 'Addresses all requirements' },
            { name: 'Organization', weight: '20', description: 'Clear structure and logical flow' },
            { name: 'Clarity', weight: '15', description: 'Clear communication and expression' },
            { name: 'Professionalism', weight: '10', description: 'Professional quality and attention to detail' }
        ];
    }

    /**
     * Get scoring rubric description
     */
    private static getScoringRubric(): string {
        return `Performance Level Definitions:
- ADVANCED (90-100): Exceptional work that demonstrates deep understanding and exceeds expectations. Shows originality, critical thinking, and sophistication.
- PROFICIENT (80-89): Strong work that meets expectations well. Demonstrates good understanding with minor areas for growth. Generally well-executed.
- DEVELOPING (70-79): Adequate work that shows competency but has identifiable areas for improvement. Demonstrates fundamental understanding with some gaps.
- BEGINNING (60-69): Basic work that shows foundational understanding but has significant gaps. Demonstrates effort but incomplete mastery of concepts.
- INCOMPLETE (0-59): Insufficient work or demonstrates lack of understanding. May be missing major components or show minimal effort.`;
    }

    /**
     * Build prompt for specific workflow enhancement
     */
    static buildWorkflowSpecificPrompt(
        workflowName: string,
        context: GradingContext,
        additionalContext?: string
    ): string {
        const basePrompt = this.buildGradingPrompt(context);
        
        const workflowAdditions: Record<string, string> = {
            'grade-assignments': `
WORKFLOW CONTEXT: Assignment Grading
This submission is being evaluated as part of the automated assignment grading workflow.
Ensure that your evaluation is:
- Consistent with academic standards
- Fair and unbiased
- Comprehensive in coverage
- Helpful for student development`,
            'peer-review': `
WORKFLOW CONTEXT: Peer Review
This is a peer review submission where students evaluate each other's work.
Consider:
- The reviewer's constructive intent
- Balance of praise and constructive criticism
- Quality of peer feedback
- Evidence of deep reading/understanding`,
            'rubric-evaluation': `
WORKFLOW CONTEXT: Rubric-Based Evaluation
This evaluation follows a detailed rubric system.
Ensure your assessment:
- Aligns with all rubric criteria
- Provides evidence for each score
- Maintains consistency with scoring rubric
- Explains deviation from expected levels`,
            'portfolio-assessment': `
WORKFLOW CONTEXT: Portfolio Assessment
This is part of a portfolio evaluation spanning multiple assignments.
Consider:
- Growth trajectory across submissions
- Development of core competencies
- Overall portfolio strength
- Progress toward learning outcomes`
        };

        const workflowAddition = workflowAdditions[workflowName] || '';
        
        return `${basePrompt}${workflowAddition}${additionalContext ? `\n\n${additionalContext}` : ''}`;
    }

    /**
     * Generate adaptive prompt based on submission characteristics
     */
    static generateAdaptivePrompt(
        submissionProperties: {
            length: number;
            complexity: 'low' | 'medium' | 'high';
            language: 'formal' | 'informal' | 'technical' | 'mixed';
            citations: boolean;
        },
        context: GradingContext
    ): string {
        let adaptiveGuidance = '';

        // Adapt based on length
        if (submissionProperties.length < 100) {
            adaptiveGuidance += '\nNote: This is a brief submission. Evaluate based on quality rather than quantity, but ensure all requirements are addressed.';
        } else if (submissionProperties.length > 5000) {
            adaptiveGuidance += '\nNote: This is a longer submission. Evaluate organization and coherence carefully. Look for repetition or unnecessary content.';
        }

        // Adapt based on complexity
        if (submissionProperties.complexity === 'high') {
            adaptiveGuidance += '\nNote: This submission appears sophisticated. Ensure depth of analysis is genuine and not just complex language.';
        } else if (submissionProperties.complexity === 'low') {
            adaptiveGuidance += '\nNote: This submission uses straightforward language. This is acceptable - judge content quality over stylistic complexity.';
        }

        // Adapt based on citations
        if (submissionProperties.citations) {
            adaptiveGuidance += '\nNote: The submission includes citations. Evaluate: proper attribution, appropriate source quality, integration into argument.';
        }

        const basePrompt = this.buildGradingPrompt(context);
        return `${basePrompt}${adaptiveGuidance}`;
    }
}
