# 🎯 Quick Start - Enhanced AI Assistant

> Get up and running in 15 minutes with code examples

## 1️⃣ Basic Setup (2 minutes)

```typescript
import EnhancedAIAssistant from '@/lib/ai/EnhancedAIAssistant';

// Create assistant
const chatbot = EnhancedAIAssistant.create({
  sessionId: `chat_${Date.now()}`,
  userId: 'user_123',
  enableAnalytics: true
});

// That's it! You're ready to go.
```

## 2️⃣ Process Your First Query (3 minutes)

```typescript
// User asks a question
const userQuery = "How do I build a machine learning model?";

// Get intelligent response
const response = await chatbot.processQuery(userQuery);

// Response structure:
console.log(response.response.tldr);              // "In short: ..."
console.log(response.response.explanation);      // Full explanation
console.log(response.response.example);          // Code example (if applicable)
console.log(response.response.followUpQuestion); // Suggested follow-up

// Metadata & Performance
console.log(response.metadata.intentClassification.primaryIntent); // 'teaching'
console.log(response.metadata.responseQuality);  // 0-100 score
console.log(response.performance.processingTime); // ms
```

## 3️⃣ Collect Feedback (2 minutes)

```typescript
// User found response helpful
chatbot.recordFeedback(responseId, {
  helpful: true,
  quality: 'excellent',
  accuracy: 95,
  clarityRating: 92,
  relevance: 94,
  wasFollowUpAnswered: true
});

// Session wrap-up
chatbot.recordSessionFeedback(
  satisfaction = 85,  // 0-100
  improvementAreas = [],
  notes = "Very helpful chatbot!"
);
```

## 4️⃣ Generate Workflows & Rubrics (5 minutes)

```typescript
// Generate assessment workflow
const workflow = await chatbot.generateWorkflow({
  type: 'assessment',
  assignmentType: 'essay',
  courseLevel: 'advanced'
});

// Get N8N-ready JSON
const n8nJson = workflow.exportedJSON;
// Can be directly imported into N8N

// Generate rubric
const rubric = await chatbot.generateRubric('project', 'intermediate');

// Generate grading prompt
const gradingPrompt = await chatbot.generateGradingPrompt(
  'code_project',
  studentSubmissionText
);
```

## 5️⃣ Monitor Performance (3 minutes)

```typescript
// Get session metrics
const metrics = chatbot.getMetrics('session');
// {
//   totalQueries: 5,
//   averageResponseTime: 1200,  // ms
//   clarificationCount: 1,
//   workflowsGenerated: 1
// }

// Get analytics report
const report = chatbot.getAnalyticsReport();
// {
//   kpi: {
//     userSatisfaction: 85.5,
//     responseAccuracy: 88.3,
//     clarificationRate: 15.2,
//     followUpEngagementRate: 72.0
//   },
//   topErrors: [...],
//   recommendations: [...]
// }

// View specific KPIs
const kpi = chatbot.getMetrics('week');
console.log(`User Satisfaction: ${kpi.userSatisfaction}%`);
console.log(`Response Accuracy: ${kpi.responseAccuracy}%`);
```

---

## 📋 Complete Example: Tutoring Bot

```typescript
import EnhancedAIAssistant from '@/lib/ai/EnhancedAIAssistant';

// Initialize
const tutorBot = EnhancedAIAssistant.create({
  sessionId: 'tutoring_001',
  userId: 'student_456'
});

async function tutoringSession() {
  try {
    // Question 1
    let response = await tutorBot.processQuery(
      "Explain photosynthesis"
    );
    
    console.log("Bot:", response.response.explanation);
    // Bot detects: teaching intent + simplification
    
    // Student feedback
    tutorBot.recordFeedback('response_1', {
      helpful: true,
      quality: 'good',
      accuracy: 85,
      clarityRating: 90,
      relevance: 88,
      wasFollowUpAnswered: false
    });

    // Follow-up based on suggestion
    if (response.suggestedActions.length > 0) {
      response = await tutorBot.askForClarification(
        response.suggestedActions[0].prompt
      );
      console.log("Bot:", response.response.explanation);
    }

    // Question 2
    response = await tutorBot.processQuery(
      "Show me Python code for a neural network"
    );
    
    console.log("Code:", response.response.example);
    // Bot detects: code_example intent

    // Wrap up
    tutorBot.recordSessionFeedback(
      satisfaction = 88,
      improvementAreas = [],
      notes = "Great explanations!"
    );

    // Get metrics
    const sessionInfo = tutorBot.getSessionInfo();
    console.log(`Session duration: ${sessionInfo.duration}ms`);
    console.log(`Messages: ${sessionInfo.messageCount}`);
    console.log(`Quality: ${sessionInfo.performance}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run session
await tutoringSession();
```

---

## 📚 Common Tasks

### Detect Intent Only (No Response)

```typescript
import IntentClassifier from '@/lib/ai/IntentClassifier';

