# 🔗 دليل الربط بين Workflows وبيانات الإضافة

## 📋 نظرة عامة

تم الربط الكامل بين نظام **Workflows** و**بيانات الإضافة (OnPage Scraper Extension)**، مما يتيح لك:
- ✅ استخدام بيانات الإضافة المستخرجة من المتصفح في workflows التصحيح التلقائي
- ✅ تشغيل workflows مختلفة حسب مصدر البيانات (Moodle DB أو Extension)
- ✅ معالجة البيانات المستخرجة من أي موقع ويب بواسطة AI
- ✅ تصدير النتائج بصيغ متعددة (CSV, PDF, JSON)

---

## 🏗️ البنية التقنية

### 1. **API Endpoint جديد**: `/api/extension/query`
- **الموقع**: `packages/webapp/src/pages/api/extension/query.ts`
- **الوظيفة**: قراءة البيانات من الإضافة وتحويلها لتناسب workflows
- **أنواع التحويل المدعومة**:
  - `assignments` - تحويل لمهام/واجبات
  - `quiz` - تحويل لأسئلة/اختبارات
  - `students` - تحويل لبيانات طلاب عامة

**مثال على الاستعلام**:
```typescript
POST /api/extension/query
{
  "query": "",
  "transformationType": "assignments"
}
```

**مثال على الاستجابة**:
```json
{
  "success": true,
  "data": [
    {
      "student_id": "student_1",
      "student_name": "أحمد محمد",
      "assignment_name": "Extension Assignment",
      "assignment_text": "محتوى الواجب...",
      "submission_date": "2026-03-02T10:30:00.000Z",
      "status": "submitted"
    }
  ],
  "metadata": {
    "source": "extension",
    "originalUrl": "https://example.com",
    "totalItems": 25
  }
}
```

---

### 2. **RealWorkflowExecutor تحديث**
- **الموقع**: `packages/webapp/src/lib/n8n/RealWorkflowExecutor.ts`
- **التحديث**: إضافة دعم node جديد `n8n-nodes-base.extensionData`
- **الدالة الجديدة**: `executeExtensionQuery()` - تنفذ استعلامات بيانات الإضافة

**مقارنة بين أنواع Nodes**:
```typescript
// Node قديم - Moodle Database
{
  "type": "n8n-nodes-base.mySql",
  "parameters": {
    "query": "SELECT * FROM mdl_user..."
  }
}

// Node جديد - Extension Data
{
  "type": "n8n-nodes-base.extensionData",
  "parameters": {
    "transformationType": "assignments",
    "query": ""
  }
}
```

---

### 3. **Workflows الجديدة**

#### 🔌 **Grade Extension Assignments**
- **الملف**: `grade-extension-assignments.json`
- **Task ID**: 5
- **الوصف**: تصحيح الواجبات المستخرجة من الإضافة
- **الأيقونة**: 🔌
- **التدفق**:
  1. Start → بدء التنفيذ
  2. Fetch Extension Data → قراءة بيانات الواجبات من الإضافة
  3. AI Grade Assignment → تصحيح تلقائي بواسطة Groq AI
  4. Process Grade → معالجة النتائج
  5. Export to CSV → تصدير النتائج

#### 📱 **Grade Extension Quiz**
- **الملف**: `grade-extension-quiz.json`
- **Task ID**: 6
- **الوصف**: تصحيح الاختبارات/الأسئلة المستخرجة من الإضافة
- **الأيقونة**: 📱
- **التدفق**: مماثل للواجبات لكن مع prompt مخصص للاختبارات

---

### 4. **WorkflowRegistry تحديث**
- **الموقع**: `packages/webapp/src/lib/n8n/WorkflowRegistry.ts`
- **التحديث**: إضافة 2 workflows جديدة للإضافة
- **العدد الكلي**: 6 workflows (4 Moodle + 2 Extension)

---

### 5. **RealWorkflowModal UI تحسين**
- **الموقع**: `packages/webapp/src/components/RealWorkflowModal.tsx`
- **التحديثات**:
  - ✅ عرض ديناميكي لمصدر البيانات (Moodle DB أو Extension)
  - ✅ معلومات تفصيلية لكل مصدر
  - ✅ نصائح للمستخدم حسب نوع الـ workflow

**مثال على العرض**:
```
📊 Data Source: Moodle Database
- Host: 127.0.0.1
- Port: 3307
- Database: moodle

🔌 Data Source: Browser Extension
- Source: OnPage Scraper Extension
- API Endpoint: /api/extension/query
- Data Type: Real-time scraped data
💡 Tip: Extract data from your browser using the OnPage Scraper extension first.
```

---

## 📖 دليل الاستخدام

### الخطوة 1: استخراج البيانات من المتصفح

1. **تثبيت الإضافة**:
   - افتح `chrome://extensions/`
   - فعّل "Developer mode"
   - اضغط "Load unpacked"
   - اختر مجلد `OnPage-Scraper-main/extension`

2. **استخراج البيانات**:
   - افتح الصفحة المطلوبة (مثلاً صفحة تحتوي على واجبات طلاب)
   - اضغط على أيقونة الإضافة
   - اضغط "Select Elements" واختر العناصر
   - اضغط "Start Scraping" لبدء الاستخراج
   - اضغط "Send to AutoGrader" لإرسال البيانات

3. **التحقق من البيانات**:
   - اذهب إلى `http://localhost:3000/extension-data`
   - تأكد من ظهور البيانات المستخرجة

---

### الخطوة 2: تنفيذ Workflow

