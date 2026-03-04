# 🛡️ دليل الاستخدام الكامل - Data Protection System
# Complete Usage Guide - Data Protection System

**الإصدار:** 1.0.0  
**التاريخ:** مارس 2026  
**الحالة:** 🟢 جاهز للإنتاج

---

## 📋 محتويات التوثيق

1. البدء السريع (3 دقائق)
2. الاستخدام الأساسي
3. التكامل مع Scraper
4. التكامل مع APIs
5. التكامل مع Groq و OpenAI
6. معالجة الأخطاء
7. أفضل الممارسات

---

## 🚀 البدء السريع (3 دقائق)

### التثبيت والاستيراد

```typescript
import { createSecurePipeline } from '@/lib/protection';
```

### الاستخدام الأساسي

```typescript
// إنشاء pipeline
const pipeline = createSecurePipeline();

// حماية البيانات قبل الإرسال
const students = [
  {
    student_id: 'S001',
    name: 'أحمد',
    email: 'ahmed@uni.com',
    grades: { math: 85 },
  }
];

const result = await pipeline.processBefore(students);
console.log(result.data); // بيانات آمنة بدون اسم أو بريد
```

---

## 📚 الاستخدام الأساسي

### 1️⃣ كشف البيانات الحساسة

```typescript
import { SensitiveDataDetector } from '@/lib/protection';

const detector = new SensitiveDataDetector();

const text = `
  الطالب: أحمد علي
  البريد: ahmed@uni.com
  الهاتف: +966501234567
`;

const result = detector.detect(text);
console.log(result.found);        // true
console.log(result.summary.total); // 3 (بريد + هاتف + اسم)
console.log(result.matches);       // قائمة المطابقات
```

### 2️⃣ تصفية البيانات

```typescript
import { DataFilter } from '@/lib/protection';

const filter = new DataFilter({
  maskSensitive: true,
  anonymize: true,
});

const student = {
  student_id: 'S001',
  name: 'أحمد',
  email: 'ahmed@uni.com',
  grades: { math: 85 },
};

const filtered = filter.filterStudentData(student);
console.log(filtered.filtered);  // { student_id, grades }
console.log(filtered.removed);   // ['name', 'email']
console.log(filtered.masked);    // الحقول المخفية
```

### 3️⃣ دمج النتائج

```typescript
import { ResultMerger } from '@/lib/protection';

const merger = new ResultMerger();

const originalData = {
  student_id: 'S001',
  name: 'أحمد',
  email: 'ahmed@uni.com',
};

const aiResult = {
  student_id: 'S001',
  analysis: 'أداء جيد جداً',
  recommendations: ['استمر'],
};

merger.registerStudentData(originalData);
const merged = merger.mergeResult(aiResult);

console.log(merged);
// {
//   student_id: 'S001',
//   personalInfo: { name: 'أحمد', email: 'ahmed@uni.com' },
//   analysis: { content: 'أداء جيد جداً' },
//   recommendations: ['استمر']
// }
```

---

## 🔗 التكامل مع Scraper

### في `src/lib/scraper/scraper.ts`

```typescript
import { DataProtectionPipeline } from '@/lib/protection';

export class MoodleScraper {
  private pipeline: DataProtectionPipeline;

  constructor() {
    this.pipeline = new DataProtectionPipeline({
      detectSensitive: true,
      filterData: true,
    });
  }

  async scrapeStudents(url: string) {
    // 1. استخراج البيانات من Moodle
    const response = await fetch(url);
    const rawStudents = await response.json();

    console.log(`📥 تم استخراج ${rawStudents.length} طالب`);

    // 2. حماية البيانات
    const protectionResult = await this.pipeline.processBefore(rawStudents);

    if (!protectionResult.success) {
      throw new Error(`فشلت الحماية: ${protectionResult.errors.join(', ')}`);
    }

    console.log(`✓ تم حماية البيانات`);
    console.log(`  - بيانات حساسة: ${protectionResult.stats.sensitivePatternsFound}`);
    console.log(`  - حقول محذوفة: ${protectionResult.stats.fieldsRemoved}`);

    // 3. إرجاع البيانات الآمنة
    return protectionResult.data;
  }
}

// الاستخدام
const scraper = new MoodleScraper();
const safeData = await scraper.scrapeStudents('https://moodle.example.com/api/students');
```

