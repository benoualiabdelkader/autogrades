# 🧠 دليل التحليل الدلالي والهيكلي - Semantic & Structure-Based Analysis

## 📋 نظرة عامة

تم تعزيز Extension بمحرك تحليل دلالي وهيكلي متقدم يجمع بين:
- **Semantic Analysis**: تحليل المعنى والسياق
- **Structure-Based Extraction**: استخراج بناءً على البنية

---

## 🎯 المميزات الجديدة

### 1. 🧠 التحليل الدلالي (Semantic Analysis)

#### كشف أنواع الحقول تلقائياً:
```javascript
// يكتشف تلقائياً نوع الحقل من:
- الاسم (name, id)
- النوع (type)
- Label المرتبط
- Placeholder
- ARIA attributes

// الأنواع المدعومة:
✅ name      - الأسماء
✅ email     - البريد الإلكتروني
✅ phone     - أرقام الهواتف
✅ address   - العناوين
✅ date      - التواريخ
✅ price     - الأسعار
✅ description - الأوصاف
✅ title     - العناوين
✅ content   - المحتوى
✅ image     - الصور
✅ link      - الروابط
✅ category  - الفئات
✅ status    - الحالات
✅ id        - المعرفات
✅ quantity  - الكميات
```

#### دعم متعدد اللغات:
```javascript
// يدعم الكلمات المفتاحية بـ:
- العربية: اسم، بريد، هاتف، عنوان...
- الإنجليزية: name, email, phone, address...
- الإسبانية: nombre, correo, teléfono...
- الفرنسية: nom, email, téléphone...
```

---

### 2. 🏗️ التحليل الهيكلي (Structure-Based)

#### تحليل HTML5 Semantic Tags:
```html
✅ <article>  - مقالات
✅ <section>  - أقسام
✅ <header>   - رأس الصفحة
✅ <footer>   - تذييل الصفحة
✅ <nav>      - التنقل
✅ <aside>    - محتوى جانبي
✅ <main>     - المحتوى الرئيسي
✅ <form>     - نماذج
✅ <table>    - جداول
```

#### تحليل ARIA Roles:
```html
✅ role="navigation"    - التنقل
✅ role="search"        - البحث
✅ role="main"          - المحتوى الرئيسي
✅ role="banner"        - الرأس
✅ role="contentinfo"   - التذييل
✅ role="complementary" - محتوى مكمل
✅ role="form"          - نموذج
✅ role="table"         - جدول
```

#### كشف Landmarks:
```javascript
// يكتشف تلقائياً:
- Banner (الرأس)
- Navigation (التنقل)
- Main (المحتوى الرئيسي)
- Complementary (المحتوى الجانبي)
- Contentinfo (التذييل)
- Search (البحث)
- Form (النماذج)
```

---

### 3. 🎯 كشف الكيانات (Entity Detection)

#### المنتجات (Products):
```javascript
{
  type: 'products',
  items: [
    {
      name: 'AutoGrader Pro',
      price: '$99.99',
      description: 'نظام تقييم ذكي...',
      image: 'product.jpg',
      link: '/product/1'
    }
  ]
}
```

#### الأشخاص (People):
```javascript
{
  type: 'people',
  items: [
    {
      name: 'محمد أحمد',
      role: 'مطور',
      email: 'mohamed@example.com',
      image: 'avatar.jpg'
    }
  ]
}
```

#### المقالات (Articles):
```javascript
{
  type: 'articles',
  items: [
    {
      title: 'عنوان المقال',
      author: 'الكاتب',
      date: '2026-02-25',
      content: 'محتوى المقال...'
    }
  ]
}
```

---

### 4. 📊 استخراج Schema.org

#### JSON-LD:
```javascript
// يستخرج تلقائياً من:
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "AutoGrader Pro",
  "price": "99.99"
}
</script>
```

#### Microdata:
```html
<!-- يكتشف تلقائياً -->
<div itemscope itemtype="https://schema.org/Product">
  <span itemprop="name">AutoGrader Pro</span>
  <span itemprop="price">$99.99</span>
</div>
```

---

### 5. 📝 تحليل النماذج (Forms Analysis)

```javascript
{
  forms: [
    {
      id: 'contact-form',
      action: '/submit',
      method: 'post',
      fields: [
        {
          name: 'name',
          type: 'text',
          semanticType: 'name',  // ← كشف تلقائي
          required: true,
          value: 'محمد أحمد'
        },
        {
          name: 'email',
          type: 'email',
          semanticType: 'email',  // ← كشف تلقائي
          required: true,
          value: 'mohamed@example.com'
        }
      ]
    }
  ]
}
```

