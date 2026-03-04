## Universal Workflow Enhancement System
## Complete Guide to Universal AI-Powered Assessment Framework

### Overview

This document explains the new universal system for creating and enhancing workflows with advanced AI capabilities. The system provides:

- **RubricSystem.ts**: Generate dynamic rubrics for any assignment type
- **AIPromptBuilder.ts**: Build intelligent, contextual AI prompts
- **WorkflowTemplateManager.ts**: Create new workflows with all best practices built-in

All components work in English with the highest quality standards.

---

## 1. RubricSystem - Dynamic Rubric Generation

### Purpose
Provides intelligent, context-aware rubrics for any assignment type. Automatically adjusts criteria, weights, and performance levels based on course level and assignment characteristics.

### Quick Start

```typescript
import { RubricSystem } from '@lib/ai/RubricSystem';

// Generate rubric for essay assignment
const bugric = RubricSystem.generateRubric('essay', 'intermediate');

// Generate with custom criteria
const customRubric = RubricSystem.generateRubric(
    'project',
    'advanced',
    [
        {
            id: 'team-collaboration',
            name: 'Team Collaboration',
            description: 'Effective teamwork and communication',
            weight: 15
        }
    ]
);
```

### Supported Assignment Types

1. **essay** - Standard academic essay with thesis-driven evaluation
2. **project** - Technical/creative projects with innovation assessment
3. **presentation** - Oral presentations with delivery evaluation
4. **practical** - Laboratory or hands-on assignments with procedure assessment
5. **discussion** - Forum/discussion participation with engagement evaluation
6. **quiz** - Quiz/test submissions with accuracy assessment
7. **code** - Programming assignments with functionality evaluation
8. **custom** - Generic rubric for any assignment type

### Course Level Adjustments

Rubrics automatically adjust weights based on course level:

- **Introductory**: Emphasizes clarity (weight +10), reduces depth
- **Intermediate**: Balanced weights across all criteria
- **Advanced**: Emphasizes depth (weight +10), increases analytical requirements

### Example Usage in Workflow

```typescript
// In a workflow node (e.g., generate-rubric):
const rubrics = RubricSystem.generateRubric(
    assignmentType,
    courseLevel,
    customCriteria
);

// Use for AI prompt generation
const aiPrompt = RubricSystem.generateAIPrompt(
    assignmentType,
    rubrics,
    customInstructions
);
```

---

## 2. AIPromptBuilder - Intelligent Prompt Generation

### Purpose
Generates sophisticated, contextual AI prompts that ensure consistent quality assessment. Adapts to assignment type, course level, and submission characteristics.

### Quick Start

```typescript
import { AIPromptBuilder } from '@lib/ai/AIPromptBuilder';

const context = {
    assignmentType: 'essay',
    courseLevel: 'intermediate',
    submissionType: 'text',
    criteria: ['thesis clarity', 'evidence', 'organization'],
    specialRequirements: ['Must cite at least 3 sources']
};

const prompt = AIPromptBuilder.buildGradingPrompt(context);
```

### Context Parameters

```typescript
interface GradingContext {
    assignmentType: string;           // Type of assignment
    courseLevel: 'introductory' | 'intermediate' | 'advanced';
    submissionType: 'text' | 'code' | 'multimedia' | 'mixed';
    criteria?: string[];              // Optional custom criteria
    specialRequirements?: string[];   // Assignment-specific requirements
    rubricFocus?: string;             // Primary rubric focus
}
```

### Key Features

1. **Expertise Adaptation**: System role adjusts based on assignment type
2. **Level Context**: Expectations adapt to course level
3. **Performance Levels**: Detailed definitions (Advanced, Proficient, Developing, Beginning, Incomplete)
4. **Specific Feedback**: Prompts enforce specific, concrete feedback
5. **Output Format**: Consistent JSON structure with all required fields

### Example: Adaptive Prompts

```typescript
// For brief submissions (< 100 words)
const adaptivePrompt = AIPromptBuilder.generateAdaptivePrompt(
    {
        length: 85,
        complexity: 'low',
        language: 'informal',
        citations: false
    },
    context
);

// For sophisticated submissions with citations
const advancedPrompt = AIPromptBuilder.generateAdaptivePrompt(
    {
        length: 2500,
        complexity: 'high',
        language: 'formal',
        citations: true
    },
    context
);
```

### Workflow-Specific Prompts

```typescript
// For specific workflows
const gradingPrompt = AIPromptBuilder.buildWorkflowSpecificPrompt(
    'grade-assignments',
    context
);

const peerReviewPrompt = AIPromptBuilder.buildWorkflowSpecificPrompt(
    'peer-review',
    context
);
```