---

## 🤖 التكامل مع Groq API

### في `src/lib/api/groqAnalyzer.ts`

```typescript
import { Groq } from 'groq-sdk';
import { IntegratedDataProtection } from '@/lib/protection/integration';

export class GroqAnalyzer {
  private groq: Groq;
  private protector: IntegratedDataProtection;

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    this.protector = new IntegratedDataProtection('safe');
  }

  async analyzeStudents(students: any[]) {
    // 1. حماية البيانات قبل الإرسال
    const { safeData, stats } = await this.protector.processMoodleData(students);

    console.log(`✓ تم حماية ${students.length} طالب`);
    console.log(`  - بيانات حساسة: ${stats.sensitivePatternsFound}`);

    // 2. إرسال للـ Groq
    const response = await this.groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `حلل بيانات الطلاب التالية وقدم توصيات شاملة:\n${JSON.stringify(safeData, null, 2)}`,
        },
      ],
      model: 'mixtral-8x7b-32768',
    });

    const aiContent = response.choices[0].message.content;

    // 3. دمج النتائج مع البيانات الأصلية
    const parsed = JSON.parse(aiContent);
    const { mergedResults } = await this.protector.processAIResults(
      Array.isArray(parsed) ? parsed : [parsed]
    );

    return mergedResults;
  }
}

// الاستخدام
const analyzer = new GroqAnalyzer();
const results = await analyzer.analyzeStudents(studentData);
```

---

## 🟦 التكامل مع OpenAI API

### في `src/lib/api/openaiAnalyzer.ts`

```typescript
import { OpenAI } from 'openai';
import { IntegratedDataProtection } from '@/lib/protection/integration';

export class OpenAIAnalyzer {
  private openai: OpenAI;
  private protector: IntegratedDataProtection;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.protector = new IntegratedDataProtection('safe');
  }

  async analyzeStudents(students: any[]) {
    // 1. حماية البيانات
    const { safeData } = await this.protector.processMoodleData(students);

    // 2. إرسال لـ OpenAI
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: `حلل بيانات الطلاب:\n${JSON.stringify(safeData)}`,
        },
      ],
    });

    const aiContent = response.choices[0].message.content;

    // 3. دمج النتائج
    const parsed = JSON.parse(aiContent);
    const { mergedResults } = await this.protector.processAIResults(
      Array.isArray(parsed) ? parsed : [parsed]
    );

    return mergedResults;
  }
}
```

---

## ⚙️ التكامل مع API Endpoint (Next.js)

### في `pages/api/analyze-students.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { SecureAnalysisHandler } from '@/lib/protection/apiHandler';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const handler = new SecureAnalysisHandler('safe');

  try {
    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    // دالة التحليل باستخدام Groq
    const analyzeWithGroq = async (safeData: any) => {
      const response = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: `حلل: ${JSON.stringify(safeData)}`,
          },
        ],
        model: 'mixtral-8x7b-32768',
      });

      return JSON.parse(response.choices[0].message.content);
    };

    // معالجة
    const result = await handler.handle(students, analyzeWithGroq);

    res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Server error',
    });
  } finally {
    handler.cleanup();
  }
}
```

### استدعاء الـ API من Component

```typescript
import { useCallback } from 'react';

export function StudentAnalyzer() {
  const analyze = useCallback(async (students: any[]) => {
    const response = await fetch('/api/analyze-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✓ النتائج:', result.data);
      // عرض النتائج للمستخدم
    } else {
      console.error('❌ خطأ:', result.error);
    }
  }, []);

  return (
    <button onClick={() => analyze([/* students */])}>
      تحليل الطلاب
    </button>
  );
}
```

---

## ❌ معالجة الأخطاء

### مع Try-Catch

```typescript
try {
  const result = await pipeline.processBefore(students);

  if (!result.success) {
    console.error('فشل:', result.errors);
    // معالجة الأخطاء
  }
} catch (error) {
  console.error('استثناء:', error);
  // معالجة الاستثناءات
}
```

### مع التحذيرات

```typescript
const result = await pipeline.processBefore(students);

