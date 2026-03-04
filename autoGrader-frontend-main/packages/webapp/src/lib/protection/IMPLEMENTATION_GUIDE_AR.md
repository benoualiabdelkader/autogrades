# 🛡️ دليل تطبيق نظام حماية البيانات
# Data Protection System Implementation Guide

## 📋 جدول المحتويات
1. نظرة عامة
2. بنية المشروع
3. تثبيت والإعداد
4. التكامل مع Scraper
5. التكامل مع AI APIs
6. أمثلة عملية
7. أفضل الممارسات
8. استكشاف الأخطاء

---

## 1️⃣ نظرة عامة

### المكونات الرئيسية

```
src/lib/protection/
├── sensitiveDataDetector.ts      # كشف البيانات الحساسة
├── dataFilter.ts                 # تصفية وإخفاء البيانات
├── resultMerger.ts               # دمج النتائج
├── dataProtectionPipeline.ts     # منسق العملية الكاملة
├── examples.ts                   # أمثلة عملية
└── index.ts                      # التصديرات الرئيسية
```

### سير العمل (Workflow)

```
1. استخراج البيانات من Moodle (via Scraper)
   ↓
2. كشف البيانات الحساسة
   ↓
3. تصفية وإخفاء البيانات
   ↓
4. إرسال البيانات المصفاة للـ AI APIs
   ↓
5. استقبال نتائج التحليل من AI
   ↓
6. دمج النتائج مع البيانات الأصلية
   ↓
7. عرض النتائج للمدرس
```

---

## 2️⃣ بنية المشروع

### الملفات المضافة

```
packages/webapp/src/lib/protection/
├── sensitiveDataDetector.ts      (447 أسطر)
├── dataFilter.ts                 (350+ سطر)
├── resultMerger.ts               (280+ سطر)
├── dataProtectionPipeline.ts     (380+ سطر)
├── examples.ts                   (400+ سطر)
└── index.ts                      (تصديرات)
```

### الاستخدام في المشروع

يمكن استخدام هذا النظام في:
- `src/lib/scraper/` - قبل إرسال البيانات
- `src/lib/api/` - للتحقق الأمني الإضافي
- `src/pages/api/` - في الـ API endpoints
- `src/components/` - عند عرض البيانات

---

## 3️⃣ التثبيت والإعداد

### الاستيراد الأساسي

```typescript
// استيراد من المكتبة الرئيسية
import {
  SensitiveDataDetector,
  DataFilter,
  ResultMerger,
  DataProtectionPipeline,
  createSecurePipeline,
} from '@/lib/protection';

// أو استيراد نوع محدد
import { DataFilter } from '@/lib/protection/dataFilter';
```

### الإعدادات الأساسية

```typescript
// إنشاء pipeline آمن (موصى به)
const pipeline = createSecurePipeline();

// أو إنشاء pipeline صارم
import { createStrictPipeline } from '@/lib/protection';
const strictPipeline = createStrictPipeline();

// أو إنشاء pipeline مخصص
import { DataProtectionPipeline } from '@/lib/protection';
const customPipeline = new DataProtectionPipeline({
  detectSensitive: true,
  filterData: true,
  maskSensitive: true,
  stopOnSensitive: false,
  verbose: true,
});
```

---

## 4️⃣ التكامل مع Scraper

### موقع التكامل: `src/lib/scraper/`

#### قبل - Before Integration
```typescript
// scraper.ts (موجود)
async function scrapeStudentData(url: string) {
  const data = await fetch(url);
  return data.json(); // بيانات خام مع معلومات حساسة
}
```

#### بعد - After Integration
```typescript
import { DataProtectionPipeline } from '@/lib/protection';

const pipeline = new DataProtectionPipeline({
  detectSensitive: true,
  filterData: true,
});

async function scrapeStudentData(url: string) {
  const rawData = await fetch(url);
  const students = await rawData.json();

  // معالجة البيانات قبل التخزين
  const result = await pipeline.processBefore(students);

  if (result.success) {
    return result.data; // بيانات مصفاة آمنة
  } else {
    console.error('خطأ في التصفية:', result.errors);
    throw new Error('فشلت معالجة البيانات');
  }
}
```

### مثال كامل للتكامل

```typescript
// src/lib/scraper/secureScraperIntegration.ts

import { DataProtectionPipeline } from '@/lib/protection';

export class SecureScraperManager {
  private pipeline: DataProtectionPipeline;

  constructor() {
    this.pipeline = new DataProtectionPipeline({
      detectSensitive: true,
      filterData: true,
      maskSensitive: true,
      verbose: true,
    });
  }

  async scrapeAndProtect(url: string) {
    try {
      // 1. استخراج البيانات
      const response = await fetch(url);
      const rawStudents = await response.json();

      console.log(`📥 تم استخراج ${rawStudents.length} طالب`);

      // 2. معالجة البيانات
      const protectionResult = await this.pipeline.processBefore(rawStudents);

      if (!protectionResult.success) {
        throw new Error(`فشل حماية البيانات: ${protectionResult.errors.join(', ')}`);
      }

      console.log(`✓ تم معالجة البيانات بنجاح`);
      console.log(`  - بيانات حساسة اكتشفت: ${protectionResult.stats.sensitivePatternsFound}`);
      console.log(`  - حقول محذوفة: ${protectionResult.stats.fieldsRemoved}`);

      // 3. إرجاع البيانات الآمنة
      return {
        data: protectionResult.data,
        Stats: protectionResult.stats,
        logs: protectionResult.logs,
      };
    } catch (error) {
      console.error('❌ خطأ في Scraping الآمن:', error);
      throw error;
    }
  }
}

// الاستخدام
export async function integrateWithScraperExample() {
  const secureManager = new SecureScraperManager();
  const result = await secureManager.scrapeAndProtect('https://moodle.example.com/api/students');
  return result;
}
```

