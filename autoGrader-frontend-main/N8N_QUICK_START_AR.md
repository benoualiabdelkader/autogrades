# دليل سريع: دمج n8n مع AutoGrader

## 🎯 الهدف

ربط Task Manager بـ workflows من n8n لأتمتة عمليات التقييم والتحليل.

## 📋 ما تم إنشاؤه

```
✅ src/lib/n8n/
   ├── types.ts                    # تعريفات TypeScript
   ├── WorkflowExecutor.ts         # محرك التنفيذ
   ├── workflows/                  # مجلد workflows
   │   └── grade-assignments.json  # مثال workflow
   └── README.md                   # دليل مختصر

✅ src/pages/api/n8n/
   └── execute.ts                  # API endpoint للتنفيذ

✅ Documentation/
   ├── N8N_INTEGRATION_GUIDE.md   # دليل شامل
   ├── TASK_N8N_EXAMPLE.md        # مثال عملي
   └── .env.n8n.example           # متغيرات البيئة
```

## 🚀 البدء السريع

### 1. في n8n

1. افتح https://n8n.io أو instance خاص
2. أنشئ workflow جديد
3. أضف nodes (مثال: Start → HTTP Request → Function)
4. اختبر الـ workflow
5. اضغط ⋮ → Download
6. احفظ ملف JSON

### 2. في المشروع

```bash
# ضع ملف workflow
cp my-workflow.json packages/webapp/src/lib/n8n/workflows/

# أضف متغيرات البيئة (اختياري)
cp .env.n8n.example .env.local
# عدّل القيم في .env.local
```

### 3. ربط بـ Task

في `dashboard/index.tsx`:

```typescript
const [tasks, setTasks] = useState([
  {
    id: 1,
    title: 'Grade Assignments',
    // ... الخصائص الموجودة
    workflowFile: 'my-workflow.json',  // ← أضف
    workflowEnabled: true               // ← أضف
  }
]);
```

### 4. تنفيذ Workflow

```typescript
// أضف هذه الدالة
const executeWorkflow = async (taskId, data) => {
  const task = tasks.find(t => t.id === taskId);
  
  const res = await fetch('/api/n8n/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowFile: task.workflowFile,
      inputData: data
    })
  });
  
  return await res.json();
};

// استخدمها عند الحاجة
const result = await executeWorkflow(1, { 
  assignment: 'نص الواجب...' 
});
```

## 💡 أمثلة Workflows

### تقييم واجب

```json
{
  "name": "Grade Assignment",
  "nodes": [
    { "type": "n8n-nodes-base.start" },
    { 
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://localhost:3000/api/groq",
        "method": "POST"
      }
    }
  ]
}
```

### تحليل طلاب

```json
{
  "name": "Analyze Students",
  "nodes": [
    { "type": "n8n-nodes-base.start" },
    {
      "type": "n8n-nodes-base.function",
      "parameters": {
        "code": "return items.filter(s => s.grade < 50)"
      }
    }
  ]
}
```

## 🔧 خيارات التنفيذ

### محلي (Local)
- لا يحتاج n8n server
- تنفيذ مبسط
- مناسب للتطوير

```typescript
workflowFile: 'my-workflow.json',
useN8nAPI: false  // ← محلي
```

### عبر API
- يحتاج n8n instance
- تنفيذ كامل
- مناسب للإنتاج

```typescript
workflowFile: 'my-workflow.json',
useN8nAPI: true  // ← عبر API
```

## 📚 الملفات المهمة

| ملف | الوصف |
|-----|-------|
| `N8N_INTEGRATION_GUIDE.md` | دليل شامل مفصل |
| `TASK_N8N_EXAMPLE.md` | مثال عملي خطوة بخطوة |
| `src/lib/n8n/README.md` | دليل تقني مختصر |
| `.env.n8n.example` | متغيرات البيئة |

## ✅ الخطوات التالية

1. جرّب المثال الموجود (`grade-assignments.json`)
2. أنشئ workflow خاص بك في n8n
3. صدّره وأضفه للمشروع
4. اربطه بـ task
5. اختبر التنفيذ

## 🆘 مشاكل شائعة

**Workflow لا يعمل؟**
- تحقق من اسم الملف
- تأكد من صحة JSON
- راجع console logs

**API errors؟**
- تحقق من N8N_BASE_URL
- تأكد من API key
- تحقق أن n8n يعمل

## 📞 المساعدة

- راجع `N8N_INTEGRATION_GUIDE.md` للتفاصيل
- اقرأ [n8n docs](https://docs.n8n.io)
- تحقق من الأمثلة في `workflows/`
