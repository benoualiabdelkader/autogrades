/**
 * N8N Workflow Integration Examples
 * Shows how to integrate universal AI system in N8N workflows
 * All workflows use RubricSystem + AIPromptBuilder for enhanced grading
 */

// ============================================================
// EXAMPLE 1: Grade Essays Workflow (Using Universal System)
// ============================================================

export const gradeEssaysWorkflow = {
    name: "Grade Essays - Universal AI",
    nodes: [
        {
            id: "fetch-essays",
            type: "n8n-nodes-base.extensionData",
            name: "Fetch Essays",
            parameters: {
                operation: "query",
                filter: { assignmentId: "essay-001" }
            }
        },
        {
            id: "analyze-essay",
            type: "n8n-nodes-base.code",
            name: "Analyze Essay Content",
            parameters: {
                language: "javascript",
                code: `
// Analyze essay characteristics
const analyzeEssay = (content) => {
  const wordCount = content.split(/\\s+/).length;
  const paragraphs = content.split(/\\n\\n+/).length;
  const sentences = content.match(/[.!?]+/g)?.length || 0;
  
  return {
    wordCount,
    paragraphCount: paragraphs,
    sentenceCount: sentences,
    averageWordsPerSentence: Math.round(wordCount / sentences),
    complexity: wordCount > 200 ? 'high' : wordCount > 100 ? 'medium' : 'low'
  };
};

return items.map(item => ({
  json: {
    ...item.json,
    analysis: analyzeEssay(item.json.content)
  }
}));`
            }
        },
        {
            id: "generate-rubric",
            type: "n8n-nodes-base.code",
            name: "Generate Essay Rubric",
            parameters: {
                language: "javascript",
                code: `
// Using RubricSystem (imported at workflow level)
const rubric = RubricSystem.generateRubric('essay', 'intermediate');

return items.map(item => ({
  json: {
    ...item.json,
    rubric: rubric,
    rubricText: rubric.map(c => \`- \${c.name} (\${c.weight}%): \${c.description}\`).join('\\n')
  }
}));`
            }
        },
        {
            id: "build-ai-prompt",
            type: "n8n-nodes-base.code",
            name: "Build AI Prompt",
            parameters: {
                language: "javascript",
                code: `
// Using AIPromptBuilder (imported at workflow level)
const context = {
  assignmentType: 'essay',
  courseLevel: 'intermediate',
  submissionType: 'text',
  specialRequirements: [
    'Minimum 500 words',
    'Minimum 3 sources',
    'Proper thesis statement'
  ]
};

const prompt = AIPromptBuilder.buildGradingPrompt(context);

return items.map(item => ({
  json: {
    ...item.json,
    aiPrompt: prompt
  }
}));`
            }
        },
        {
            id: "call-groq-api",
            type: "n8n-nodes-base.httpRequest",
            name: "Call Groq AI",
            parameters: {
                url: "https://api.groq.com/openai/v1/chat/completions",
                method: "POST",
                headers: {
                    "Authorization": "Bearer {{$env.GROQ_API_KEY}}",
                    "Content-Type": "application/json"
                },
                body: {
                    "model": "qwen2-32b",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert essay evaluator providing comprehensive academic assessment."
                        },
                        {
                            "role": "user",
                            "content": "={{$json.aiPrompt}}\\n\\nSTUDENT ESSAY:\\n={{$json.content}}"
                        }
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000
                }
            }
        },
        {
            id: "process-ai-response",
            type: "n8n-nodes-base.code",
            name: "Process AI Assessment",
            parameters: {
                language: "javascript",
                code: `
// Parse Groq response
const processResponse = (response) => {
  try {
    const content = response.choices[0].message.content;
    const assessment = JSON.parse(content);
    return {
      ...assessment,
      valid: true,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      error: 'Failed to parse response',
      valid: false
    };
  }
};

return items.map(item => ({
  json: {
    ...item.json,
    assessment: processResponse(item.json)
  }
}));`
            }
        },
        {
            id: "apply-local-rules",
            type: "n8n-nodes-base.code",
            name: "Apply Local Evaluation Rules",
            parameters: {
                language: "javascript",
                code: `
// Apply local rules for consistency check
const applyLocalRules = (content, analysis) => {
  const rules = [];
  
  // Rule 1: Minimum length
  if (analysis.wordCount < 500) {
    rules.push({ name: 'min_length', score: 60, msg: 'Below minimum word count' });
  } else if (analysis.wordCount > 1000) {
    rules.push({ name: 'good_length', score: 90, msg: 'Good essay length' });
  } else {
    rules.push({ name: 'adequate_length', score: 80, msg: 'Adequate essay length' });
  }
  
  // Rule 2: Structure
  if (analysis.paragraphCount >= 4) {
    rules.push({ name: 'structure', score: 85, msg: 'Well-structured essay' });
  }
  
  // Rule 3: Average sentence length
  if (analysis.averageWordsPerSentence > 15) {
    rules.push({ name: 'complexity', score: 80, msg: 'Sophisticated sentence structure' });
  }
  
  const avgScore = rules.length > 0 
    ? Math.round(rules.reduce((sum, r) => sum + r.score, 0) / rules.length)
    : 50;
  
  return { rules, averageScore: avgScore };
};

return items.map(item => ({
  json: {
    ...item.json,
    localEvaluation: applyLocalRules(item.json.content, item.json.analysis)
  }
}));`
            }
        },
        {
            id: "calculate-final-grade",
            type: "n8n-nodes-base.code",
            name: "Calculate Final Grade",
            parameters: {
                language: "javascript",
                code: `
// Combine AI + local evaluation
const calculateFinalGrade = (assessment, localEval) => {
  if (!assessment.valid) {
    return {
      grade: 0,
      performanceLevel: 'incomplete',
      error: assessment.error
    };
  }
  
  // 70% AI score + 30% local rules score
  const finalGrade = Math.round(
    (assessment.overallGrade * 0.7) + 
    (localEval.averageScore * 0.3)
  );
  
  // Determine performance level
  let level = 'incomplete';
  if (finalGrade >= 90) level = 'advanced';
  else if (finalGrade >= 80) level = 'proficient';
  else if (finalGrade >= 70) level = 'developing';
  else if (finalGrade >= 60) level = 'beginning';
  
  return {
    finalGrade,
    performanceLevel: level,
    aiScore: assessment.overallGrade,
    localScore: localEval.averageScore,
    strengths: assessment.strengths || [],
    improvements: assessment.improvements || [],
    recommendations: assessment.recommendedActions || []
  };
};

return items.map(item => ({
  json: {
    ...item.json,
    finalResult: calculateFinalGrade(item.json.assessment, item.json.localEvaluation)
  }
}));`
            }
        },
        {
            id: "export-results",
            type: "n8n-nodes-base.code",
            name: "Export to CSV",
            parameters: {
                language: "javascript",
                code: `
// Export results in CSV format
const items_data = items.map(item => ({
  studentId: item.json.studentId,
  assignmentId: item.json.assignmentId,
  grade: item.json.finalResult.finalGrade,
  performanceLevel: item.json.finalResult.performanceLevel,
  wordCount: item.json.analysis.wordCount,
  aiScore: item.json.finalResult.aiScore,
  localScore: item.json.finalResult.localScore,
  strengths: item.json.finalResult.strengths.join('; '),
  improvements: item.json.finalResult.improvements.join('; '),
  recommendations: item.json.finalResult.recommendations.join('; '),
  timestamp: new Date().toISOString()
}));

return [{
  json: {
    format: 'csv',
    data: items_data,
    headers: Object.keys(items_data[0] || {}),
    recordCount: items_data.length
  }
}];`
            }
        }
    ]
};