---

## 3. WorkflowTemplateManager - New Workflow Creation

### Purpose
Provides complete, production-ready workflow templates with all enhancements. Ensures every new workflow includes:
- Data validation
- Content analysis
- Rubric generation
- AI integration
- Local rule evaluation
- Structured feedback
- CSV export

### Quick Start: Create New Assessment Workflow

```typescript
import { WorkflowTemplateManager } from '@lib/workflows/WorkflowTemplateManager';

// Create assessment workflow for any assignment type
const workflow = WorkflowTemplateManager.createAssessmentWorkflow(
    'Advanced Essay Grading',
    'essay'
);

// Export as N8N JSON
const workflowJSON = WorkflowTemplateManager.exportWorkflowJSON(workflow);
```

### Supported Workflow Types

1. **Assessment Workflows**
   - `createAssessmentWorkflow(name, assignmentType)`
   - Automated grading with AI integration

2. **Peer Review Workflows**
   - `createPeerReviewWorkflow(name, courseType)`
   - Peer feedback evaluation

3. **Analytics Workflows**
   - `createAnalyticsWorkflow(name, analyticsType)`
   - Performance, engagement, or progress tracking

### Workflow Features

Every created workflow includes:

**Step 1: Fetch Data**
- Retrieves submissions from OnPage Scraper Extension
- Handles connection, retry, and timeout

**Step 2: Validate Data**
- Checks required fields (studentId, assignmentId, content)
- Validates data types and completeness
- Reports errors clearly

**Step 3: Analyze Submission**
- Calculates word count, sentence length, paragraph structure
- Detects academic language, examples, citations
- Determines complexity level (low/medium/high)

**Step 4: Generate Rubric**
- Creates assignment-type-specific rubric
- Sets appropriate weightings
- Defines performance indicators

**Step 5: Build AI Prompt**
- Combines rubric, analysis, and guidelines
- Contextualizes expectations
- Specifies output format

**Step 6: AI Assessment**
- Calls Groq API with contextual prompt
- Uses qwen2-32b model
- Returns structured JSON assessment

**Step 7: Process Assessment**
- Parses AI response
- Validates JSON structure
- Handles parsing errors gracefully

**Step 8: Apply Local Rules**
- Evaluates based on local criteria
- Provides consistency layer
- Weights local + AI scores

**Step 9: Generate Feedback**
- Combines AI and local evaluation
- Structures as student-friendly feedback
- Calculates final grade (70% AI + 30% local)

**Step 10: Export Results**
- Formats as CSV with all fields
- Includes metadata and timestamps
- Ready for delivery or further processing

---

## 4. Implementation Guide - Using with Existing Workflows

### Updating Grade Assignments Workflow

```typescript
// In WorkflowEngine.ts buildEnhancedPrompt() method:

import { AIPromptBuilder } from '@lib/ai/AIPromptBuilder';
import { RubricSystem } from '@lib/ai/RubricSystem';

const context = {
    assignmentType: 'essay',
    courseLevel: this.determineCourseLevel(task),
    submissionType: 'text',
    specialRequirements: task.requirements || []
};

const rubric = RubricSystem.generateRubric(
    'essay',
    context.courseLevel
);

const enhancedPrompt = AIPromptBuilder.buildGradingPrompt(context);
```

### Creating New Workflow (Example: Practical Lab Assessment)

```typescript
import { WorkflowTemplateManager } from '@lib/workflows/WorkflowTemplateManager';

const labWorkflow = WorkflowTemplateManager.createAssessmentWorkflow(
    'Biology Lab Assessment',
    'practical',
    {
        outputFormat: 'pdf',
        errorHandling: 'collect-errors',
        timeoutSeconds: 180
    }
);

// Export for N8N
const n8nJSON = JSON.stringify(labWorkflow);
```

---

## 5. Advanced Configuration

### Custom Rubric Creation

```typescript
const customRubric = RubricSystem.generateRubric(
    'custom',
    'advanced',
    [
        {
            id: 'teamwork',
            name: 'Team Collaboration',
            description: 'Quality of collaborative work',
            weight: 20,
            maxScore: 100,
            indicators: [
                {
                    level: 'advanced',
                    score: 95,
                    description: 'Excellent collaboration and communication',
                    examples: ['Clear division of labor', 'Regular communication']
                },
                // ... additional indicators
            ]
        }
    ]
);
```

### Adaptive AI Prompt Based on Submission