1. **الذهاب إلى Dashboard**:
   - افتح `http://localhost:3000/dashboard`
   - ابحث عن قسم "Real Workflows System"

2. **اختيار Workflow مناسب**:
   - للواجبات: اختر "🔌 Grade Extension Assignments"
   - للاختبارات: اختر "📱 Grade Extension Quiz"

3. **التنفيذ**:
   - اضغط على الـ workflow
   - راجع معلومات المصدر (يجب أن يظهر "Browser Extension")
   - اضغط "Execute Workflow"
   - انتظر حتى يكتمل التنفيذ
   - سيتم تنزيل ملف CSV تلقائياً مع النتائج

---

### الخطوة 3: مراجعة النتائج

**مثال على ملف CSV الناتج**:
```csv
student_id,student_name,assignment_name,grade,feedback_text,strengths,improvements
student_1,أحمد محمد,Extension Assignment,85,"Good work overall. The content shows understanding of the topic.",Clear explanation and good structure,Add more examples
student_2,فاطمة علي,Extension Assignment,92,"Excellent work! Very thorough analysis.",Comprehensive research and critical thinking,Minor grammar issues
```

---

## 🔄 سير العمل الكامل

```
┌─────────────────────────┐
│  Browser Extension      │
│  (OnPage Scraper)       │
│  - Select Elements      │
│  - Extract Data         │
│  - Send to AutoGrader   │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  POST /api/scraper-data │
│  (Store in memory)      │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  GET /extension-data    │
│  (View extracted data)  │
└─────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│  Execute Workflow       │
│  (User clicks button)   │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  POST /api/extension/   │
│       query             │
│  (Transform data)       │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  RealWorkflowExecutor   │
│  - executeExtensionQuery│
│  - AI Grading (Groq)    │
│  - Process Results      │
│  - Export to CSV        │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Download Results       │
│  (CSV file with grades) │
└─────────────────────────┘
```

---

## 🛠️ تخصيص Workflows

### إنشاء Workflow مخصص للإضافة

1. **إنشاء ملف JSON جديد**:
```json
{
  "name": "Custom Extension Workflow",
  "nodes": [
    {
      "type": "n8n-nodes-base.manualTrigger",
      "name": "Start"
    },
    {
      "type": "n8n-nodes-base.extensionData",
      "name": "Fetch Data",
      "parameters": {
        "transformationType": "assignments"
      }
    },
    // ... بقية الـ nodes
  ]
}
```

2. **إضافة إلى WorkflowRegistry**:
```typescript
import myCustomWorkflow from './workflows/my-custom-workflow.json';

this.workflows.set(7, {
  id: 'my-custom-workflow-001',
  taskId: 7,
  name: 'My Custom Workflow',
  description: 'Custom workflow for extension data',
  icon: '⚡',
  outputFormat: 'csv',
  workflow: myCustomWorkflow,
  isPredefined: true
});
```

---

## 🔍 استكشاف الأخطاء

### المشكلة: "No data available from extension"
**الحل**:
1. تأكد من استخراج البيانات من الإضافة أولاً
2. افتح `/extension-data` للتحقق من وجود البيانات
3. تأكد من أن الإضافة أرسلت البيانات لـ AutoGrader

### المشكلة: "Extension query returned 0 items"
**الحل**:
1. تأكد من أن البيانات المستخرجة ليست فارغة
2. راجع console logs للتفاصيل
3. تحقق من نوع التحويل (`transformationType`)

### المشكلة: "Workflow execution failed"
**الحل**:
1. افتح Developer Tools → Console
2. ابحث عن رسائل الخطأ التفصيلية
3. تأكد من إعداد GROQ_API_KEY في `.env`

---

## 📊 مقارنة: Moodle vs Extension Workflows

| الميزة | Moodle Workflows | Extension Workflows |
|--------|-----------------|-------------------|
| **مصدر البيانات** | قاعدة بيانات MySQL | Browser Extension |
| **البيانات المدعومة** | Moodle tables فقط | أي موقع ويب |
| **الإعداد** | يتطلب Moodle DB | يتطلب Extension فقط |
| **المرونة** | محدود بـ Moodle | غير محدود |
| **حالات الاستخدام** | أنظمة Moodle فقط | أي نظام تعليمي |

---

## ✅ الخلاصة

تم الآن **الربط الكامل** بين:
- ✅ **API Endpoint** جديد لقراءة بيانات الإضافة
- ✅ **RealWorkflowExecutor** يدعم Extension data
- ✅ **Workflows جديدة** (2) للواجبات والاختبارات
- ✅ **WorkflowRegistry** محدّث بـ 6 workflows إجمالاً
- ✅ **UI محسّن** لعرض مصدر البيانات

**الآن يمكنك**:
1. استخراج بيانات من أي موقع ويب
2. تشغيل workflows AI للتصحيح التلقائي
3. الحصول على ملفات CSV بالنتائج

---

## 📝 ملاحظات مهمة

- 🔒 **الأمان**: في Development mode، المصادقة معطلة تلقائياً
- 💾 **التخزين**: البيانات مخزنة في الذاكرة مؤقتاً (تُفقد عند إعادة التشغيل)
- 🚀 **الأداء**: يدعم معالجة حتى 20 عنصر في المرة الواحدة
- 🌐 **اللغة**: AI يدعم الإنجليزية والفرنسية فقط

---

**تم الإنشاء**: 2 مارس 2026  
**الإصدار**: 1.0  
**الحالة**: ✅ جاهز للاستخدام