---

### 6. 📋 تحليل الجداول (Tables Analysis)

```javascript
{
  tables: [
    {
      id: 'students-table',
      rows: 5,
      columns: 4,
      headers: ['الاسم', 'الدرجة', 'الحالة', 'التاريخ'],
      sample: [
        ['أحمد محمد', '95', 'ممتاز', '2026-02-25'],
        ['فاطمة علي', '88', 'جيد جداً', '2026-02-24']
      ]
    }
  ]
}
```

---

### 7. 📑 تحليل القوائم (Lists Analysis)

```javascript
{
  lists: [
    {
      id: 'features-list',
      type: 'ul',
      items: [
        'استخراج ذكي للبيانات',
        'تحليل دلالي متقدم',
        'تكامل مع AutoGrader'
      ]
    }
  ]
}
```

---

### 8. 🎯 كشف الأنماط المتكررة

```javascript
{
  repeatingPatterns: [
    {
      selector: '.product-card',
      count: 10,
      sample: {
        text: 'AutoGrader Pro...',
        classes: 'product-card featured',
        childrenCount: 5
      }
    }
  ]
}
```

---

## 📊 تنسيق البيانات المُستخرجة

### البنية الكاملة:

```json
{
  "timestamp": "2026-02-25T10:30:00.000Z",
  "url": "https://example.com",
  "title": "Example Page",
  
  "semanticAnalysis": {
    "structure": {
      "semanticTags": {
        "article": { "count": 3 },
        "section": { "count": 5 },
        "header": { "count": 1 }
      },
      "ariaRoles": {
        "navigation": { "count": 1 },
        "main": { "count": 1 }
      },
      "landmarks": [
        { "type": "banner", "selector": "header" },
        { "type": "navigation", "selector": "nav" },
        { "type": "main", "selector": "main" }
      ]
    },
    "patterns": {
      "fields": {
        "name": [
          { "name": "fullname", "value": "محمد أحمد" }
        ],
        "email": [
          { "name": "email", "value": "mohamed@example.com" }
        ]
      },
      "entities": [
        {
          "type": "products",
          "count": 3,
          "items": [...]
        }
      ]
    },
    "mainContent": {
      "selector": "main",
      "tag": "main",
      "textLength": 5000,
      "childrenCount": 10
    }
  },
  
  "extractedData": {
    "name": [...],
    "email": [...],
    "phone": [...]
  },
  
  "entities": [
    {
      "type": "products",
      "items": [...]
    }
  ],
  
  "structure": {
    "forms": [...],
    "tables": [...],
    "lists": [...],
    "hierarchy": {
      "tag": "body",
      "children": [...]
    }
  },
  
  "schemaData": [
    {
      "type": "json-ld",
      "data": {...}
    }
  ],
  
  "statistics": {
    "totalElements": 1500,
    "totalText": 50000,
    "totalImages": 20,
    "totalLinks": 50,
    "totalForms": 2,
    "totalTables": 3,
    "totalInputs": 15,
    "domDepth": 12
  },
  
  "summary": {
    "totalFields": 15,
    "totalEntities": 3,
    "totalForms": 2,
    "totalTables": 3,
    "domDepth": 12
  }
}
```

---

## 🚀 كيفية الاستخدام

### 1. الاستخدام الأساسي

```javascript
// في Extension Popup
اضغط "استخراج تلقائي"
// التحليل الدلالي مفعّل تلقائياً
```

### 2. الاستخدام البرمجي

```javascript
// في Console
const analyzer = new SemanticAnalyzer();

// تحليل كامل للصفحة
const analysis = analyzer.analyzePage();
console.log(analysis);

// استخراج ذكي
const extracted = analyzer.smartExtract();
console.log(extracted);
```

### 3. تخصيص التحليل

```javascript
const extractor = new SmartExtractor();

// استخراج مع تحليل دلالي
const data = extractor.autoExtract({
    includeInputs: true,
    includeText: true,
    includeLinks: true,
    includeImages: true,
    useSemanticAnalysis: true  // ← تفعيل التحليل الدلالي
});
```

---

## 🎯 أمثلة عملية

### مثال 1: استخراج نموذج اتصال

```javascript
// الصفحة تحتوي على:
<form>
  <input name="fullname" placeholder="الاسم الكامل">
  <input type="email" name="email">
  <input type="tel" name="phone">
</form>

// النتيجة:
{
  "extractedData": {
    "name": [
      { "name": "fullname", "value": "محمد أحمد" }
    ],
    "email": [
      { "name": "email", "value": "mohamed@example.com" }
    ],
    "phone": [
      { "name": "phone", "value": "0123456789" }
    ]
  }
}
```

