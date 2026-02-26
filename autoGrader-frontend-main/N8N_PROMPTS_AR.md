# 🤖 Prompts لإنشاء n8n Workflows

## كيفية الاستخدام

1. افتح n8n
2. اضغط على "AI Agent" أو "Generate with AI"
3. انسخ الـ prompt المناسب
4. الصق في n8n AI
5. عدّل حسب الحاجة
6. صدّر الـ workflow

---

## 📝 Task 1: Grade Assignments (تقييم الواجبات)

### Prompt للـ n8n AI:

```
Create a workflow for grading student assignments with these requirements:

INPUT:
- Student ID
- Assignment ID
- Assignment text/content
- Rubric criteria (optional)

WORKFLOW STEPS:
1. Start node to receive input data
2. HTTP Request node to call AI API at http://localhost:3000/api/groq
   - Method: POST
   - Body: { "prompt": "Grade this assignment based on clarity, accuracy, and completeness: [assignment text]" }
3. Function node to process AI response and extract:
   - Grade (0-100)
   - Feedback text
   - Strengths (array)
   - Areas for improvement (array)
4. Set node to format output as:
   {
     "studentId": "...",
     "assignmentId": "...",
     "grade": 85,
     "feedback": "...",
     "strengths": [...],
     "improvements": [...],
     "timestamp": "ISO date"
   }
5. HTTP Request node to save results to http://localhost:3000/api/save-grade
6. (Optional) Email node to notify student

ERROR HANDLING:
- Add error handling for API failures
- Set default grade to 0 if AI fails
- Log all errors

OUTPUT:
Return complete grading result with all fields
```

---

## 📋 Task 2: Generate Rubric (إنشاء معايير التقييم)

### Prompt للـ n8n AI:

```
Create a workflow for generating grading rubrics:

INPUT:
- Course name
- Assignment type (essay, project, exam, etc.)
- Learning objectives (array)
- Point distribution (total points)

WORKFLOW STEPS:
1. Start node to receive input
2. Function node to prepare AI prompt:
   "Create a detailed grading rubric for [assignment type] in [course name].
   Learning objectives: [objectives].
   Total points: [points].
   Include: criteria, point breakdown, performance levels (excellent, good, fair, poor)"
3. HTTP Request to http://localhost:3000/api/groq
   - Method: POST
   - Include the prepared prompt
4. Function node to parse AI response and structure as:
   {
     "courseName": "...",
     "assignmentType": "...",
     "totalPoints": 100,
     "criteria": [
       {
         "name": "Content Quality",
         "points": 40,
         "levels": {
           "excellent": "Clear description...",
           "good": "...",
           "fair": "...",
           "poor": "..."
         }
       }
     ]
   }
5. Set node to add metadata (created date, version)
6. HTTP Request to save rubric at http://localhost:3000/api/save-rubric

OUTPUT:
Complete rubric structure ready to use
```

---

## 📊 Task 3: Student Analytics (تحليل أداء الطلاب)

### Prompt للـ n8n AI:

```
Create a workflow for analyzing student performance:

INPUT:
- Course ID (optional, if empty analyze all)
- Time period (last 7 days, 30 days, semester)
- Analysis type (engagement, grades, at-risk)

WORKFLOW STEPS:
1. Start node to receive parameters
2. HTTP Request to fetch student data from http://localhost:3000/api/moodle/students
   - Include query parameters for filtering
3. Function node to calculate metrics:
   - Average grade per student
   - Engagement rate (logins, submissions, time spent)
   - Completion rate
   - Identify at-risk students (grade < 50 OR engagement < 30%)
4. Function node to perform statistical analysis:
   - Mean, median, standard deviation
   - Grade distribution
   - Trend analysis (improving/declining)
5. HTTP Request to AI API for insights:
   - Send aggregated data
   - Ask for recommendations
6. Set node to format final report:
   {
     "summary": {
       "totalStudents": 150,
       "averageGrade": 75.5,
       "engagementRate": 82,
       "atRiskCount": 12
     },
     "atRiskStudents": [...],
     "recommendations": "...",
     "trends": {...}
   }
7. HTTP Request to save report

OUTPUT:
Comprehensive analytics report with actionable insights
```

