# دليل دمج نظام التقييم مع Chatbot

## نظرة عامة
هذا الدليل يشرح كيفية دمج نظام التقييم الآلي مع الـ Chatbot الرئيسي في لوحة التحكم.

## الهدف
عندما يطلب المستخدم من الـ Chatbot تقييم واجبات الطلاب، يجب أن:
1. يفتح نافذة منبثقة (Modal) للتقييم
2. يقرأ البيانات من قاعدة البيانات المحلية
3. يسمح للمستخدم باختيار المعايير
4. يعرض النتائج بشكل تفاعلي

## خطوات التكامل

### 1. إضافة State للـ Modal في Dashboard

في ملف `src/pages/dashboard/index.tsx`، أضف:

```typescript
import GradeAssignmentModal from '@/components/GradeAssignmentModal';
import { LocalDatabase } from '@/lib/db/LocalDatabase';

// داخل Component
const [showGradingModal, setShowGradingModal] = useState(false);
const [gradingData, setGradingData] = useState<{
  students: Array<{ name: string; answers: { [key: string]: string } }>;
  questions: string[];
}>({ students: [], questions: [] });
```

### 2. إضافة دالة لتحميل البيانات

```typescript
const loadGradingData = () => {
  // قراءة من قاعدة البيانات المحلية
  const assignments = LocalDatabase.getUngradedAssignments();
  const students = LocalDatabase.getStudents();
  
  // تحويل البيانات إلى الصيغة المطلوبة
  const studentData = students.map(student => {
    const studentAssignments = assignments.filter(a => a.studentId === student.id);
    const answers: { [key: string]: string } = {};
    
    studentAssignments.forEach(assignment => {
      answers[assignment.title] = assignment.content;
    });
    
    return {
      name: student.name,
      answers
    };
  });
  
  // استخراج الأسئلة الفريدة
  const uniqueQuestions = [...new Set(assignments.map(a => a.title))];
  
  setGradingData({
    students: studentData,
    questions: uniqueQuestions
  });
  
  setShowGradingModal(true);
};
```

### 3. تعديل معالج الرسائل

```typescript
const handleSendMessage = () => {
  if (chatInput.trim()) {
    const message = chatInput.trim().toLowerCase();
    
    // كشف طلب التقييم
    if (
      message.includes('grade') || 
      message.includes('تقييم') || 
      message.includes('تصحيح') ||
      message.includes('واجب')
    ) {
      // فتح نافذة التقييم
      loadGradingData();
      
      // إضافة رسالة من AI
      setMessages([...messages, 
        { role: 'user', content: chatInput, time: new Date().toLocaleTimeString() },
        { 
          role: 'ai', 
          content: '📝 سأفتح نافذة التقييم لك الآن. يمكنك اختيار السؤال والمعايير التي تريد استخدامها.',
          time: new Date().toLocaleTimeString()
        }
      ]);
      
      setChatInput('');
      return;
    }
    
    // معالجة عادية للرسائل الأخرى
    setMessages([...messages, { role: 'user', content: chatInput, time: new Date().toLocaleTimeString() }]);
    setChatInput('');
    setIsThinking(true);
  }
};
```

### 4. إضافة Modal في JSX

في نهاية return statement:

```typescript
return (
  <div className="flex h-screen w-full bg-background-dark">
    {/* ... باقي الكود ... */}
    
    {/* Grading Modal */}
    <GradeAssignmentModal
      isOpen={showGradingModal}
      onClose={() => setShowGradingModal(false)}
      students={gradingData.students}
      questions={gradingData.questions}
    />
  </div>
);
```

### 5. إضافة زر مباشر في Task Manager

في قسم Task Manager، عدّل task "Grade Assignments":

```typescript
{
  id: 1,
  title: 'Grade Assignments',
  description: 'Analyze and grade student assignments based on rubric criteria',
  prompt: 'You are an expert grading assistant...',
  icon: '📝',
  active: true,
  action: () => loadGradingData() // إضافة action مباشر
}
```

وعند النقر على Task:

```typescript
const handleSelectTask = (task: any) => {
  setSelectedTask(task);
  setShowTaskManager(false);
  
  // إذا كان Task هو Grade Assignments، افتح Modal مباشرة
  if (task.id === 1) {
    loadGradingData();
  } else {
    // رسالة عادية للـ tasks الأخرى
    setMessages([...messages, {
      role: 'ai',
      content: `${task.icon} Workflow "${task.title}" activated...`,
      time: new Date().toLocaleTimeString()
    }]);
  }
};
```

## استخدام قاعدة البيانات المحلية

### تهيئة البيانات التجريبية

```typescript
// في useEffect عند تحميل الصفحة
useEffect(() => {
  // تهيئة قاعدة البيانات بالبيانات التجريبية
  LocalDatabase.initializeDemo();
}, []);
```

### قراءة البيانات

```typescript
// الحصول على جميع الطلاب
const students = LocalDatabase.getStudents();

// الحصول على الواجبات غير المقيّمة
const ungradedAssignments = LocalDatabase.getUngradedAssignments();

// الحصول على واجبات طالب معين
const studentAssignments = LocalDatabase.getStudentAssignments('S001');
```

### حفظ النتائج

