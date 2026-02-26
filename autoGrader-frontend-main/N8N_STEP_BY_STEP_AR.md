# دليل خطوة بخطوة: من n8n إلى AutoGrader

## 🎬 السيناريو الكامل

سنقوم بإنشاء workflow لتقييم الواجبات وربطه بـ Task Manager.

---

## المرحلة 1: في n8n 🌐

### الخطوة 1.1: إنشاء Workflow جديد

```
1. افتح https://n8n.io أو instance خاص
2. اضغط "New Workflow"
3. سمّه "Grade Assignment Workflow"
```

### الخطوة 1.2: إضافة Nodes

#### Node 1: Start (نقطة البداية)

```
- اسحب "Start" node من القائمة
- ضعه في المنتصف
- لا يحتاج إعدادات
```

#### Node 2: HTTP Request (استدعاء AI)

```
- اسحب "HTTP Request" node
- اربطه بـ Start
- الإعدادات:
  ✓ Method: POST
  ✓ URL: http://localhost:3000/api/groq
  ✓ Body:
    {
      "prompt": "قيّم هذا الواجب: {{$json.assignment}}"
    }
```

#### Node 3: Function (معالجة النتيجة)

```
- اسحب "Function" node
- اربطه بـ HTTP Request
- الكود:
  
  const response = items[0].json;
  return [{
    json: {
      grade: response.grade || 0,
      feedback: response.feedback || '',
      timestamp: new Date().toISOString()
    }
  }];
```

### الخطوة 1.3: اختبار Workflow

```
1. اضغط "Execute Workflow"
2. أدخل بيانات تجريبية:
   {
     "assignment": "مثال على واجب..."
   }
3. تحقق من النتيجة
4. عدّل إذا لزم الأمر
```

### الخطوة 1.4: تصدير Workflow

```
1. اضغط على القائمة (⋮) أعلى اليمين
2. اختر "Download"
3. سيتم تحميل ملف JSON
4. سمّه: grade-assignment-workflow.json
```

---

## المرحلة 2: في المشروع 💻

### الخطوة 2.1: نقل الملف

```bash
# في terminal
cd autoGrader-frontend-main/packages/webapp

# انسخ الملف
cp ~/Downloads/grade-assignment-workflow.json \
   src/lib/n8n/workflows/
```

### الخطوة 2.2: التحقق من الملف

```bash
# تحقق من وجود الملف
ls src/lib/n8n/workflows/

# يجب أن ترى:
# grade-assignments.json (المثال)
# grade-assignment-workflow.json (ملفك الجديد)
```

### الخطوة 2.3: فتح Dashboard

```typescript
// افتح: src/pages/dashboard/index.tsx
```

### الخطوة 2.4: إضافة Task جديد

ابحث عن:
```typescript
const [tasks, setTasks] = useState([
```

أضف task جديد:
```typescript
{
  id: 5,  // رقم جديد
  title: 'Auto Grade with n8n',
  description: 'Automatic grading using n8n workflow',
  prompt: 'You are using n8n automation for grading.',
  icon: '⚡',
  active: true,
  // ← الخصائص الجديدة
  workflowFile: 'grade-assignment-workflow.json',
  workflowEnabled: true,
  useN8nAPI: false  // محلي للتجربة
}
```

### الخطوة 2.5: إضافة دالة التنفيذ

أضف هذه الدالة في Component:

```typescript
const executeTaskWorkflow = async (taskId: number, inputData: any) => {
  const task = tasks.find(t => t.id === taskId);
  
  if (!task?.workflowFile || !task.workflowEnabled) {
    console.log('No workflow enabled for this task');
    return null;
  }

  try {
    setIsThinking(true);
    
    const response = await fetch('/api/n8n/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflowFile: task.workflowFile,
        inputData: inputData,
        useAPI: task.useN8nAPI || false
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // إضافة رسالة بالنتيجة
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `✅ Workflow executed successfully!\n\nResult: ${JSON.stringify(result.data, null, 2)}`,
        time: new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }]);
    } else {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `❌ Workflow failed: ${result.error}`,
        time: new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }]);
    }
    
    return result;
  } catch (error: any) {
    console.error('Error executing workflow:', error);
    setMessages(prev => [...prev, {
      role: 'ai',
      content: `❌ Error: ${error.message}`,
      time: new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }]);
    return null;
  } finally {
    setIsThinking(false);
  }
};
```

