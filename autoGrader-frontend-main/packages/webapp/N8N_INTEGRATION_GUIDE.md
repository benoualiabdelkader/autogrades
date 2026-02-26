# دليل دمج n8n Workflows مع Task Manager

## نظرة عامة

هذا الدليل يشرح كيفية ربط workflows من n8n مع Task Manager في مشروع AutoGrader.

## الخطوات الأساسية

### 1️⃣ إنشاء Workflow في n8n

1. افتح موقع n8n (https://n8n.io أو instance خاص بك)
2. أنشئ workflow جديد
3. أضف nodes حسب احتياجك:
   - **Start Node**: نقطة البداية
   - **HTTP Request**: لاستدعاء APIs
   - **Function**: لكتابة JavaScript مخصص
   - **Set**: لتعيين قيم
   - **IF**: للشروط
   - **Switch**: للتفرعات

#### مثال: Workflow لتقييم الواجبات

```
Start → Get Assignment Data → Call AI API → Calculate Grade → Save Result
```

### 2️⃣ تصدير Workflow من n8n

1. في n8n، اضغط على زر القائمة (⋮)
2. اختر **"Download"**
3. سيتم تحميل ملف JSON

### 3️⃣ إضافة Workflow للمشروع

1. ضع ملف JSON في المجلد:
   ```
   src/lib/n8n/workflows/your-workflow-name.json
   ```

2. تأكد من صحة البنية:
   ```json
   {
     "name": "اسم الـ Workflow",
     "nodes": [...],
     "connections": {...},
     "active": true
   }
   ```

### 4️⃣ ربط Workflow مع Task

#### الطريقة الأولى: تعديل Task يدوياً

في `dashboard/index.tsx`، أضف خاصية `workflowFile` للـ task:

```typescript
{
  id: 1,
  title: 'Grade Assignments',
  description: 'Analyze and grade student assignments',
  prompt: '...',
  icon: '📝',
  active: true,
  workflowFile: 'grade-assignments.json',  // ← أضف هذا
  useN8nAPI: false  // true إذا كنت تستخدم n8n API
}
```

#### الطريقة الثانية: واجهة مستخدم

سنضيف واجهة لربط Workflows بالـ Tasks:

```typescript
// في Task Manager
const [taskWorkflows, setTaskWorkflows] = useState<Record<number, string>>({
  1: 'grade-assignments.json',
  2: 'generate-rubric.json',
  3: 'student-analytics.json'
});
```

### 5️⃣ تنفيذ Workflow

#### من الكود:

```typescript
const executeTaskWorkflow = async (taskId: number, inputData: any) => {
  const task = tasks.find(t => t.id === taskId);
  
  if (!task?.workflowFile) {
    console.log('No workflow attached to this task');
    return;
  }

  try {
    const response = await fetch('/api/n8n/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowFile: task.workflowFile,
        inputData: inputData,
        useAPI: task.useN8nAPI || false
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Workflow executed successfully:', result.data);
      // عرض النتيجة للمستخدم
      setMessages([...messages, {
        role: 'ai',
        content: `✅ Workflow completed: ${JSON.stringify(result.data)}`,
        time: new Date().toLocaleTimeString()
      }]);
    } else {
      console.error('Workflow failed:', result.error);
    }
  } catch (error) {
    console.error('Error executing workflow:', error);
  }
};
```

#### عند اختيار Task:

```typescript
const handleSelectTask = async (task: any) => {
  setSelectedTask(task);
  setShowTaskManager(false);
  
  // إذا كان Task مرتبط بـ workflow
  if (task.workflowFile) {
    setMessages([...messages, {
      role: 'ai',
      content: `${task.icon} Workflow "${task.title}" activated with n8n automation.`,
      time: new Date().toLocaleTimeString()
    }]);
    
    // تنفيذ workflow تلقائياً (اختياري)
    // await executeTaskWorkflow(task.id, { /* بيانات أولية */ });
  }
};
```

## أمثلة Workflows

### مثال 1: تقييم الواجبات

```json
{
  "name": "Grade Assignment",
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "parameters": {}
    },
    {
      "name": "Call AI API",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3000/api/groq",
        "method": "POST",
        "bodyParameters": {
          "parameters": [
            {
              "name": "prompt",
              "value": "Grade this assignment: {{$json.assignment}}"
            }
          ]
        }
      }
    },
    {
      "name": "Process Result",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "return items.map(item => ({
          json: {
            grade: item.json.grade,
            feedback: item.json.feedback,
            timestamp: new Date().toISOString()
          }
        }));"
      }
    }
  ],
  "connections": {
    "Start": { "main": [[{ "node": "Call AI API" }]] },
    "Call AI API": { "main": [[{ "node": "Process Result" }]] }
  }
}
```

### مثال 2: تحليل أداء الطلاب

```json
{
  "name": "Student Analytics",
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.start"
    },
    {
      "name": "Get Student Data",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3000/api/moodle/students",
        "method": "GET"
      }
    },
    {
      "name": "Analyze Performance",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// تحليل البيانات
const students = items[0].json.students;
const atRisk = students.filter(s => s.engagement < 50);
return [{ json: { atRisk, total: students.length } }];"
      }
    }
  ]
}
```

## متغيرات البيئة

أضف في `.env.local`:

```env
# n8n Configuration
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-api-key-here
N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

## خيارات التنفيذ

### 1. تنفيذ محلي (Local Simulation)
- يقرأ ملف JSON
- ينفذ منطق مبسط
- لا يحتاج n8n instance

### 2. تنفيذ عبر n8n API
- يحتاج n8n instance مستضاف
- تنفيذ كامل لجميع nodes
- يدعم جميع integrations

### 3. تنفيذ عبر Webhooks
- n8n يستدعي API الخاص بك
- مناسب للعمليات الطويلة
- يدعم async operations

## نصائح مهمة

1. **اختبر Workflow في n8n أولاً** قبل التصدير
2. **استخدم متغيرات البيئة** للـ URLs والـ API keys
3. **أضف error handling** في كل node
4. **وثق كل workflow** بوصف واضح
5. **استخدم naming conventions** واضحة للملفات

## استكشاف الأخطاء

### Workflow لا يعمل؟
- تحقق من صحة JSON
- تأكد من وجود الملف في المجلد الصحيح
- راجع console logs

### API errors؟
- تحقق من N8N_BASE_URL
- تأكد من صحة API key
- تحقق من أن n8n instance يعمل

### Node-specific errors؟
- راجع parameters كل node
- تأكد من صحة البيانات المدخلة
- اختبر كل node بشكل منفصل

## الخطوات التالية

1. ✅ إنشاء واجهة UI لربط Workflows
2. ✅ إضافة workflow editor مدمج
3. ✅ دعم webhook triggers
4. ✅ إضافة workflow monitoring
5. ✅ إنشاء workflow templates جاهزة

## موارد إضافية

- [n8n Documentation](https://docs.n8n.io)
- [n8n Workflow Examples](https://n8n.io/workflows)
- [n8n API Reference](https://docs.n8n.io/api/)
