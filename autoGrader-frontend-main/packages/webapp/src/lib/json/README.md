# Advanced JSON Processing Library

مكتبة قوية ومتقدمة لمعالجة وتحليل ملفات JSON في TypeScript/JavaScript.

## المميزات الرئيسية

### 1. معالجة البيانات (Data Manipulation)
- **Deep Clone**: نسخ عميق للكائنات
- **Deep Merge**: دمج متعدد المستويات للكائنات
- **Flatten/Unflatten**: تحويل البنية المتداخلة إلى مسطحة والعكس
- **Path Operations**: الوصول والتعديل باستخدام المسارات (e.g., "user.address.city")

### 2. التحليل والإحصائيات (Analysis & Statistics)
- حساب حجم JSON
- عمق التداخل
- عدد المفاتيح والقيم
- إحصائيات أنواع البيانات (strings, numbers, booleans, nulls, arrays, objects)

### 3. البحث والتصفية (Search & Filter)
- بحث متقدم في المفاتيح والقيم
- دعم البحث الحساس لحالة الأحرف
- استخراج جميع المفاتيح
- تصفية حسب المسار

### 4. المقارنة (Comparison)
- مقارنة شاملة بين كائنين JSON
- تحديد الفروقات (added, removed, modified)
- عرض المسارات المتأثرة

### 5. التحويل (Transformation)
- ترتيب المفاتيح أبجدياً
- إزالة القيم الفارغة (null/undefined)
- تحويل مخصص باستخدام دوال
- تنسيق وضغط

### 6. التحقق (Validation)
- التحقق من صحة البنية
- التحقق من المخطط (Schema Validation)
- رسائل خطأ وتحذيرات مفصلة

## أمثلة الاستخدام

### مثال 1: Deep Clone
```typescript
import { JsonProcessor } from '@/lib/json/JsonProcessor';

const original = { user: { name: 'Ahmed', age: 25 } };
const cloned = JsonProcessor.deepClone(original);
```

### مثال 2: Flatten & Unflatten
```typescript
const nested = {
    user: {
        name: 'Ahmed',
        address: {
            city: 'Cairo',
            country: 'Egypt'
        }
    }
};

const flattened = JsonProcessor.flatten(nested);
// Result: { 'user.name': 'Ahmed', 'user.address.city': 'Cairo', ... }

const unflattened = JsonProcessor.unflatten(flattened);
// Back to original structure
```

### مثال 3: Path Operations
```typescript
const data = { user: { profile: { email: 'test@example.com' } } };

// Get value
const email = JsonProcessor.getByPath(data, 'user.profile.email');

// Set value
JsonProcessor.setByPath(data, 'user.profile.phone', '+20123456789');

// Delete value
JsonProcessor.deleteByPath(data, 'user.profile.email');
```

### مثال 4: Statistics
```typescript
const data = { /* your JSON data */ };
const stats = JsonProcessor.calculateStats(data);

console.log(stats);
// {
//   size: 1234,
//   depth: 3,
//   keys: 15,
//   arrays: 2,
//   objects: 5,
//   strings: 8,
//   numbers: 4,
//   booleans: 2,
//   nulls: 1
// }
```

### مثال 5: Search
```typescript
const data = {
    users: [
        { name: 'Ahmed', email: 'ahmed@example.com' },
        { name: 'Sara', email: 'sara@example.com' }
    ]
};

const results = JsonProcessor.search(data, 'ahmed');
// Returns all paths and values containing 'ahmed'
```

### مثال 6: Compare
```typescript
const obj1 = { name: 'Ahmed', age: 25, city: 'Cairo' };
const obj2 = { name: 'Ahmed', age: 26, country: 'Egypt' };

const comparison = JsonProcessor.compare(obj1, obj2);
console.log(comparison.differences);
// [
//   { path: 'age', type: 'modified', oldValue: 25, newValue: 26 },
//   { path: 'city', type: 'removed', oldValue: 'Cairo' },
//   { path: 'country', type: 'added', newValue: 'Egypt' }
// ]
```

### مثال 7: Deep Merge
```typescript
const obj1 = { user: { name: 'Ahmed', settings: { theme: 'dark' } } };
const obj2 = { user: { age: 25, settings: { language: 'ar' } } };

const merged = JsonProcessor.deepMerge(obj1, obj2);
// Result: { user: { name: 'Ahmed', age: 25, settings: { theme: 'dark', language: 'ar' } } }
```

### مثال 8: Sort Keys
```typescript
const unsorted = { z: 1, a: 2, m: { y: 3, b: 4 } };
const sorted = JsonProcessor.sortKeys(unsorted);
// Result: { a: 2, m: { b: 4, y: 3 }, z: 1 }
```

### مثال 9: Remove Nullish Values
```typescript
const data = { name: 'Ahmed', age: null, email: undefined, city: 'Cairo' };
const cleaned = JsonProcessor.removeNullish(data);
// Result: { name: 'Ahmed', city: 'Cairo' }
```

### مثال 10: Transform
```typescript
const data = { name: 'ahmed', email: 'AHMED@EXAMPLE.COM' };

const transformed = JsonProcessor.transform(data, (key, value) => {
    if (typeof value === 'string') {
        return value.toLowerCase();
    }
    return value;
});
// Result: { name: 'ahmed', email: 'ahmed@example.com' }
```

## المكونات المتاحة (React Components)

### JsonViewer
عارض تفاعلي لملفات JSON مع إمكانية الطي والنسخ.

```tsx
import { JsonViewer } from '@/components/json/JsonViewer';

<JsonViewer 
    data={myJsonData} 
    name="root" 
    collapsed={false}
    theme="dark"
/>
```

### JsonEditor
محرر تفاعلي لتعديل JSON مباشرة.

```tsx
import { JsonEditor } from '@/components/json/JsonEditor';

<JsonEditor 
    initialData={myJsonData}
    onChange={(newData) => console.log(newData)}
    readOnly={false}
/>
```

### JsonDiff
مقارنة بصرية بين كائنين JSON.

```tsx
import { JsonDiff } from '@/components/json/JsonDiff';

<JsonDiff 
    json1={jsonString1}
    json2={jsonString2}
    title1="Original"
    title2="Modified"
/>
```

## الصفحات المتاحة

### 1. JSON Tool (`/json-tool`)
أداة شاملة لمعالجة JSON مع:
- تنسيق وضغط
- التحقق من الصحة
- البحث والتصفية
- التحويل من/إلى CSV
- استخراج المفاتيح
- التسطيح والترتيب
- الإحصائيات

### 2. JSON Compare (`/json-compare`)
أداة مقارنة متقدمة لملفات JSON مع:
- مقارنة جنباً إلى جنب
- عرض الفروقات بالألوان
- إمكانية التبديل بين الملفات

## الأداء والكفاءة

- معالجة سريعة للملفات الكبيرة
- استخدام فعال للذاكرة
- دعم العمليات المتزامنة
- تحسين للأداء في المتصفح

## الأمان

- تنظيف البيانات تلقائياً
- حماية من الحقن
- التحقق من الصحة قبل المعالجة
- معالجة آمنة للأخطاء

## المتطلبات

- React 18+
- TypeScript 4.5+
- Next.js 13+ (اختياري)

## الترخيص

MIT License

## المساهمة

نرحب بالمساهمات! يرجى فتح Issue أو Pull Request.
