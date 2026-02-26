# 🎯 أمثلة عملية: Prompts مع النتائج المتوقعة

## كيفية الاستخدام

1. اختر الـ task المناسب
2. انسخ الـ prompt
3. الصقه في n8n AI
4. راجع النتيجة المتوقعة
5. عدّل حسب احتياجك

---

## 📝 مثال 1: تقييم واجب كتابي

### الـ Prompt:

```
Create n8n workflow for grading essays:

INPUT: {studentId: "S123", assignmentText: "essay content"}

NODES:
1. Start - receive input
2. HTTP POST http://localhost:3000/api/groq
   Body: {"prompt": "Grade this essay on clarity, structure, grammar, and content. Provide score 0-100 and detailed feedback: [text]"}
3. Function - parse response:
   const ai = items[0].json;
   return [{json: {
     grade: ai.grade || 0,
     feedback: ai.feedback || "",
     strengths: ai.strengths || [],
     improvements: ai.improvements || []
   }}];
4. Set - add metadata:
   timestamp: {{$now}}
   gradedBy: "AI"
5. HTTP POST http://localhost:3000/api/save-grade

ERROR: If API fails, return grade: 0, feedback: "Error occurred"
OUTPUT: {studentId, grade, feedback, strengths[], improvements[], timestamp}
```

### النتيجة المتوقعة في n8n:

```
Workflow: "Grade Essay"
├─ Start
├─ HTTP Request (Groq API)
├─ Function (Parse AI Response)
├─ Set (Add Metadata)
└─ HTTP Request (Save Grade)
```

### مثال Output:

```json
{
  "studentId": "S123",
  "grade": 85,
  "feedback": "Well-structured essay with clear arguments...",
  "strengths": [
    "Strong introduction",
    "Good use of examples",
    "Clear conclusion"
  ],
  "improvements": [
    "Add more citations",
    "Expand on counterarguments"
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "gradedBy": "AI"
}
```

---

## 📊 مثال 2: تحليل أداء طالب واحد

### الـ Prompt:

```
Create n8n workflow for single student analysis:

INPUT: {studentId: "S123", courseId: "CS101"}

NODES:
1. Start
2. HTTP GET http://localhost:3000/api/moodle/students?id=S123&course=CS101
3. Function - calculate metrics:
   const student = items[0].json;
   const grades = student.grades || [];
   const avgGrade = grades.reduce((a,b) => a+b, 0) / grades.length;
   const trend = grades[grades.length-1] > grades[0] ? "improving" : "declining";
   return [{json: {
     studentId: student.id,
     avgGrade: avgGrade,
     trend: trend,
     engagement: student.engagement || 0,
     status: avgGrade < 50 ? "at-risk" : "on-track"
   }}];
4. HTTP POST http://localhost:3000/api/groq
   Prompt: "Analyze this student: avg grade {{$json.avgGrade}}, trend {{$json.trend}}, engagement {{$json.engagement}}. Provide recommendations."
5. Set - format report
6. HTTP POST save report

OUTPUT: {studentId, avgGrade, trend, engagement, status, recommendations}
```

### النتيجة المتوقعة:

```
Workflow: "Analyze Student"
├─ Start
├─ HTTP Request (Get Student Data)
├─ Function (Calculate Metrics)
├─ HTTP Request (AI Analysis)
├─ Set (Format Report)
└─ HTTP Request (Save Report)
```

### مثال Output:

```json
{
  "studentId": "S123",
  "avgGrade": 72.5,
  "trend": "improving",
  "engagement": 85,
  "status": "on-track",
  "recommendations": [
    "Continue current study habits",
    "Focus on Module 4 concepts",
    "Participate more in discussions"
  ],
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

---

## 🔔 مثال 3: تنبيه تلقائي للطلاب المتعثرين

### الـ Prompt:

```
Create n8n workflow for automatic at-risk alerts:

TRIGGER: Schedule every 6 hours

NODES:
1. Schedule Trigger (0 */6 * * *)
2. HTTP GET http://localhost:3000/api/moodle/students
3. Function - filter at-risk:
   const students = items[0].json.students || [];
   const atRisk = students.filter(s => 
     s.grade < 50 || 
     s.engagement < 30 || 
     s.missedClasses > 2
   );
   return atRisk.map(s => ({json: s}));
