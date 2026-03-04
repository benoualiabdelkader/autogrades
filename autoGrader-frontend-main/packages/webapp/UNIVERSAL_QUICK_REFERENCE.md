# Universal AI System - Quick Reference Card
## Developer Cheat Sheet

---

## 🚀 One-Minute Overview

**What it does:** Generates intelligent, context-aware assessments for ANY assignment type

**Files created:**
1. `src/lib/ai/RubricSystem.ts` - Rubric generation
2. `src/lib/ai/AIPromptBuilder.ts` - Prompt generation
3. `src/lib/workflows/WorkflowTemplateManager.ts` - Workflow templates

**Documentation:** `UNIVERSAL_WORKFLOW_SYSTEM.md` + `UNIVERSAL_AI_INTEGRATION_GUIDE.md`

---

## 💻 Code Snippets

### Create Rubric
```typescript
import { RubricSystem } from '@lib/ai/RubricSystem';

const rubric = RubricSystem.generateRubric('essay', 'intermediate');
// Returns: 5 weighted criteria with performance indicators
```

### Build AI Prompt
```typescript
import { AIPromptBuilder } from '@lib/ai/AIPromptBuilder';

const context = {
    assignmentType: 'essay',
    courseLevel: 'intermediate',
    submissionType: 'text'
};
const prompt = AIPromptBuilder.buildGradingPrompt(context);
```

### Generate AI Prompt for Workflow
```typescript
const prompt = AIPromptBuilder.buildWorkflowSpecificPrompt(
    'grade-assignments',
    context
);
```

### Create New Workflow
```typescript
import { WorkflowTemplateManager } from '@lib/workflows/WorkflowTemplateManager';

const workflow = WorkflowTemplateManager.createAssessmentWorkflow(
    'Essay Grading',
    'essay'
);

const json = WorkflowTemplateManager.exportWorkflowJSON(workflow);
```

### Create Peer Review Workflow
```typescript
const peerReview = WorkflowTemplateManager.createPeerReviewWorkflow(
    'Peer Review',
    'general'
);
```

### Create Analytics Workflow
```typescript
const analytics = WorkflowTemplateManager.createAnalyticsWorkflow(
    'Performance Analytics',
    'performance'
);
```

---

## 📋 Assignment Types (Pre-Built Rubrics)

| Type | Best For | Key Criteria |
|------|----------|-------------|
| **essay** | Academic writing | Thesis, Evidence, Organization, Analysis, Writing |
| **project** | Creative/technical | Achievement, Execution, Creativity, Documentation, Polish |
| **presentation** | Oral/multimedia | Knowledge, Delivery, Visuals, Organization, Q&A |
| **practical** | Lab/hands-on | Procedure, Safety, Data Analysis, Reporting, Problem-solving |
| **discussion** | Forum participation | Initial Post, Engagement, Thinking, Respect, Evidence |
| **quiz** | Testing | Accuracy, Completeness, Clarity, Efficiency |
| **code** | Programming | Functionality, Quality, Efficiency, Documentation, Practices |
| **custom** | Any other | Content, Completeness, Organization, Clarity, Professionalism |

---

## 📊 Course Levels

```
'introductory'  → Emphasizes clarity, reduces depth expectations
'intermediate'  → Balanced across all criteria
'advanced'      → Emphasizes analysis, critical thinking, depth
```

---

## 🎯 Performance Levels (Universal)

```
ADVANCED (90-100)      → Exceptional, exceeds expectations
PROFICIENT (80-89)     → Strong, meets expectations
DEVELOPING (70-79)     → Adequate, clear growth areas
BEGINNING (60-69)      → Basic, significant gaps
INCOMPLETE (0-59)      → Insufficient, missing components
```

---

## 📝 Grading Context (Required)

```typescript
interface GradingContext {
    assignmentType: string;              // essay, project, etc.
    courseLevel: 'introductory' | 'intermediate' | 'advanced';
    submissionType: 'text' | 'code' | 'multimedia' | 'mixed';
    criteria?: string[];                 // Optional custom criteria
    specialRequirements?: string[];      // Assignment-specific
    rubricFocus?: string;                // Primary focus area
}
```

---

## 🔌 Integration Points

### In WorkflowEngine.ts
```typescript
// Already integrated:
private buildEnhancedPrompt(
    basePrompt: string, 
    workflowType: string, 
    task?: any
): string {
    // Uses RubricSystem + AIPromptBuilder
    // Called by Grade Assignments workflow
}

private determineAssignmentType(
    workflowType: string, 
    task?: any
): string {
    // Auto-detects essay, project, etc.
}
```

### In N8N Workflows
```javascript
// Step 1: Fetch data
const data = await extensionQuery(assignmentId);

// Step 2: Build prompt
const context = {
    assignmentType: 'essay',
    courseLevel: 'intermediate',
    submissionType: 'text'
};
const prompt = AIPromptBuilder.buildGradingPrompt(context);

// Step 3: Call Groq
const response = await groqAPI({
    model: 'qwen2-32b',
    messages: [{ role: 'user', content: prompt }]
});

// Step 4: Export results
const csv = exportToCSV(response);
```

---

## 🎁 Template Structure (What You Get)