const classification = IntentClassifier.classifyIntent(
  "Show me a JavaScript example",
  sessionId
);

console.log(classification.primaryIntent);  // 'code_example'
console.log(classification.entities);        // Language, concept, etc.
console.log(classification.metadata.userMood); // User's emotional state
```

### Get Context Summary

```typescript
import ContextManager from '@/lib/ai/ContextManager';

const summary = ContextManager.getContextSummary(sessionId);
console.log(summary.activeTopics);        // Topics discussed
console.log(summary.keyEntities);         // Important concepts
console.log(summary.suggestedFollowUp);   // Recommended next step
```

### Build Custom Response  

```typescript
import ResponseBuilder from '@/lib/ai/ResponseBuilder';

const customResponse = ResponseBuilder.buildStructuredResponse(
  userQuery,
  intentClassification,
  contextSummary,
  {
    intent: 'steps',
    entities: ['python', 'api'],
    contextSummary: { /* ... */ },
    userMood: 'excited',
    detailLevel: 'high',
    interactionStyle: 'casual'
  }
);
```

### Get Analytics

```typescript
import AnalyticsAndFeedback from '@/lib/ai/AnalyticsAndFeedback';

// KPI metrics
const kpi = AnalyticsAndFeedback.getKPIMetrics();
console.log(`User Satisfaction: ${kpi.userSatisfaction}%`);

// Error analysis
const errors = AnalyticsAndFeedback.getErrorAnalysis(5);
console.log("Top errors:", errors.topErrors);

// Full report
const report = AnalyticsAndFeedback.generateAnalyticsReport(
  startTime,
  endTime
);
console.log("Recommendations:", report.recommendations);
```

---

## 🎨 Response Format Examples

### Teaching Intent Response
```
TL;DR: Photosynthesis is how plants convert light into chemical energy

Explanation: Here are the key concepts...
- Light reactions
- Calvin cycle
- Chlorophyll role

Follow-up: Do you want to understand the light reactions in detail?
```

### Code Example Intent Response
```
TL;DR: Here's how to build an async function

Explanation: Async functions allow asynchronous operations...

Example:
```python
async def fetch_data():
    data = await get_from_api()
    return data
```

Follow-up: Would you like to see error handling?
```

### Steps Intent Response
```
TL;DR: Building an ML model involves these steps

Steps:
1. Prepare your data
2. Choose an algorithm
3. Train the model
4. Evaluate performance
5. Deploy

Tips:
- Use cross-validation
- Monitor for overfitting

Follow-up: Need help with any specific step?
```

---

## ⚙️ Configuration Options

```typescript
const assistant = EnhancedAIAssistant.create({
  // Required
  sessionId: 'unique_session_id',
  userId: 'user_id',
  
  // Optional
  enableAnalytics: true,        // Track KPIs and feedback
  enableSelfCorrection: true,   // Fix response issues
  enablePromptChaining: true,   // Use multi-step prompts
  modelName: 'qwen2-32b',       // LLM model
  apiKey: 'your-api-key'        // API credentials
});
```

---

## 🚨 Error Handling

```typescript
async function safeChat(query) {
  try {
    const response = await chatbot.processQuery(query);
    return response;
  } catch (error) {
    // Log error for analysis
    AnalyticsAndFeedback.logError(
      sessionId,
      'unknown_intent',
      query,
      'Error occurred',
      'other',
      error.message
    );
    
    // Return fallback
    return {
      response: {
        tldr: "I'm having trouble understanding that.",
        explanation: "Could you rephrase your question?",
        followUpQuestion: "What exactly would you like to know?"
      }
    };
  }
}
```

---

## 📊 Monitoring Checklist

Daily:
- [ ] Check error logs: `AnalyticsAndFeedback.getErrorAnalysis()`
- [ ] Monitor satisfaction: `chatbot.getMetrics('day')`

Weekly:  
- [ ] Review analytics report: `chatbot.getAnalyticsReport()`
- [ ] Check KPIs against targets
- [ ] Update templates based on low-scoring responses

Monthly:
- [ ] Analyze trends
- [ ] Plan improvements
- [ ] Scale or optimize

---

## ✅ Success Checklist

- [ ] Assistant responds to intentions correctly
- [ ] Context is maintained across messages
- [ ] Responses are natural and helpful
- [ ] Analytics show 80%+ satisfaction
- [ ] Error rate <5%
- [ ] Workflows/rubrics generate correctly
- [ ] System improving over time (learning progress)

---

## 🎓 Next: Advanced Implementation

For deeper customization, see [ENHANCED_AI_ASSISTANT_GUIDE.md](./ENHANCED_AI_ASSISTANT_GUIDE.md)

For integration with workflows/rubrics, see [Universal System](./UNIVERSAL_WORKFLOW_SYSTEM.md)

---

**Ready to Power Your AI Chatbot?** 🚀

Start with the basic setup above, then gradually add features as needed!
