# مثال عملي: ربط Task بـ n8n Workflow

## السيناريو

نريد ربط Task "Grade Assignments" بـ workflow من n8n يقوم بـ:
1. استقبال بيانات الواجب
2. استدعاء AI API للتقييم
3. حفظ النتيجة
4. إرسال إشعار للطالب

## الخطوات

### 1. إنشاء Workflow في n8n

افتح n8n وأنشئ workflow بهذه الـ nodes:

```
Start → HTTP Request (AI API) → Set (Format Data) → HTTP Request (Save) → Email
```

### 2. تصدير وحفظ

- Download من n8n
- احفظ كـ `grade-assignments.json`
- ضعه في `src/lib/n8n/workflows/`

### 3. تحديث Task في Dashboard


في `dashboard/index.tsx`، عدّل task:

```typescript
{
  id: 1,
  title: 'Grade Assignments',
  description: 'Analyze and grade student assignments',
  prompt: 'You are an expert grading assistant...',
  icon: '📝',
  active: true,
  // ← أضف هذه الخصائص الجديدة
  workflowFile: 'grade-assignments.json',
  useN8nAPI: false, // true إذا كنت تستخدم n8n hosted
  workflowEnabled: true
}
```

### 4. إضافة دالة التنفيذ

```typescript
const executeTaskWorkflow = async (taskId: number, data: any) => {
  const task = tasks.find(t => t.id === taskId);
  
  if (!task?.workflowFile || !task.workflowEnabled) {
    return null;
  }

  const response = await fetch('/api/n8n/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowFile: task.workflowFile,
      inputData: data,
      useAPI: task.useN8nAPI
    })
  });

  return await response.json();
};
```

### 5. استخدام Workflow

```typescript
// عند إرسال رسالة في Chat
const handleSendMessage = async () => {
  if (chatInput.trim() && selectedTask) {
    // إضافة رسالة المستخدم
    setMessages([...messages, { 
      role: 'user', 
      content: chatInput, 
      time: new Date().toLocaleTimeString() 
    }]);

    // تنفيذ workflow إذا كان مفعّل
    if (selectedTask.workflowEnabled) {
      setIsThinking(true);
      
      const result = await executeTaskWorkflow(selectedTask.id, {
        userMessage: chatInput,
        context: 'grading',
        timestamp: Date.now()
      });

      if (result?.success) {
        setMessages(prev => [...prev, {
          role: 'ai',
          content: `✅ Workflow completed: ${JSON.stringify(result.data, null, 2)}`,
          time: new Date().toLocaleTimeString()
        }]);
      }
      
      setIsThinking(false);
    }

    setChatInput('');
  }
};
```

## النتيجة

الآن عند:
1. اختيار Task "Grade Assignments"
2. كتابة رسالة في Chat
3. سيتم تنفيذ n8n workflow تلقائياً
4. عرض النتيجة في Chat

## تخصيص إضافي

### إضافة زر لتنفيذ يدوي

```typescript
<button
  onClick={() => executeTaskWorkflow(selectedTask.id, {})}
  className="bg-primary px-4 py-2 rounded"
>
  🔄 Run Workflow
</button>
```

### عرض حالة Workflow

```typescript
{selectedTask?.workflowEnabled && (
  <span className="text-xs text-green-400">
    ⚡ n8n Automation Active
  </span>
)}
```

## ملاحظات

- يمكنك تعطيل workflow بتغيير `workflowEnabled: false`
- استخدم `useN8nAPI: true` للتنفيذ عبر n8n server
- أضف error handling مناسب