4. IF node: {{$json.length}} > 0
   TRUE branch:
     5a. Loop over students
     6a. HTTP POST to AI: "Create supportive alert message for student with grade {{$json.grade}}"
     7a. Email node: send to student
     8a. Email node: send to teacher
     9a. HTTP POST: log alert
   FALSE branch:
     5b. Set: {message: "No alerts needed"}
     6b. End

OUTPUT: {alertsSent: number, students: [...]}
```

### النتيجة المتوقعة:

```
Workflow: "At-Risk Alerts"
├─ Schedule Trigger (every 6h)
├─ HTTP Request (Get All Students)
├─ Function (Filter At-Risk)
├─ IF (Any at-risk?)
│  ├─ TRUE:
│  │  ├─ Loop (Each Student)
│  │  ├─ HTTP Request (AI Message)
│  │  ├─ Email (To Student)
│  │  ├─ Email (To Teacher)
│  │  └─ HTTP Request (Log)
│  └─ FALSE:
│     └─ Set (No Alerts)
└─ End
```

### مثال Output:

```json
{
  "alertsSent": 3,
  "timestamp": "2024-01-15T12:00:00Z",
  "students": [
    {
      "studentId": "S101",
      "name": "أحمد محمد",
      "reason": "grade < 50",
      "grade": 45,
      "messageSent": true
    },
    {
      "studentId": "S205",
      "name": "فاطمة علي",
      "reason": "engagement < 30",
      "engagement": 25,
      "messageSent": true
    }
  ]
}
```

---

## 📋 مثال 4: إنشاء Rubric تفاعلي

### الـ Prompt:

```
Create n8n workflow for interactive rubric generation:

INPUT: {
  courseName: "Computer Science 101",
  assignmentType: "Programming Project",
  objectives: ["Code quality", "Documentation", "Functionality"],
  totalPoints: 100
}

NODES:
1. Start
2. Function - prepare detailed prompt:
   const objectives = $json.objectives.join(", ");
   const prompt = `Create a detailed grading rubric for ${$json.assignmentType} in ${$json.courseName}.
   
   Learning objectives: ${objectives}
   Total points: ${$json.totalPoints}
   
   For each objective, provide:
   - Point allocation
   - 4 performance levels: Excellent (90-100%), Good (75-89%), Fair (60-74%), Poor (<60%)
   - Specific criteria for each level
   
   Format as JSON.`;
   return [{json: {prompt}}];
3. HTTP POST http://localhost:3000/api/groq
4. Function - structure rubric:
   const ai = items[0].json;
   const criteria = [];
   
   $json.objectives.forEach((obj, i) => {
     criteria.push({
       id: i + 1,
       name: obj,
       points: Math.floor($json.totalPoints / $json.objectives.length),
       levels: {
         excellent: ai[`${obj}_excellent`] || "",
         good: ai[`${obj}_good`] || "",
         fair: ai[`${obj}_fair`] || "",
         poor: ai[`${obj}_poor`] || ""
       }
     });
   });
   
   return [{json: {
     courseName: $json.courseName,
     assignmentType: $json.assignmentType,
     totalPoints: $json.totalPoints,
     criteria: criteria,
     createdAt: new Date().toISOString()
   }}];
5. HTTP POST http://localhost:3000/api/save-rubric