بعد التقييم، احفظ النتائج في قاعدة البيانات:

```typescript
// في GradeAssignmentModal بعد انتهاء التقييم
const saveResults = (results: GradingResult[]) => {
  results.forEach(result => {
    // البحث عن الواجب المقابل
    const assignments = LocalDatabase.getAssignments();
    const assignment = assignments.find(a => 
      a.studentId === result.studentId && 
      a.title === questions[selectedQuestion]
    );
    
    if (assignment) {
      // تحديث الواجب بالدرجة والتعليقات
      LocalDatabase.updateAssignment(assignment.id, {
        graded: true,
        grade: result.grade,
        feedback: result.feedback
      });
    }
  });
};
```

## أمثلة على الاستخدام

### مثال 1: طلب مباشر
```
المستخدم: أريد تقييم واجبات الطلاب
AI: 📝 سأفتح نافذة التقييم لك الآن...
[تفتح نافذة GradeAssignmentModal]
```

### مثال 2: من خلال Task Manager
```
المستخدم: task
[تفتح قائمة Tasks]
المستخدم: [ينقر على Grade Assignments]
[تفتح نافذة GradeAssignmentModal مباشرة]
```

### مثال 3: سؤال محدد
```
المستخدم: قيّم إجابات الطلاب على سؤال البناء الضوئي
AI: 📝 سأفتح نافذة التقييم. يمكنك اختيار سؤال البناء الضوئي من القائمة.
[تفتح نافذة GradeAssignmentModal]
```

## تحسينات مقترحة

### 1. اختيار تلقائي للسؤال
إذا ذكر المستخدم سؤالاً محدداً، اختره تلقائياً:

```typescript
const detectQuestion = (message: string) => {
  const questions = LocalDatabase.getAssignments().map(a => a.title);
  return questions.find(q => 
    message.toLowerCase().includes(q.toLowerCase())
  );
};

// في handleSendMessage
const detectedQuestion = detectQuestion(chatInput);
if (detectedQuestion) {
  const questionIndex = gradingData.questions.indexOf(detectedQuestion);
  // تمرير questionIndex إلى Modal
}
```

### 2. معاينة سريعة
أضف معاينة للبيانات قبل فتح Modal:

```typescript
const previewGradingData = () => {
  const stats = LocalDatabase.getStats();
  
  setMessages([...messages, {
    role: 'ai',
    content: `📊 لديك ${stats.ungradedAssignments} واجب غير مقيّم من ${stats.totalStudents} طالب. هل تريد البدء بالتقييم؟`,
    time: new Date().toLocaleTimeString()
  }]);
};
```

### 3. إشعار بعد التقييم
بعد إغلاق Modal وحفظ النتائج:

```typescript
const onModalClose = (results?: GradingResult[]) => {
  setShowGradingModal(false);
  
  if (results && results.length > 0) {
    const stats = GradingEngine.calculateStats(results);
    
    setMessages([...messages, {
      role: 'ai',
      content: `✅ تم تقييم ${results.length} طالب بنجاح! المتوسط: ${stats.averageGrade}/100`,
      time: new Date().toLocaleTimeString()
    }]);
  }
};
```

## الملفات المطلوبة

### الملفات الموجودة
- ✅ `src/components/GradeAssignmentModal.tsx`
- ✅ `src/lib/grading/GradingEngine.ts`
- ✅ `src/lib/db/LocalDatabase.ts`

### الملفات التي تحتاج تعديل
- 📝 `src/pages/dashboard/index.tsx` - إضافة التكامل
- 📝 `src/components/ChatInterface.tsx` - (اختياري) إذا كنت تريد تكامل أعمق

## الاختبار

### 1. اختبار الديمو المستقل
```bash
# افتح المتصفح
http://localhost:3000/grading-demo
```

### 2. اختبار التكامل مع Dashboard
```bash
# افتح Dashboard
http://localhost:3000/dashboard

# جرب الأوامر:
- "تقييم الواجبات"
- "grade assignments"
- "task" ثم اختر Grade Assignments
```

### 3. اختبار قاعدة البيانات
```javascript
// في Console المتصفح
LocalDatabase.getStats()
LocalDatabase.getUngradedAssignments()
```

## استكشاف الأخطاء

### المشكلة: Modal لا يفتح
**الحل**: تأكد من:
- State `showGradingModal` موجود
- Component `GradeAssignmentModal` مستورد بشكل صحيح
- Props تم تمريرها بشكل صحيح

### المشكلة: لا توجد بيانات
**الحل**: 
- استدعِ `LocalDatabase.initializeDemo()` في useEffect
- تحقق من Console للأخطاء

### المشكلة: النتائج لا تُحفظ
**الحل**:
- تأكد من استدعاء `LocalDatabase.updateAssignment()`
- تحقق من localStorage في DevTools

## الخلاصة

التكامل يتطلب:
1. ✅ إضافة State للـ Modal
2. ✅ دالة لتحميل البيانات من LocalDatabase
3. ✅ معالج للكشف عن طلبات التقييم
4. ✅ إضافة Modal في JSX
5. ✅ حفظ النتائج بعد التقييم

---

**ملاحظة**: جميع الأمثلة أعلاه جاهزة للنسخ واللصق مباشرة في الكود.