// ============================================================
// EXAMPLE 2: Grade Projects Workflow
// ============================================================

export const gradeProjectsWorkflow = {
    name: "Grade Projects - Universal AI",
    description: "Automated project evaluation with creativity and innovation assessment",
    assignmentType: "project",
    nodes: [
        {
            id: "fetch-projects",
            type: "n8n-nodes-base.extensionData",
            name: "Fetch Project Submissions",
            parameters: {
                operation: "query",
                filter: { type: "project" }
            }
        },
        {
            id: "analyze-project",
            type: "n8n-nodes-base.code",
            name: "Analyze Project Characteristics",
            parameters: {
                language: "javascript",
                code: `
// Analyze project submission
const analyzeProject = (submission) => {
  const hasDocumentation = submission.documentation?.length > 0;
  const hasSource = submission.sourceCode?.length > 0;
  const hasDemo = submission.demo?.length > 0;
  
  return {
    componentCount: submission.components?.length || 0,
    documentationLength: submission.documentation?.length || 0,
    sourceCodeLines: submission.sourceCode?.split('\\n').length || 0,
    hasDocumentation,
    hasSource,
    hasDemo,
    completeness: (hasDocumentation ? 33 : 0) + (hasSource ? 33 : 0) + (hasDemo ? 34 : 0)
  };
};

return items.map(item => ({
  json: {
    ...item.json,
    analysis: analyzeProject(item.json)
  }
}));`
            }
        },
        {
            id: "generate-project-rubric",
            type: "n8n-nodes-base.code",
            name: "Generate Project Rubric",
            parameters: {
                language: "javascript",
                code: `
const rubric = RubricSystem.generateRubric('project', 'intermediate');

return items.map(item => ({
  json: {
    ...item.json,
    rubric: rubric
  }
}));`
            }
        },
        {
            id: "build-project-prompt",
            type: "n8n-nodes-base.code",
            name: "Build Project Evaluation Prompt",
            parameters: {
                language: "javascript",
                code: `
const context = {
  assignmentType: 'project',
  courseLevel: 'intermediate',
  submissionType: 'mixed',
  specialRequirements: [
    'Must include working code',
    'Must include documentation',
    'Must demonstrate creativity or innovation',
    'Must be technically sound'
  ]
};

const prompt = AIPromptBuilder.buildGradingPrompt(context);

return items.map(item => ({
  json: {
    ...item.json,
    aiPrompt: prompt
  }
}));`
            }
        },
        // ... rest of nodes same as essay example ...
    ]
};