OUTPUT: Complete rubric structure
```

### النتيجة المتوقعة:

```
Workflow: "Generate Rubric"
├─ Start
├─ Function (Prepare Prompt)
├─ HTTP Request (AI Generation)
├─ Function (Structure Rubric)
└─ HTTP Request (Save)
```

### مثال Output:

```json
{
  "courseName": "Computer Science 101",
  "assignmentType": "Programming Project",
  "totalPoints": 100,
  "criteria": [
    {
      "id": 1,
      "name": "Code Quality",
      "points": 33,
      "levels": {
        "excellent": "Clean, well-organized code following best practices. Proper naming conventions. Efficient algorithms.",
        "good": "Mostly clean code with minor issues. Good structure. Acceptable efficiency.",
        "fair": "Code works but has organization issues. Some inefficiencies.",
        "poor": "Poorly organized code. Hard to read. Inefficient."
      }
    },
    {
      "id": 2,
      "name": "Documentation",
      "points": 33,
      "levels": {
        "excellent": "Comprehensive comments. Clear README. All functions documented.",
        "good": "Good comments. Basic README. Most functions documented.",
        "fair": "Minimal comments. Incomplete documentation.",
        "poor": "Little to no documentation."
      }
    },
    {
      "id": 3,
      "name": "Functionality",
      "points": 34,
      "levels": {
        "excellent": "All features work perfectly. Handles edge cases. No bugs.",
        "good": "Main features work. Minor bugs. Most edge cases handled.",
        "fair": "Basic functionality works. Several bugs. Limited edge case handling.",
        "poor": "Major features broken. Many bugs."
      }
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## 💬 مثال 5: ملاحظات مخصصة مع أمثلة

### الـ Prompt:

```
Create n8n workflow for personalized feedback with examples:

INPUT: {
  studentId: "S123",
  name: "أحمد محمد",
  grade: 75,
  recentGrades: [65, 70, 72, 75],
  strengths: ["Problem solving", "Creativity"],
  weaknesses: ["Time management", "Documentation"]
}

NODES:
1. Start
2. Function - analyze trend:
   const grades = $json.recentGrades;
   const trend = grades[grades.length-1] > grades[0] ? "improving" : "declining";
   const improvement = grades[grades.length-1] - grades[0];
   return [{json: {...$json, trend, improvement}}];
3. HTTP POST http://localhost:3000/api/groq
   Prompt: `Generate encouraging Arabic feedback for ${$json.name}.
   
   Current grade: ${$json.grade}/100
   Trend: ${$json.trend} (${$json.improvement} points)
   Strengths: ${$json.strengths.join(", ")}
   Areas to improve: ${$json.weaknesses.join(", ")}
   
   Include:
   1. Positive opening acknowledging progress
   2. Specific praise for strengths with examples
   3. Constructive suggestions for improvements
   4. 3 actionable next steps
   5. Encouraging closing
   
   Tone: Supportive, specific, motivating
   Language: Arabic`
4. Function - structure feedback:
   return [{json: {
     studentId: $json.studentId,
     studentName: $json.name,
     currentGrade: $json.grade,
     trend: $json.trend,
     feedback: items[0].json.feedback,
     actionItems: items[0].json.actionItems || [],
     createdAt: new Date().toISOString()
   }}];
5. HTTP POST http://localhost:3000/api/save-feedback
6. Email node (optional)

OUTPUT: Personalized feedback in Arabic
```

### مثال Output:

```json
{
  "studentId": "S123",
  "studentName": "أحمد محمد",
  "currentGrade": 75,
  "trend": "improving",
  "feedback": "عزيزي أحمد،\n\nيسعدني أن أرى تقدمك المستمر! ارتفعت درجتك من 65 إلى 75 خلال الفترة الماضية، وهذا يعكس جهدك واجتهادك.\n\nنقاط القوة:\n- مهاراتك في حل المشكلات ممتازة، خاصة في المشروع الأخير حيث وجدت حلاً إبداعياً للتحدي الرئيسي\n- إبداعك واضح في طريقة تقديمك للأفكار\n\nمجالات التحسين:\n- إدارة الوقت: حاول تقسيم المهام الكبيرة إلى أجزاء صغيرة\n- التوثيق: أضف تعليقات أكثر في الكود لتسهيل المراجعة\n\nاستمر في هذا المسار الرائع!",
  "actionItems": [
    "استخدم تقنية Pomodoro لإدارة الوقت",
    "اكتب تعليق لكل دالة قبل البدء بكتابتها",
    "راجع أمثلة التوثيق الجيد في المكتبة"
  ],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## 🎯 نصائح لتحسين النتائج

### 1. كن محدداً في الـ Prompt

❌ سيء:
```
Create a grading workflow
```

✅ جيد:
```
Create n8n workflow with Start node, HTTP POST to API, Function to parse, Set to format, error handling
```

### 2. حدد البيانات بوضوح

❌ سيء:
```
INPUT: student data
```

✅ جيد:
```
INPUT: {studentId: string, grade: number, assignments: array}
```

### 3. اطلب error handling

❌ سيء:
```
Call API and return result
```

✅ جيد:
```
Call API, if fails return {error: true, message: "..."}
```

### 4. حدد التنسيق المطلوب

❌ سيء:
```
Return the results
```

✅ جيد:
```
Return JSON: {studentId, grade, feedback, timestamp}
```

---

## 📚 المزيد من الأمثلة

راجع:
- `N8N_PROMPTS_AR.md` - prompts مفصلة
- `N8N_PROMPTS_QUICK.md` - prompts سريعة للنسخ
- `N8N_INTEGRATION_GUIDE.md` - دليل التكامل الكامل