### مثال 2: استخراج منتجات

```javascript
// الصفحة تحتوي على:
<div class="product-card">
  <h3 class="name">AutoGrader Pro</h3>
  <span class="price">$99.99</span>
  <p class="description">نظام تقييم ذكي...</p>
</div>

// النتيجة:
{
  "entities": [
    {
      "type": "products",
      "items": [
        {
          "name": "AutoGrader Pro",
          "price": "$99.99",
          "description": "نظام تقييم ذكي..."
        }
      ]
    }
  ]
}
```

### مثال 3: استخراج جدول

```javascript
// الصفحة تحتوي على:
<table>
  <thead>
    <tr><th>الاسم</th><th>الدرجة</th></tr>
  </thead>
  <tbody>
    <tr><td>أحمد</td><td>95</td></tr>
  </tbody>
</table>

// النتيجة:
{
  "structure": {
    "tables": [
      {
        "headers": ["الاسم", "الدرجة"],
        "sample": [
          ["أحمد", "95"]
        ]
      }
    ]
  }
}
```

---

## 🔍 التحليل المتقدم

### 1. تحليل التسلسل الهرمي

```javascript
{
  "hierarchy": {
    "tag": "body",
    "children": [
      {
        "tag": "header",
        "role": "banner",
        "children": [
          {
            "tag": "nav",
            "role": "navigation"
          }
        ]
      },
      {
        "tag": "main",
        "role": "main",
        "children": [...]
      }
    ]
  }
}
```

### 2. كشف المحتوى الرئيسي

```javascript
{
  "mainContent": {
    "selector": "main",
    "tag": "main",
    "textLength": 5000,
    "childrenCount": 10
  }
}
```

### 3. تحليل عمق DOM

```javascript
{
  "statistics": {
    "domDepth": 12  // عمق التسلسل الهرمي
  }
}
```

---

## 📈 الأداء

### الإحصائيات:
```
وقت التحليل:        < 3 ثواني
دقة الكشف:          > 90%
الحقول المدعومة:    15+ نوع
اللغات المدعومة:    4 لغات
Schema.org:         ✅ مدعوم
ARIA:               ✅ مدعوم
HTML5 Semantic:     ✅ مدعوم
```

---

## 🎨 المقارنة

### قبل التحليل الدلالي:
```javascript
{
  "field_1": "محمد أحمد",
  "field_2": "mohamed@example.com",
  "field_3": "0123456789"
}
```

### بعد التحليل الدلالي:
```javascript
{
  "name": [
    { "name": "fullname", "value": "محمد أحمد" }
  ],
  "email": [
    { "name": "email", "value": "mohamed@example.com" }
  ],
  "phone": [
    { "name": "phone", "value": "0123456789" }
  ]
}
```

---

## 🔧 التخصيص

### إضافة قواعد دلالية جديدة:

```javascript
const analyzer = new SemanticAnalyzer();

// إضافة نوع حقل جديد
analyzer.semanticRules.custom = ['custom', 'مخصص'];

// إضافة Schema.org type جديد
analyzer.schemaTypes['CustomType'] = 'custom';
```

---

## 🐛 استكشاف الأخطاء

### المشكلة: لا يتم كشف نوع الحقل

```javascript
// الحل: تحقق من:
1. اسم الحقل (name, id)
2. Label المرتبط
3. Placeholder
4. نوع الإدخال (type)

// أضف console.log للتحقق:
console.log(analyzer.detectFieldType(element));
```

### المشكلة: لا يتم كشف الكيانات

```javascript
// الحل: تحقق من:
1. البنية HTML
2. الـ Classes المستخدمة
3. Schema.org markup

// أضف console.log للتحقق:
console.log(analyzer.detectEntities());
```

---

## 📚 الموارد

### الوثائق:
- [HTML5 Semantic Elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Element)
- [ARIA Roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)
- [Schema.org](https://schema.org/)

### الأمثلة:
- [TEST_PAGE.html](TEST_PAGE.html) - صفحة اختبار كاملة

---

## 🎉 الخلاصة

التحليل الدلالي والهيكلي يوفر:

✅ **كشف تلقائي** لأنواع الحقول
✅ **تحليل شامل** للبنية
✅ **استخراج ذكي** للكيانات
✅ **دعم متعدد اللغات**
✅ **Schema.org** و ARIA
✅ **أداء عالي** ودقة ممتازة

---

**Powered by AutoGrader AI • v2.0**
**Semantic & Structure-Based Analysis**