### الخطوة 2.6: تعديل handleSelectTask

ابحث عن دالة `handleSelectTask` وعدّلها:

```typescript
const handleSelectTask = async (task: any) => {
  setSelectedTask(task);
  setShowTaskManager(false);
  
  // رسالة تفعيل
  let activationMessage = `${task.icon} Workflow "${task.title}" activated.`;
  
  // إذا كان مرتبط بـ n8n
  if (task.workflowEnabled && task.workflowFile) {
    activationMessage += ` ⚡ n8n automation enabled (${task.workflowFile})`;
  }
  
  setMessages([...messages, {
    role: 'ai',
    content: activationMessage,
    time: new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }]);
};
```

### الخطوة 2.7: تعديل handleSendMessage

عدّل دالة إرسال الرسائل لتنفيذ workflow:

```typescript
const handleSendMessage = async () => {
  if (chatInput.trim()) {
    // التحقق من أمر task
    if (chatInput.trim().toLowerCase() === 'task') {
      setShowTaskManager(true);
      setChatInput('');
      return;
    }
    
    // إضافة رسالة المستخدم
    const userMessage = {
      role: 'user',
      content: chatInput,
      time: new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
    setMessages([...messages, userMessage]);
    
    // تنفيذ workflow إذا كان مفعّل
    if (selectedTask?.workflowEnabled && selectedTask?.workflowFile) {
      await executeTaskWorkflow(selectedTask.id, {
        userMessage: chatInput,
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        timestamp: Date.now()
      });
    } else {
      // السلوك العادي (بدون workflow)
      setIsThinking(true);
      // ... باقي الكود
    }
    
    setChatInput('');
  }
};
```

---

## المرحلة 3: الاختبار 🧪

### الخطوة 3.1: تشغيل المشروع

```bash
cd packages/webapp
npm run dev
```

### الخطوة 3.2: فتح Dashboard

```
افتح: http://localhost:3000/dashboard
```

### الخطوة 3.3: اختيار Task

```
1. اضغط "Manage Tasks" في الـ Chat
2. اختر "Auto Grade with n8n"
3. يجب أن ترى رسالة تفعيل مع ⚡
```

### الخطوة 3.4: اختبار Workflow

```
1. اكتب في Chat:
   "قيّم هذا الواجب: الطالب كتب مقال عن الذكاء الاصطناعي"

2. اضغط Enter

3. انتظر النتيجة

4. يجب أن ترى:
   ✅ Workflow executed successfully!
   Result: { grade: ..., feedback: ... }
```

---

## المرحلة 4: التخصيص 🎨

### إضافة زر تنفيذ يدوي

في Chat Interface، أضف:

```typescript
{selectedTask?.workflowEnabled && (
  <button
    onClick={() => executeTaskWorkflow(selectedTask.id, {
      manual: true,
      timestamp: Date.now()
    })}
    className="mt-2 w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
  >
    <span>⚡</span> Run n8n Workflow Manually
  </button>
)}
```

### إضافة مؤشر حالة

```typescript
{selectedTask && (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-slate-400">Active Task:</span>
    <span className="text-primary font-semibold">
      {selectedTask.title}
    </span>
    {selectedTask.workflowEnabled && (
      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">
        ⚡ n8n
      </span>
    )}
  </div>
)}
```

---

## ✅ النتيجة النهائية

الآن لديك:
- ✅ Workflow من n8n مدمج في المشروع
- ✅ Task مرتبط بالـ workflow
- ✅ تنفيذ تلقائي عند إرسال رسالة
- ✅ عرض النتائج في Chat
- ✅ مؤشرات حالة واضحة

## 🎉 تهانينا!

أصبح لديك نظام كامل لربط n8n workflows مع AutoGrader!