// ============================================================
// EXAMPLE 3: Peer Review Workflow
// ============================================================

export const peerReviewWorkflow = {
    name: "Peer Review - Structured Feedback",
    description: "Enable students to provide structured peer feedback using universal system",
    nodes: [
        {
            id: "fetch-peer-assignments",
            type: "n8n-nodes-base.extensionData",
            name: "Fetch Peer Review Assignments",
            parameters: {
                operation: "query",
                filter: { type: "peer-review" }
            }
        },
        {
            id: "build-peer-prompt",
            type: "n8n-nodes-base.code",
            name: "Build Peer Review Prompt",
            parameters: {
                language: "javascript",
                code: `
const context = {
  assignmentType: 'essay',
  courseLevel: 'intermediate',
  submissionType: 'text'
};

const peerPrompt = AIPromptBuilder.buildWorkflowSpecificPrompt(
  'peer-review',
  context,
  'This is a peer review. Provide constructive feedback in a supportive tone.'
);

return items.map(item => ({
  json: {
    ...item.json,
    peerReviewPrompt: peerPrompt
  }
}));`
            }
        },
        // ... remaining nodes ...
    ]
};

// ============================================================
// EXAMPLE 4: Analytics Workflow
// ============================================================

export const analyticsWorkflow = {
    name: "Performance Analytics - Trend Analysis",
    description: "Analyze student performance trends across assignments",
    nodes: [
        {
            id: "fetch-grades",
            type: "n8n-nodes-base.extensionData",
            name: "Fetch All Grades",
            parameters: {
                operation: "query",
                filter: { type: "grading-results" }
            }
        },
        {
            id: "calculate-trends",
            type: "n8n-nodes-base.code",
            name: "Calculate Performance Trends",
            parameters: {
                language: "javascript",
                code: `
// Calculate student performance trends
const calculateTrends = (grades) => {
  const byStudent = {};
  
  grades.forEach(grade => {
    if (!byStudent[grade.studentId]) {
      byStudent[grade.studentId] = [];
    }
    byStudent[grade.studentId].push(grade.grade);
  });
  
  const trends = Object.entries(byStudent).map(([studentId, grades]) => {
    const avg = grades.reduce((a, b) => a + b) / grades.length;
    const isImproving = grades.length >= 2 && grades[grades.length - 1] > grades[0];
    
    return {
      studentId,
      averageGrade: Math.round(avg),
      assignmentCount: grades.length,
      isImproving,
      trend: isImproving ? 'improving' : 'stable' : 'declining'
    };
  });
  
  return trends;
};

return [{
  json: {
    analytics: calculateTrends(items.map(i => i.json))
  }
}];`
            }
        }
    ]
};

// ============================================================
// HELPER: Import These in Workflow
// ============================================================

export const workflowImports = `
// Add to workflow N8N configuration:

import { RubricSystem } from 'src/lib/ai/RubricSystem';
import { AIPromptBuilder } from 'src/lib/ai/AIPromptBuilder';
import { WorkflowTemplateManager } from 'src/lib/workflows/WorkflowTemplateManager';

// Make available in code nodes:
// window.RubricSystem = RubricSystem;
// window.AIPromptBuilder = AIPromptBuilder;
`;

// ============================================================
// SUMMARY OF INTEGRATION
// ============================================================

export const integrationSummary = {
    approaches: {
        "Recommended": "Use WorkflowTemplateManager.createAssessmentWorkflow() to generate complete workflows",
        "Advanced": "Manually integrate RubricSystem and AIPromptBuilder into existing workflows",
        "Quick": "Copy example workflows above and customize as needed"
    },
    
    requiredImports: [
        "RubricSystem from src/lib/ai/RubricSystem",
        "AIPromptBuilder from src/lib/ai/AIPromptBuilder",
        "WorkflowTemplateManager from src/lib/workflows/WorkflowTemplateManager"
    ],

    supportedWorkflowTypes: [
        "grade-assignments",
        "grade-essays",
        "grade-projects",
        "grade-presentations",
        "grade-code",
        "peer-review",
        "analytics-performance",
        "analytics-engagement",
        "analytics-progress"
    ],

    outputFields: [
        "grade (0-100)",
        "performanceLevel (advanced|proficient|developing|beginning|incomplete)",
        "completionPercentage (0-100)",
        "strengths (string[])",
        "improvements (string[])",
        "recommendedActions (string[])",
        "detailedAnalysis (string)",
        "timestamp (ISO string)"
    ],

    testingSteps: [
        "1. Create workflow using template manager",
        "2. Export as N8N JSON",
        "3. Import to N8N platform",
        "4. Test with sample submission",
        "5. Verify rubric generated correctly",
        "6. Check AI prompt includes all context",
        "7. Verify output JSON structure",
        "8. Export to CSV and validate format",
        "9. Review feedback quality",
        "10. Check performance level matches grade"
    ]
};

export default {
    gradeEssaysWorkflow,
    gradeProjectsWorkflow,
    peerReviewWorkflow,
    analyticsWorkflow,
    workflowImports,
    integrationSummary
};
