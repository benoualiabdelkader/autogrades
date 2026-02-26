# 🎓 الدليل الكامل: n8n × AutoGrader

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [الملفات المتوفرة](#الملفات-المتوفرة)
3. [البدء السريع](#البدء-السريع)
4. [Prompts جاهزة](#prompts-جاهزة)
5. [أمثلة عملية](#أمثلة-عملية)
6. [الأسئلة الشائعة](#الأسئلة-الشائعة)

---

## 🎯 نظرة عامة

تم إنشاء نظام متكامل لربط **n8n workflows** مع **Task Manager** في AutoGrader.

### ما تم إنجازه:

✅ **البنية التحتية الكاملة**
- محرك تنفيذ workflows
- API endpoints
- دعم TypeScript
- معالجة أخطاء

✅ **التوثيق الشامل**
- 11 ملف توثيق
- بالعربية والإنجليزية
- أمثلة عملية
- رسوم توضيحية

✅ **Prompts جاهزة**
- 8 tasks رئيسية
- 3 bonus workflows
- أمثلة مع النتائج
- نسخ سريع

---

## 📚 الملفات المتوفرة

### 1. التوثيق الأساسي

| الملف | الوصف | متى تقرأه |
|-------|-------|-----------|
| **README_N8N_AR.md** | الدليل الرئيسي | ابدأ من هنا |
| **N8N_INDEX.md** | فهرس شامل | للتنقل بين الملفات |
| **N8N_SUMMARY_AR.md** | ملخص المشروع | نظرة سريعة |

### 2. أدلة التطبيق

| الملف | الوصف | المستوى |
|-------|-------|---------|
| **N8N_QUICK_START_AR.md** | بداية سريعة | مبتدئ |
| **N8N_STEP_BY_STEP_AR.md** | خطوة بخطوة | مبتدئ |
| **N8N_INTEGRATION_GUIDE.md** | دليل تقني | متقدم |
| **TASK_N8N_EXAMPLE.md** | أمثلة كود | متوسط |

### 3. الرسوم والتدفقات

| الملف | الوصف |
|-------|-------|
| **N8N_WORKFLOW_DIAGRAM.md** | رسوم توضيحية للتدفقات |

### 4. Prompts جاهزة ⭐

| الملف | الوصف | الاستخدام |
|-------|-------|-----------|
| **N8N_PROMPTS_AR.md** | Prompts مفصلة | للفهم العميق |
| **N8N_PROMPTS_QUICK.md** | Prompts سريعة | للنسخ المباشر |
| **N8N_PROMPTS_EXAMPLES_AR.md** | أمثلة مع النتائج | للتعلم |

### 5. الإعدادات

| الملف | الوصف |
|-------|-------|
| **.env.n8n.example** | متغيرات البيئة |

---

## 🚀 البدء السريع

### الخطوة 1: اختر Task

اختر من Tasks المتوفرة:
1. ✅ Grade Assignments (تقييم الواجبات)
2. ✅ Generate Rubric (إنشاء معايير)
3. ✅ Student Analytics (تحليل الطلاب)
4. ✅ Generate Feedback (ملاحظات مخصصة)
5. ✅ Auto-Check Assignment (فحص تلقائي)
6. ✅ Student Alerts (تنبيهات)
7. ✅ Progress Tracker (متابعة التقدم)
8. ✅ Course Insights (رؤى المقرر)

### الخطوة 2: احصل على Prompt

افتح `N8N_PROMPTS_QUICK.md` وانسخ الـ prompt المناسب.

**مثال - Task 1: Grade Assignments:**

```
Create an n8n workflow:
1. Start node receives: studentId, assignmentId, assignmentText
2. HTTP POST to http://localhost:3000/api/groq with body: {"prompt": "Grade this assignment: [text]"}
3. Function node extracts: grade (0-100), feedback, strengths[], improvements[]
4. Set node formats output: {studentId, assignmentId, grade, feedback, strengths, improvements, timestamp}
5. HTTP POST to http://localhost:3000/api/save-grade
6. Add error handling for API failures
Return complete grading result
```

### الخطوة 3: أنشئ في n8n

1. افتح n8n.io
2. اضغط "New Workflow"
3. استخدم "AI Agent" أو "Generate with AI"
4. الصق الـ prompt
5. راجع النتيجة
6. اختبر الـ workflow

### الخطوة 4: صدّر وأضف للمشروع

```bash
# في n8n: اضغط ⋮ → Download
# احفظ الملف

# في المشروع:
cp my-workflow.json packages/webapp/src/lib/n8n/workflows/
```

### الخطوة 5: اربط بـ Task

```typescript
// في dashboard/index.tsx
{
  id: 1,
  title: 'Grade Assignments',
  workflowFile: 'my-workflow.json',
  workflowEnabled: true
}
```

**🎉 انتهى! جاهز للاستخدام**

---

## 🤖 Prompts جاهزة

### Task 1: تقييم الواجبات

**Prompt سريع:**
```
Create n8n workflow: Start → HTTP POST to groq API → Function parse grade → Set format → HTTP save → Return result
```

**Prompt مفصل:** راجع `N8N_PROMPTS_AR.md` صفحة 1

**مثال مع النتيجة:** راجع `N8N_PROMPTS_EXAMPLES_AR.md` مثال 1

---

### Task 2: إنشاء Rubric

**Prompt سريع:**
```
Create n8n workflow: Start → Function prepare prompt → HTTP POST groq → Function structure rubric → HTTP save → Return
```

**Prompt مفصل:** راجع `N8N_PROMPTS_AR.md` صفحة 2

**مثال مع النتيجة:** راجع `N8N_PROMPTS_EXAMPLES_AR.md` مثال 4

---

### Task 3: تحليل الطلاب

**Prompt سريع:**
```
Create n8n workflow: Start → HTTP GET students → Function calculate metrics → Function stats → HTTP POST AI insights → Set format report → HTTP save
```

**Prompt مفصل:** راجع `N8N_PROMPTS_AR.md` صفحة 3

**مثال مع النتيجة:** راجع `N8N_PROMPTS_EXAMPLES_AR.md` مثال 2

---

### Task 4: ملاحظات مخصصة

**Prompt سريع:**
```
Create n8n workflow: Start → Function analyze trend → HTTP POST AI feedback → Function structure → HTTP save
```

**Prompt مفصل:** راجع `N8N_PROMPTS_AR.md` صفحة 4

**مثال مع النتيجة:** راجع `N8N_PROMPTS_EXAMPLES_AR.md` مثال 5

---

### جميع الـ Prompts

للحصول على جميع الـ prompts:
- **مفصلة:** `N8N_PROMPTS_AR.md`
- **سريعة:** `N8N_PROMPTS_QUICK.md`
- **مع أمثلة:** `N8N_PROMPTS_EXAMPLES_AR.md`

---

## 💡 أمثلة عملية

### مثال كامل: من الصفر إلى التشغيل

#### 1. في n8n

```
1. افتح n8n.io
2. New Workflow
3. استخدم AI Agent
4. الصق prompt من N8N_PROMPTS_QUICK.md
5. اختبر بـ sample data
6. Download → save as grade-assignment.json
```

#### 2. في المشروع

```bash
# نقل الملف
cp grade-assignment.json packages/webapp/src/lib/n8n/workflows/
```

#### 3. في الكود

```typescript
// dashboard/index.tsx
const [tasks, setTasks] = useState([
  {
    id: 1,
    title: 'Grade Assignments',
    description: 'AI-powered grading',
    icon: '📝',
    workflowFile: 'grade-assignment.json',
    workflowEnabled: true
  }
]);
```

#### 4. الاختبار

```bash
npm run dev
# افتح http://localhost:3000/dashboard
# اختر Task
# اكتب رسالة
# شاهد النتيجة
```

---

## ❓ الأسئلة الشائعة

### س: هل أحتاج n8n server؟

**ج:** لا، يمكنك استخدام التنفيذ المحلي (local simulation). لكن للحصول على جميع الميزات، يُفضل استخدام n8n API.

---

### س: كيف أعدل prompt موجود؟

**ج:** 
1. افتح الـ prompt من `N8N_PROMPTS_QUICK.md`
2. عدّل URLs أو المعايير
3. استخدمه في n8n
4. اختبر النتيجة

**مثال:**
```
Original: "grade < 50"
Modified: "grade < 60 OR attendance < 75%"
```

---

### س: Workflow لا يعمل؟

**ج:** تحقق من:
- ✅ اسم الملف صحيح
- ✅ الملف في المجلد الصحيح
- ✅ workflowFile في Task صحيح
- ✅ workflowEnabled = true
- ✅ راجع console logs

---

### س: كيف أضيف error handling؟

**ج:** في الـ prompt، أضف:
```
Add error handling:
- If API fails, return {error: true, message: "..."}
- Set default values for missing data
- Log all errors to console
```

---

### س: هل يمكن استخدام AI بالعربية؟

**ج:** نعم! في الـ prompt، أضف:
```
Language: Arabic
Tone: Supportive and professional
```

---

### س: كيف أختبر workflow قبل التصدير؟

**ج:** في n8n:
1. اضغط "Execute Workflow"
2. أدخل sample data
3. راجع output كل node
4. تأكد من النتيجة النهائية

---

## 🎯 مسارات التعلم

### المسار السريع (30 دقيقة)

```
1. README_N8N_AR.md (5 دقائق)
   ↓
2. N8N_PROMPTS_QUICK.md (5 دقائق)
   ↓
3. نسخ prompt + إنشاء في n8n (10 دقائق)
   ↓
4. تصدير وإضافة للمشروع (5 دقائق)
   ↓
5. اختبار (5 دقائق)
```

### المسار الكامل (ساعتين)

```
1. README_N8N_AR.md (10 دقائق)
   ↓
2. N8N_WORKFLOW_DIAGRAM.md (15 دقيقة)
   ↓
3. N8N_PROMPTS_EXAMPLES_AR.md (20 دقيقة)
   ↓
4. إنشاء 3 workflows (45 دقيقة)
   ↓
5. تطبيق في المشروع (30 دقيقة)
```

### المسار المتقدم (4 ساعات)

```
1. قراءة جميع الملفات (ساعة)
   ↓
2. إنشاء workflows مخصصة (ساعة)
   ↓
3. تطوير features إضافية (ساعة)
   ↓
4. اختبار شامل وتوثيق (ساعة)
```

---

## 📖 الموارد الإضافية

### داخل المشروع

- `src/lib/n8n/` - الكود الأساسي
- `src/pages/api/n8n/` - API endpoints
- `.env.n8n.example` - الإعدادات

### خارج المشروع

- [n8n Documentation](https://docs.n8n.io)
- [n8n Workflows](https://n8n.io/workflows)
- [n8n Community](https://community.n8n.io)

---

## ✅ Checklist النهائي

قبل البدء:
- [ ] قرأت README_N8N_AR.md
- [ ] فهمت المفهوم الأساسي
- [ ] لديك حساب n8n
- [ ] المشروع يعمل بدون مشاكل

عند إنشاء workflow:
- [ ] اخترت الـ prompt المناسب
- [ ] عدّلت URLs حسب الحاجة
- [ ] اختبرت في n8n
- [ ] صدّرت الملف

عند الإضافة للمشروع:
- [ ] نقلت الملف للمجلد الصحيح
- [ ] ربطت بـ Task
- [ ] اختبرت التنفيذ
- [ ] تحققت من النتائج

---

## 🎉 ابدأ الآن!

**الخطوة الأولى:**
افتح `N8N_PROMPTS_QUICK.md` واختر prompt

**ثم:**
انسخه والصقه في n8n AI

**بعدها:**
اتبع الخطوات في `N8N_STEP_BY_STEP_AR.md`

---

<div align="center">

### 🚀 AutoGrader × n8n

**نظام متكامل لأتمتة التقييم التعليمي**

صُنع بـ ❤️ للمعلمين والطلاب

</div>
