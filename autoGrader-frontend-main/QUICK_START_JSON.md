# دليل البدء السريع - دعم JSON

## 🚀 البدء السريع

### 1. استخدام المكتبة

```typescript
import { JsonProcessor } from '@/lib/json';

// مثال بسيط
const data = { name: 'أحمد', age: 25 };
const stats = JsonProcessor.calculateStats(data);
console.log(stats);
```

### 2. استخدام المكونات

```tsx
import { JsonViewer } from '@/components/json';

function MyComponent() {
    const data = { /* بياناتك */ };
    return <JsonViewer data={data} />;
}
```

### 3. الوصول إلى الأدوات

- أداة JSON: [http://localhost:3000/json-tool](http://localhost:3000/json-tool)
- أداة المقارنة: [http://localhost:3000/json-compare](http://localhost:3000/json-compare)

---

## 📖 أمثلة سريعة

### تنسيق JSON
```typescript
const formatted = JsonProcessor.prettyPrint(data, 2);
```

### البحث في JSON
```typescript
const results = JsonProcessor.search(data, 'searchTerm');
```

### مقارنة JSON
```typescript
const diff = JsonProcessor.compare(obj1, obj2);
```

### تسطيح JSON
```typescript
const flat = JsonProcessor.flatten(nestedData);
```

### دمج JSON
```typescript
const merged = JsonProcessor.deepMerge(obj1, obj2);
```

---

## 🎯 الوظائف الأكثر استخداماً

1. **deepClone** - نسخ آمن
2. **getByPath** - الوصول بالمسار
3. **search** - البحث
4. **compare** - المقارنة
5. **flatten** - التسطيح

---

## 📚 المزيد من المعلومات

- التوثيق الكامل: `src/lib/json/README.md`
- الأمثلة: `src/lib/json/examples.ts`
- الدليل الشامل: `Documents/JSON_Support_Documentation.md`

---

## ✅ جاهز للاستخدام!

جميع الملفات والمكونات جاهزة. ابدأ الآن! 🎉