---

## 5️⃣ التكامل مع AI APIs

### موقع التكامل: `src/lib/api/`

#### معالجة البيانات قبل الإرسال

```typescript
// src/lib/api/secureAIIntegration.ts

import { DataProtectionPipeline } from '@/lib/protection';
import { OpenAI } from 'openai';
import { Groq } from 'groq-sdk';

export class SecureAIProcessor {
  private pipeline: DataProtectionPipeline;
  private openai: OpenAI;
  private groq: Groq;

  constructor() {
    this.pipeline = new DataProtectionPipeline({
      detectSensitive: true,
      filterData: true,
      maskSensitive: true,
    });
    this.openai = new OpenAI();
    this.groq = new Groq();
  }

  /**
   * معالجة آمنة للبيانات + طلب AI
   */
  async analyzeStudentsSafely(students: any[], aiModel: 'openai' | 'groq' = 'groq') {
    try {
      // 1. حماية البيانات قبل الإرسال
      const protectionResult = await this.pipeline.processBefore(students);

      if (!protectionResult.success) {
        throw new Error(`فشل حماية البيانات: ${protectionResult.errors}`);
      }

      const safeData = protectionResult.data;

      // 2. إرسال البيانات الآمنة للـ AI
      const aiResults = await this.sendToAI(safeData, aiModel);

      return {
        success: true,
        aiResults,
        protectionStats: protectionResult.stats,
      };
    } catch (error) {
      console.error('❌ خطأ في المعالجة الآمنة:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * إرسال إلى Groq API (موصى به)
   */
  private async sendToAI(data: any, model: 'openai' | 'groq') {
    if (model === 'groq') {
      return await this.groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: `حلل بيانات الطلاب التالية وقدم توصيات:\n${JSON.stringify(data)}`,
          },
        ],
        model: 'mixtral-8x7b-32768',
      });
    } else {
      return await this.openai.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: `حلل بيانات الطلاب التالية وقدم توصيات:\n${JSON.stringify(data)}`,
          },
        ],
        model: 'gpt-4',
      });
    }
  }
}

// الاستخدام
export async function aiIntegrationExample() {
  const processor = new SecureAIProcessor();
  const students = [
    {
      student_id: 'S001',
      name: 'أحمد',
      email: 'ahmed@uni.com',
      grades: { math: 85, science: 90 },
    },
  ];

  const result = await processor.analyzeStudentsSafely(students, 'groq');
  return result;
}
```

#### دمج نتائج AI مع البيانات الأصلية

```typescript
// src/lib/api/aiResultHandler.ts

import { DataProtectionPipeline, ResultMerger } from '@/lib/protection';

export class AIResultHandler {
  private merger: ResultMerger;
  private pipeline: DataProtectionPipeline;

  constructor() {
    this.merger = new ResultMerger();
    this.pipeline = new DataProtectionPipeline();
  }

  /**
   * معالجة النتائج كاملة
   */
  async handleAIResults(
    aiResults: any[],
    originalStudentData: Map<string, any>
  ) {
    // تسجيل البيانات الأصلية
    this.merger.registerStudentData(Array.from(originalStudentData.values()));

    // دمج النتائج
    const mergedResults = await this.pipeline.processAfter(
      aiResults,
      originalStudentData
    );

    if (mergedResults.success) {
      console.log(`✓ تم دمج ${Array.isArray(mergedResults.data) ? mergedResults.data.length : 1} نتيجة`);
      return mergedResults.data;
    } else {
      throw new Error(`فشل الدمج: ${mergedResults.errors.join(', ')}`);
    }
  }
}
```

---

## 6️⃣ أمثلة عملية

### مثال 1: سير عمل كامل

