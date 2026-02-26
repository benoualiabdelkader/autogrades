# دمج n8n مع AutoGrader

## الفكرة

ربط Task Manager بـ workflows من n8n لأتمتة العمليات التعليمية.

## البنية

```
n8n/
├── workflows/              # ملفات JSON المصدرة من n8n
│   ├── grade-assignments.json
│   ├── generate-rubric.json
│   └── student-analytics.json
├── WorkflowExecutor.ts    # محرك تنفيذ workflows
└── types.ts               # تعريفات TypeScript
```

## مثال سريع

### 1. صدّر workflow من n8n

في n8n:
- أنشئ workflow
- اضغط ⋮ → Download
- احفظ الملف

### 2. ضع الملف في المشروع

```bash
cp my-workflow.json src/lib/n8n/workflows/
```

### 3. اربطه بـ Task

```typescript
// في dashboard/index.tsx
const [tasks, setTasks] = useState([
  {
    id: 1,
    title: 'Grade Assignments',
    workflowFile: 'grade-assignments.json', // ← أضف هذا
    // ... باقي الخصائص
  }
]);
```

### 4. نفّذ Workflow

```typescript
// عند اختيار task
const response = await fetch('/api/n8n/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    workflowFile: 'grade-assignments.json',
    inputData: {
      studentId: 123,
      assignmentId: 456,
      submission: 'نص الواجب...'
    }
  })
});

const result = await response.json();
console.log(result.data); // النتيجة
```

## أمثلة Workflows

### تقييم واجب

```json
{
  "name": "Grade Assignment",
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.start"
    },
    {
      "name": "AI Grading",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3000/api/groq",
        "method": "POST",
        "body": {
          "prompt": "قيّم هذا الواجب: {{$json.submission}}"
        }
      }
    }
  ]
}
```

### تحليل الطلاب

```json
{
  "name": "Analyze Students",
  "nodes": [
    {
      "name": "Get Data",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3000/api/moodle/students"
      }
    },
    {
      "name": "Find At-Risk",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "code": "return items[0].json.students.filter(s => s.grade < 50)"
      }
    }
  ]
}
```

## API Endpoints

### POST /api/n8n/execute

تنفيذ workflow

**Request:**
```json
{
  "workflowFile": "grade-assignments.json",
  "inputData": { "key": "value" },
  "useAPI": false
}
```

**Response:**
```json
{
  "success": true,
  "data": { "result": "..." },
  "executionId": "exec_123456"
}
```

## متغيرات البيئة

```env
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-key
```

## نصائح

✅ اختبر في n8n أولاً  
✅ استخدم أسماء واضحة للملفات  
✅ أضف error handling  
✅ وثّق كل workflow  

## المزيد

راجع `N8N_INTEGRATION_GUIDE.md` للتفاصيل الكاملة.