Every created workflow includes these steps:

```
1. Fetch Data           ← Get submissions
2. Validate Data        ← Check requirements  
3. Analyze Submission   ← Calculate metrics
4. Generate Rubric      ← Create criteria
5. Build AI Prompt      ← Sophisticated prompt
6. AI Assessment        ← Groq API call
7. Process Assessment   ← Parse response
8. Apply Local Rules    ← Additional scoring
9. Generate Feedback    ← Student-ready
10. Export Results      ← CSV ready
```

---

## 📤 Output Example

```json
{
  "overallGrade": 85,
  "performanceLevel": "proficient",
  "completionPercentage": 90,
  "strengths": ["Clear thesis", "Good sources"],
  "improvements": ["Add examples", "Expand analysis"],
  "recommendedActions": ["Review peer feedback"],
  "detailedAnalysis": "..."
}
```

---

## ⚙️ Workflow Configuration

```typescript
interface WorkflowConfiguration {
    autoRetry: boolean;                    // Default: true
    timeoutSeconds: number;                // Default: 120
    logLevel: 'debug' | 'info' | 'warn';   // Default: 'info'
    errorHandling: 'fail-fast' | 'continue-on-error' | 'collect-errors';
    dataValidation: boolean;               // Default: true
    outputFormat: 'json' | 'csv' | 'pdf';  // Default: 'csv'
}
```

---

## 🔍 Common Tasks

### Task: Generate Essay Rubric
```typescript
const rubric = RubricSystem.generateRubric('essay', 'intermediate');
// Includes: Thesis, Evidence, Organization, Analysis, Writing Quality
```

### Task: Build Prompt for Advanced Project
```typescript
const context = {
    assignmentType: 'project',
    courseLevel: 'advanced',
    submissionType: 'mixed',
    specialRequirements: ['Innovation required', 'Team collaboration']
};
const prompt = AIPromptBuilder.buildGradingPrompt(context);
```

### Task: Create Practical Lab Workflow
```typescript
const workflow = WorkflowTemplateManager.createAssessmentWorkflow(
    'Chemistry Lab',
    'practical',
    { timeoutSeconds: 180 }
);
```

### Task: Adaptive Prompt for Brief Submission
```typescript
const adaptive = AIPromptBuilder.generateAdaptivePrompt(
    {
        length: 75,           // < 100 words
        complexity: 'low',
        language: 'informal',
        citations: false
    },
    context
);
// Prompt adjusts expectations for brief submission
```

---

## 🚨 Error Handling

```typescript
// Workflow handles errors gracefully:
errorHandling: 'collect-errors'    // Continues, collects all errors
errorHandling: 'continue-on-error'  // Continues, logs errors
errorHandling: 'fail-fast'         // Stops on first error
```

---

## 📈 Scoring Calculation

```
Final Grade = (AI Score × 70%) + (Local Rules Score × 30%)

Examples:
AI: 85, Local: 75  → Final: (85×0.7) + (75×0.3) = 81.5
AI: 80, Local: 90  → Final: (80×0.7) + (90×0.3) = 83
```

---

## 🔐 Security Notes

- API keys handled via environment variables
- No hardcoded credentials
- Data validation prevents injection
- Input sanitization on all submissions
- Output filtering for sensitive content

---

## 📞 Quick Help

**Where to find:**
- Rubric docs → `UNIVERSAL_WORKFLOW_SYSTEM.md` Section 1
- Prompt docs → `UNIVERSAL_WORKFLOW_SYSTEM.md` Section 2  
- Template docs → `UNIVERSAL_WORKFLOW_SYSTEM.md` Section 3
- Integration guide → `UNIVERSAL_AI_INTEGRATION_GUIDE.md`
- Best practices → `UNIVERSAL_WORKFLOW_SYSTEM.md` Section 9

**For new assignment type:**
1. Add to `determineAssignmentType()` in WorkflowEngine
2. Add rubric to RubricSystem (if specialized needed)
3. Rest auto-generates from framework

**For new workflow:**
1. `createAssessmentWorkflow()` or `createPeerReviewWorkflow()`
2. Export as JSON
3. Import to N8N
4. Run and test

---

## ✅ Verification Checklist

After creating/updating workflow:

- [ ] Rubric generated correctly
- [ ] AI prompt includes all context
- [ ] Output includes all required fields
- [ ] Performance level matches grade
- [ ] CSV exports properly
- [ ] No API errors in logs
- [ ] Student feedback is specific
- [ ] Recommendations are actionable
- [ ] Grammar/spelling correct
- [ ] Format matches standard

---

## 🎓 Key Principles

1. **Context matters** - Always provide assignment type + course level
2. **Specific feedback** - No "good job" without examples
3. **Rubrics guide assessment** - Generate first, use consistently
4. **Performance levels align** - Grade and level must match
5. **Professional quality** - All output student-ready
6. **Actionable recommendations** - Tell students what to do
7. **Balanced evaluation** - AI + local rules for robustness
8. **Consistent structure** - Same format across all workflows
9. **Complete documentation** - Every assignment documented
10. **Quality assurance** - Review before delivery

---

**Last Updated:** March 2026  
**Status:** Production Ready ✅  
**All in English** ✅