---

## 💬 Task 4: Generate Feedback (إنشاء ملاحظات مخصصة)

### Prompt للـ n8n AI:

```
Create a workflow for generating personalized student feedback:

INPUT:
- Student ID
- Student name
- Current grade
- Recent assignments (array with grades)
- Attendance rate
- Participation level

WORKFLOW STEPS:
1. Start node to receive student data
2. Function node to analyze performance:
   - Calculate grade trend (improving/stable/declining)
   - Identify strengths based on high-scoring assignments
   - Identify weaknesses based on low-scoring areas
3. HTTP Request to AI API at http://localhost:3000/api/groq
   - Prompt: "Generate encouraging, personalized feedback for [student name].
     Current grade: [grade]. Trend: [trend].
     Strengths: [strengths]. Areas to improve: [weaknesses].
     Make it supportive, specific, and actionable."
4. Function node to structure feedback:
   {
     "studentId": "...",
     "studentName": "...",
     "overallFeedback": "...",
     "strengths": ["..."],
     "improvements": ["..."],
     "actionItems": ["..."],
     "encouragement": "...",
     "nextSteps": "..."
   }
5. Set node to add teacher signature and date
6. HTTP Request to save feedback
7. (Optional) Email node to send to student

TONE:
- Encouraging and supportive
- Specific and actionable
- Professional but warm

OUTPUT:
Complete personalized feedback ready to share
```

---

## 🎯 Task 5: Assignment Auto-Checker (فحص تلقائي للواجبات)

### Prompt للـ n8n AI:

```
Create a workflow for automatically checking assignment submissions:

INPUT:
- Assignment file/text
- Expected format/requirements
- Plagiarism check (yes/no)
- Code check (if programming assignment)

WORKFLOW STEPS:
1. Start node to receive submission
2. Function node to validate format:
   - Check file type
   - Check word count (if applicable)
   - Check required sections
3. IF node: Is this a code assignment?
   - YES branch:
     * HTTP Request to code analysis API
     * Check syntax, style, best practices
   - NO branch:
     * Continue to content check
4. HTTP Request to plagiarism check API (if enabled)
5. HTTP Request to AI API for content analysis:
   - Check if requirements are met
   - Evaluate quality
   - Suggest improvements
6. Function node to compile results:
   {
     "submissionId": "...",
     "formatCheck": {
       "passed": true,
       "issues": []
     },
     "contentCheck": {
       "requirementsMet": true,
       "quality": "good",
       "suggestions": [...]
     },
     "plagiarismCheck": {
       "score": 5,
       "status": "pass"
     },
     "overallStatus": "approved",
     "feedback": "..."
   }
7. Set node to determine next action (approve/review/reject)
8. HTTP Request to update submission status

OUTPUT:
Complete check report with status and feedback
```

---

## 🔔 Task 6: Student Alert System (نظام تنبيه الطلاب)

### Prompt للـ n8n AI:

```
Create a workflow for monitoring and alerting about student issues:

INPUT:
- Monitoring interval (run every X hours)
- Alert thresholds (grade drop, absence, etc.)

WORKFLOW STEPS:
1. Schedule Trigger node (runs automatically every 6 hours)
2. HTTP Request to fetch recent student data
3. Function node to check alert conditions:
   - Grade dropped > 10 points
   - Missed > 2 consecutive classes
   - No submission in > 7 days
   - Engagement < 20%
4. IF node: Any alerts triggered?
   - NO: End workflow
   - YES: Continue
5. Function node to categorize alerts by severity:
   - Critical (multiple issues)
   - Warning (single issue)
   - Info (minor concern)
6. Loop through each alert:
   - HTTP Request to AI for personalized message
   - Format notification
7. Split into branches:
   - Email to student
   - Email to teacher
   - Save to database
8. Set node to log all alerts sent

ALERT TYPES:
- Grade alert
- Attendance alert
- Engagement alert
- Deadline reminder

OUTPUT:
Log of all alerts sent with timestamps
```

---

## 📈 Task 7: Progress Tracker (متابعة التقدم)

### Prompt للـ n8n AI:

```
Create a workflow for tracking student progress over time:

INPUT:
- Student ID
- Course ID
- Start date
- End date (optional, default: today)

WORKFLOW STEPS:
1. Start node to receive parameters
2. HTTP Request to fetch historical data:
   - All grades in date range
   - All submissions
   - All attendance records
   - All engagement metrics
3. Function node to calculate progress metrics:
   - Grade trajectory (linear regression)
   - Submission consistency
   - Improvement rate
   - Predicted final grade
4. Function node to identify milestones:
   - First A grade
   - Longest streak
   - Biggest improvement
   - Current standing
5. HTTP Request to AI for progress narrative:
   - Summarize journey
   - Highlight achievements
   - Note challenges overcome
6. Set node to create visual data:
   {
     "studentId": "...",
     "period": "...",
     "metrics": {
       "startGrade": 65,
       "currentGrade": 82,
       "improvement": "+17",
       "trajectory": "upward",
       "predictedFinal": 85
     },
     "milestones": [...],
     "narrative": "...",
     "chartData": [...]
   }
7. HTTP Request to save progress report

OUTPUT:
Comprehensive progress report with predictions
```

---

## 🎓 Task 8: Course Insights (رؤى المقرر)

### Prompt للـ n8n AI:

```
Create a workflow for generating course-level insights:

INPUT:
- Course ID
- Analysis period

WORKFLOW STEPS:
1. Start node
2. Parallel branches to fetch data:
   Branch A: Student performance data
   Branch B: Assignment completion rates
   Branch C: Engagement metrics
   Branch D: Feedback/comments
3. Merge node to combine all data
4. Function node to calculate course metrics:
   - Class average
   - Pass/fail rate
   - Most challenging topics
   - Most engaging content
   - Dropout risk percentage
5. HTTP Request to AI for insights:
   - Identify patterns
   - Suggest improvements
   - Predict outcomes
6. Function node to create recommendations:
   {
     "courseId": "...",
     "period": "...",
     "metrics": {...},
     "insights": [
       "Students struggle with Module 4",
       "Video content has 2x engagement",
       "Friday deadlines have lower completion"
     ],
     "recommendations": [
       "Add more examples for Module 4",
       "Convert text to video format",
       "Move deadlines to Wednesday"
     ],
     "predictions": {
       "expectedPassRate": 85,
       "atRiskCount": 8
     }
   }
7. HTTP Request to save insights

OUTPUT:
Actionable course insights and recommendations
```

---

## 💡 نصائح لتحسين Prompts

### عند استخدام n8n AI:

1. **كن محدداً**: اذكر أسماء nodes بوضوح
2. **حدد APIs**: اذكر URLs الفعلية
3. **وضّح البيانات**: اشرح structure المدخلات والمخرجات
4. **أضف error handling**: اطلب معالجة الأخطاء
5. **حدد التنسيق**: اطلب JSON structure محدد

### مثال prompt محسّن:

```
Instead of: "Create a grading workflow"

Use: "Create a workflow with:
- Start node receiving {studentId, assignment}
- HTTP POST to http://localhost:3000/api/groq
- Function node to extract grade (0-100)
- Set node to format as {studentId, grade, feedback}
- Error handling for API failures
- Return JSON output"
```

---

## 🔧 تخصيص Prompts

### لتخصيص أي prompt:

1. **غيّر URLs**: استبدل `localhost:3000` بـ URL الخاص بك
2. **عدّل المعايير**: غيّر thresholds (مثل: grade < 50)
3. **أضف خطوات**: أضف nodes إضافية حسب الحاجة
4. **غيّر اللغة**: اطلب responses بالعربية أو الإنجليزية

### مثال تخصيص:

```
Original: "Check if grade < 50"
Custom: "Check if grade < 60 OR attendance < 75%"
```

---

## ✅ Checklist قبل التصدير

- [ ] جميع URLs صحيحة
- [ ] Error handling موجود
- [ ] Output format واضح
- [ ] اختبرت الـ workflow
- [ ] أضفت descriptions للـ nodes
- [ ] سميت الـ workflow بوضوح

---

**نصيحة أخيرة:** ابدأ بـ prompt بسيط، اختبره، ثم أضف تعقيدات تدريجياً!