```typescript
import {
  SensitiveDataDetector,
  DataFilter,
  DataProtectionPipeline,
} from '@/lib/protection';

async function completeWorkflow() {
  // البيانات الخام من Moodle
  const rawData = [
    {
      student_id: 'S001',
      name: 'أحمد علي',
      email: 'ahmed@uni.com',
      phone: '+966501234567',
      grades: { math: 85, science: 90 },
      attendance: 95,
    },
  ];

  // إنشاء pipeline
  const pipeline = new DataProtectionPipeline({
    detectSensitive: true,
    filterData: true,
    verbose: true,
  });

  // 1. معالجة قبل AI
  const beforeAI = await pipeline.processBefore(rawData);
  console.log('البيانات الآمنة للـ AI:', beforeAI.data);

  // 2. محاكاة استدعاء AI (يمكن استبدالها بـ API حقيقي)
  const aiResults = [
    {
      student_id: 'S001',
      analysis: 'أداء ممتاز',
      recommendations: ['الاستمرار بالجهد'],
    },
  ];

  // 3. معالجة بعد AI والدمج
  const afterAI = await pipeline.processAfter(aiResults, rawData);
  console.log('النتائج النهائية:', afterAI.data);

  return afterAI.data;
}
```

### مثال 2: مع معالجة الأخطاء

```typescript
async function safeWorkflow() {
  const detector = new SensitiveDataDetector();

  try {
    const students = await fetchStudentsFromMoodle();

    // فحص البيانات الحساسة
    const detection = detector.detectInObject(students);

    if (detection.found && detection.summary.high > 0) {
      console.warn(`⚠️ تحذير: تم اكتشاف ${detection.summary.high} بيانات حساسة جداً!`);
      // يمكن إيقاف العملية أو المتابعة بناءً على السياسة
    }

    // متابعة المعالجة...
  } catch (error) {
    console.error('خطأ في المعالجة الآمنة:', error);
  }
}
```

---

## 7️⃣ أفضل الممارسات

### ✅ افعل

```typescript
// ✅ استخدم pipeline محسّن مسبقاً
import { createSecurePipeline } from '@/lib/protection';
const pipeline = createSecurePipeline();

// ✅ احتفظ بسجلات العمليات
const result = await pipeline.processBefore(data);
console.log('السجلات:', result.logs);

// ✅ تحقق دائماً من النجاح
if (result.success) {
  // استخدم البيانات
} else {
  // معالجة الأخطاء
}

// ✅ حافظ على البيانات الأصلية محليًا فقط
const originalData = await fetchOriginalData(); // محلي
const filteredData = filter.filterStudentData(originalData); // آمن للـ AI
```

### ❌ لا تفعل

```typescript
// ❌ لا تأرسل بيانات شخصية للـ AI
const unsafeData = {
  name: 'Ahmed', // ✗ معرف شخصي
  email: 'ahmed@uni.com', // ✗ بريد شخصي
  phone: '+966501234567', // ✗ هاتف شخصي
  grades: 85, // ✓ هذا OK
};

// ❌ لا تتجاهل البيانات الحساسة
// ❌ لا تحفظ كلمات المرور أو التوكنات مع البيانات الأخرى
// ❌ لا تنسِ تسجيل وعرض الأخطاء
```

---

## 8️⃣ استكشاف الأخطاء

### المشكلة: بيانات حساسة غير مكتشفة

```typescript
const detector = new SensitiveDataDetector();

// إضافة نمط مخصص
detector.addPattern('customField', {
  name: 'حقل مخصص',
  pattern: /YOUR_PATTERN_HERE/g,
  type: 'custom',
  severity: 'high',
});

const result = detector.detect(text);
```

### المشكلة: حقول مهمة تُحذف

```typescript
const filter = new DataFilter({
  allowedFields: [
    'student_id',
    'grades',
    'courses', // أضف الحقول المهمة
  ],
});
```

### المشكلة: بطء المعالجة

```typescript
// استخدم معالجة الدفعات (Batch Processing)
const pipeline = createSecurePipeline();

// قسّم البيانات الكبيرة
const batchSize = 50;
for (let i = 0; i < students.length; i += batchSize) {
  const batch = students.slice(i, i + batchSize);
  const result = await pipeline.processBefore(batch);
  // معالجة كل دفعة
}
```

---

## 📊 جدول المقارنة

| الميزة | Sensitive Detector | Data Filter | Result Merger | Pipeline |
|------|-------------------|------------|---------------|----------|
| كشف البيانات الحساسة | ✅ | ✓ | - | ✅ |
| تصفية البيانات | - | ✅ | - | ✅ |
| إخفاء (Masking) | - | ✅ | - | ✅ |
| دمج النتائج | - | - | ✅ | ✅ |
| إدارة العملية الكاملة | - | - | - | ✅ |
| السجلات | ✓ | ✓ | ✓ | ✅ |

---

## 🔗 الملفات المرتبطة

- [DATA_PROTECTION_STRATEGY_AR.md](DATA_PROTECTION_STRATEGY_AR.md) - الاستراتيجية الشاملة
- `src/lib/protection/examples.ts` - أمثلة عملية
- `src/lib/scraper/` - تكامل Scraper
- `src/lib/api/` - تكامل APIs

---

## 📞 الدعم والمساعدة

للأسئلة والمشاكل:
1. راجع الأمثلة في `src/lib/protection/examples.ts`
2. تحقق من السجلات للأخطاء التفصيلية
3. استخدم `verbose: true` لرؤية المزيد من التفاصيل

---

**آخر تحديث:** مارس 2026
**الحالة:** جاهز للإنتاج