```typescript
// Analyze submission first
const submissionProperties = {
    length: content.length,
    complexity: analyzeComplexity(content),
    language: detectLanguageStyle(content),
    citations: hasCitations(content)
};

// Generate adaptive prompt
const adaptivePrompt = AIPromptBuilder.generateAdaptivePrompt(
    submissionProperties,
    context
);
```

### Custom Workflow Configuration

```typescript
const workflowConfig = {
    autoRetry: true,
    timeoutSeconds: 300,
    logLevel: 'debug',
    errorHandling: 'continue-on-error',
    dataValidation: true,
    outputFormat: 'mixed'  // CSV + JSON
};

const customWorkflow = WorkflowTemplateManager.createAssessmentWorkflow(
    'Custom Grading',
    'project',
    workflowConfig
);
```

---

## 6. Performance Levels and Grading Standards

All systems use consistent performance definitions:

### ADVANCED (90-100)
- Exceptional work exceeding expectations
- Demonstrates deep understanding
- Shows originality and critical thinking
- Professional quality

### PROFICIENT (80-89)
- Strong work meeting expectations
- Good understanding demonstrated
- Minor areas for growth
- Generally well-executed

### DEVELOPING (70-79)
- Adequate work showing competency
- Identified areas for improvement
- Fundamental understanding present
- Some gaps evident

### BEGINNING (60-69)
- Basic work with foundational understanding
- Significant gaps present
- Demonstrates effort but incomplete mastery
- Needs substantial improvement

### INCOMPLETE (0-59)
- Insufficient work or missing components
- Lacks understanding of key concepts
- May be incomplete or unsubmitted
- Does not meet minimum requirements

---

## 7. Output Standards

All workflow assessments include:

```json
{
  "assessment": {
    "overallGrade": 85,
    "performanceLevel": "proficient",
    "completionPercentage": 90
  },
  "scoring": {
    "contentQuality": 85,
    "clarityAndExpression": 80,
    "organizationAndStructure": 85,
    "depthAndCriticalThinking": 85,
    "completeness": 90
  },
  "detailedEvaluation": {
    "strengths": [
      "Clear thesis statement that guides the essay",
      "Excellent use of relevant sources",
      "Well-organized with smooth transitions"
    ],
    "areasForImprovement": [
      "Some paragraphs could include more supporting evidence",
      "Minor grammatical errors in conclusion",
      "Could expand analysis in middle section"
    ],
    "detailedAnalysis": "...",
    "contentAnalysis": "...",
    "structureAnalysis": "...",
    "evidenceAnalysis": "..."
  },
  "recommendations": {
    "nextSteps": [
      "Review peer feedback and revise weak areas",
      "Practice incorporating counter-arguments",
      "Expand use of primary sources"
    ],
    "learningFocus": "Deepening critical analysis",
    "strengthToLeverage": "Strong organizational skills"
  }
}
```

---

## 8. Integration Checklist

For every new workflow, ensure:

- [ ] Appropriate assignment type selected
- [ ] Course level matches actual level
- [ ] Custom criteria added if needed
- [ ] AI model configured (default: qwen2-32b)
- [ ] Data validation enabled
- [ ] Error handling strategy selected
- [ ] Output format specified (CSV/JSON/PDF)
- [ ] Local evaluation rules reviewed
- [ ] Feedback structure customized
- [ ] Export format validated

---

## 9. Best Practices

1. **Always use RubricSystem** for creating evaluation criteria
2. **Build prompts with AIPromptBuilder** for consistency
3. **Create new workflows from templates** rather than from scratch
4. **Test with sample data** before production deployment
5. **Review AI output** for quality before student delivery
6. **Combine 70% AI + 30% local evaluation** for best results
7. **Provide specific feedback** with concrete examples
8. **Consider course level** when setting expectations
9. **Include actionable recommendations** not just grades
10. **Export to CSV** for record-keeping and analysis

---

## 10. Troubleshooting

### AI Prompt Not Working
- Check context parameters are complete
- Verify assignment type is supported
- Ensure special requirements are clear
- Review API configuration

### Rubric Not Adjusting
- Verify course level is correct
- Check custom criteria format
- Ensure weights don't exceed 100%
- Review performance indicators

### Workflow Execution Issues
- Check Extension connection status
- Verify data validation passing
- Review error logs in workflow
- Check API timeout settings

---

## Summary

This universal system enables:
- Creating professional assessment workflows in minutes
- Consistent, high-quality AI grading across all submissions
- Flexible rubrics adapting to any assignment type
- Intelligent prompts ensuring meaningful feedback
- Professional, structured output suitable for student delivery

All in English, with academic standards maintained throughout.