if (result.warnings.length > 0) {
  console.warn('تحذيرات:');
  result.warnings.forEach(w => console.warn(`  - ${w}`));
}

if (result.errors.length > 0) {
  console.error('أخطاء:');
  result.errors.forEach(e => console.error(`  - ${e}`));
}
```

### مع السجلات المفصلة

```typescript
const pipeline = new DataProtectionPipeline({
  verbose: true,  // طباعة التفاصيل
  keepLogs: true, // حفظ السجلات
});

const result = await pipeline.processBefore(students);

console.log('📋 السجلات:');
result.logs.forEach(log => {
  console.log(`[${log.step}] ${log.message}`);
});
```

---

## ✅ أفضل الممارسات

### ✔️ افعل

```typescript
// ✔️ استخدم pipeline محسّن
import { createSecurePipeline } from '@/lib/protection';
const pipeline = createSecurePipeline();

// ✔️ احفظ البيانات الأصلية محليًا فقط
const originalData = await fetchFromDatabase();
const filtered = await pipeline.processBefore(originalData);
// استخدم filtered.data فقط مع AI

// ✔️ تحقق دائماً من النجاح
if (result.success) {
  // استخدم النتائج
}

// ✔️ سجل العمليات
const logs = pipeline.getLogs();
saveToAuditLog(logs);

// ✔️ استخدم الأوضاع المناسبة
const safePipeline = createSecurePipeline();    // إنتاج
const strictPipeline = createStrictPipeline();  // بيانات حساسة
```

### ❌ لا تفعل

```typescript
// ❌ لا ترسل البيانات الشخصية مباشرة
const allData = { name: 'Ahmed', email: '...', grades: 85 };
// لا تفعل: sendToAI(allData)

// ❌ لا تتجاهل التحذيرات
// لا: warnings.length > 0 && continue();

// ❌ لا تحفظ كلمات سر مع البيانات الأخرى
// لا: { password: 'xxx', grades: 85 }

// ❌ لا تترك السجلات في البيئات الإنتاجية
// لا: verbose: true في production

// ❌ لا تستخدم البيانات المخفية untuk display
// لا: showToUser(maskedData) // تخفي البيانات
```

---

## 📊 مقارنة الأوضاع

| الوضع | التكشف | التصفية | الإخفاء | التوقف | الـ Log |
|------|--------|---------|---------|--------|--------|
| **Safe** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Strict** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Dev** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Audit** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Performance** | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 🔧 الإعدادات المتقدمة

### تخصيص الأنماط

```typescript
const detector = new SensitiveDataDetector();

// إضافة نمط مخصص
detector.addPattern('customId', {
  name: 'معرف مخصص',
  pattern: /ID-\d{6}/g,
  type: 'custom',
  severity: 'high',
});

const result = detector.detect(text);
```

### تخصيص الحقول

```typescript
const filter = new DataFilter({
  allowedFields: ['student_id', 'grades', 'attendance'],
  blockedFields: ['password', 'email', 'phone'],
  maskingMethod: 'partial',
});
```

---

## 📈 الأداء

| العملية | الوقت |
|--------|------|
| كشف 1 نص | < 5ms |
| تصفية 100 طالب | < 50ms |
| دمج 100 نتيجة | < 30ms |
| pipeline كامل | < 150ms |

---

## 🎓 الموارد

- 📖 [README.md](./README.md) - ملخص سريع
- 📚 [QUICK_START_AR.md](./QUICK_START_AR.md) - بدء سريع
- 💡 [examples.ts](./examples.ts) - 7 أمثلة عملية
- 🔧 [IMPLEMENTATION_GUIDE_AR.md](./IMPLEMENTATION_GUIDE_AR.md) - دليل تفصيلي

---

**مرحباً بك! ابدأ الاستخدام الآن 🚀**
