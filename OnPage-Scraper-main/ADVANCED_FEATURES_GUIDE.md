# 🚀 دليل الميزات المتقدمة - AutoGrader Smart Scraper

## 📋 نظرة عامة

تم تعزيز Extension بقدرات متقدمة شاملة تشمل:

## ✨ الميزات الجديدة

### 📌 1. دعم أنواع مختلفة من البيانات

#### أنواع البيانات المدعومة:
- ✅ **النصوص (Text)**
  - العناوين (H1-H6)
  - الفقرات
  - القوائم (مرتبة وغير مرتبة)
  - عدد الكلمات

- ✅ **الصور (Images)**
  - URL الصورة
  - النص البديل (Alt)
  - العنوان (Title)
  - الأبعاد (Width x Height)
  - تحويل إلى Base64 (للصور الصغيرة)
  - صور الخلفية (Background Images)

- ✅ **الروابط (Links)**
  - روابط داخلية (Internal)
  - روابط خارجية (External)
  - روابط البريد الإلكتروني (mailto:)
  - أرقام الهواتف (tel:)

- ✅ **الجداول (Tables)**
  - استخراج الرؤوس (Headers)
  - استخراج الصفوف (Rows)
  - دعم colspan & rowspan
  - العناوين والملخصات

- ✅ **الملفات (Files)**
  - مستندات: PDF, DOC, DOCX, TXT
  - جداول البيانات: XLS, XLSX, CSV
  - العروض التقديمية: PPT, PPTX
  - الأرشيفات: ZIP, RAR, 7Z
  - الوسائط: الصور، الفيديو، الصوت

- ✅ **البيانات الوصفية (Metadata)**
  - Meta Tags
  - Open Graph
  - Twitter Cards
  - Schema.org (JSON-LD)

#### كيفية الاستخدام:

```javascript
// استخراج جميع أنواع البيانات
chrome.tabs.sendMessage(tabId, { 
    action: 'extractAllData' 
}, (response) => {
    console.log(response.data);
});

// استخراج نوع معين
chrome.tabs.sendMessage(tabId, { 
    action: 'extractImages' 
}, (response) => {
    console.log(response.data.items);
});
```

---

### 📌 2. التعامل مع المواقع الديناميكية

#### القدرات:
- ✅ انتظار تحميل المحتوى الديناميكي
- ✅ دعم AJAX Requests
- ✅ التمرير التلقائي (Auto Scroll)
- ✅ Infinite Scroll Handling
- ✅ Lazy Loading Support
- ✅ مراقبة تغييرات DOM
- ✅ اعتراض Fetch و XMLHttpRequest

#### أمثلة الاستخدام:

```javascript
// انتظار تحميل المحتوى الديناميكي
chrome.tabs.sendMessage(tabId, {
    action: 'waitForDynamicContent',
    options: {
        timeout: 30000,
        scrollToBottom: true,
        waitForAjax: true,
        selector: '.dynamic-content'
    }
});

// التعامل مع Infinite Scroll
chrome.tabs.sendMessage(tabId, {
    action: 'handleInfiniteScroll',
    options: {
        maxScrolls: 10,
        scrollDelay: 2000,
        itemSelector: '.post-item'
    }
});
```

---

### 📌 3. إعدادات التحكم والـ Rate Limiting

#### الميزات:
- ✅ تحديد عدد الطلبات في الثانية
- ✅ التحكم في التأخير بين الطلبات
- ✅ الحد الأقصى للعمليات المتزامنة
- ✅ طابور ذكي للطلبات (Queue System)

#### الإعدادات:

```javascript
{
    rateLimiting: {
        enabled: true,
        requestsPerSecond: 2,
        delayBetweenRequests: 500, // ms
        maxConcurrent: 3
    }
}
```

---

### 📌 4. إدارة الجلسات وملفات الكوكيز

#### القدرات:
- ✅ حفظ واسترجاع الجلسات الكاملة
- ✅ إدارة الكوكيز (Cookies)
- ✅ حفظ localStorage & sessionStorage
- ✅ دعم تسجيل الدخول
- ✅ تشفير بيانات تسجيل الدخول

#### أمثلة:

```javascript
// حفظ جلسة
const sessionManager = new SessionManager();
await sessionManager.saveSession('my-session', {
    url: 'https://example.com',
    authState: { loggedIn: true }
});

// استرجاع جلسة
await sessionManager.restoreSession('my-session');

// حفظ بيانات تسجيل الدخول
await sessionManager.saveLoginCredentials('example.com', {
    username: 'user@example.com',
    password: 'encrypted-password'
});
```

---

### 📌 5. تغيير الهويات (User-Agent Rotation)

#### الميزات:
- ✅ مكتبة شاملة من User-Agents
- ✅ تدوير تلقائي
- ✅ تدوير بناءً على عدد الطلبات
- ✅ دعم المتصفحات: Chrome, Firefox, Safari, Edge
- ✅ إضافة User-Agents مخصصة

#### نظام مكافحة الكشف:
- ✅ إخفاء WebDriver
- ✅ تعديل خصائص Navigator
- ✅ محاكاة السلوك البشري
- ✅ حركة الماوس العشوائية
- ✅ التمرير الطبيعي
- ✅ توليد بصمة متصفح واقعية
- ✅ كشف Anti-Scraping (Captcha, Cloudflare)

```javascript
// تطبيق مكافحة الكشف
const antiDetection = new AntiDetectionSystem();
antiDetection.applyAntiDetection({
    hideWebDriver: true,
    modifyNavigator: true
});

// محاكاة السلوك البشري
await antiDetection.simulateMouseMovement();
await antiDetection.simulateNaturalScroll(1000);
```

---

### 📌 6. الأداء والمعالجة المتوازية

#### نظام إدارة الأداء:
- ✅ **Rate Limiter**: منع الطلبات الزائدة
- ✅ **Performance Monitor**: مراقبة الأداء والذاكرة
- ✅ **Worker Pool**: معالجة متوازية
- ✅ **Cache Manager**: تخزين مؤقت ذكي

#### أمثلة:

```javascript
// استخدام Rate Limiter
const limiter = new RateLimiter({
    requestsPerSecond: 2,
    delayBetweenRequests: 500
});

await limiter.enqueue(async () => {
    return await extractData();
});

// مراقبة الأداء
const monitor = new PerformanceMonitor();
monitor.startTiming('extraction');
// ... عمليات الاستخراج
monitor.endTiming('extraction');
const stats = monitor.getSummary();

// استخدام Cache
const cache = new CacheManager(100);
cache.set('key', data, 3600000); // 1 hour TTL
const cachedData = cache.get('key');
```

---

### 📌 7. التعامل مع Captcha والحماية

#### نظام الكشف:
- ✅ كشف reCAPTCHA
- ✅ كشف Cloudflare
- ✅ كشف Rate Limiting
- ✅ كشف تشفير الكود
- ✅ كشف بصمة المتصفح

```javascript
const detection = antiDetection.detectAntiScraping();
console.log(detection);
// {
//     hasRecaptcha: false,
//     hasCloudflare: false,
//     hasObfuscation: false,
//     hasFingerprinting: true
// }
```

---

### 📌 8. الترخيص القانوني والأخلاقي

#### الإعدادات:
- ✅ احترام شروط الخدمة
- ✅ فحص robots.txt
- ✅ تحذير من المواقع المحظورة
- ✅ حد أقصى للصفحات لكل موقع

```javascript
{
    legal: {
        respectTermsOfService: true,
        checkRobotsTxt: true,
        warnOnRestrictedSites: true,
        maxPagesPerSite: 1000
    }
}
```

```javascript
// فحص قيود الموقع
const restrictions = await advancedSettings.checkSiteRestrictions(url);
if (!restrictions.allowed) {
    console.error('موقع محظور:', restrictions.reason);
}

// فحص robots.txt
const robotsCheck = await advancedSettings.checkRobotsTxt(url);
```

---

### 📌 9. التصدير بصيغ متعددة

#### الصيغ المدعومة:
- ✅ JSON
- ✅ CSV
- ✅ XML
- ✅ Excel (قريباً)

```javascript
// تصدير البيانات
chrome.tabs.sendMessage(tabId, {
    action: 'exportData',
    format: 'json' // or 'csv', 'xml'
}, (response) => {
    const data = response.data;
    // حفظ الملف
});
```

---

## 🎯 واجهة الإعدادات المتقدمة

تم إنشاء واجهة شاملة للتحكم في جميع الميزات:

### الوصول للإعدادات:
1. افتح Extension
2. اضغط على "الإعدادات المتقدمة"

### التبويبات:
1. **📊 أنواع البيانات**: تحكم في أنواع البيانات المستخرجة
2. **⚡ الأداء**: إعدادات Rate Limiting والتخزين المؤقت
3. **🔒 الأمان**: User-Agent Rotation ومكافحة الكشف
4. **🛠️ متقدم**: إعدادات قانونية وتصدير
5. **📈 الإحصائيات**: مراقبة الأداء والذاكرة

---

## 📦 الملفات الجديدة

### Core Files:
1. **advanced-settings.js** - نظام إدارة الإعدادات
2. **data-extractor.js** - محرك استخراج البيانات المتقدم
3. **session-manager.js** - إدارة الجلسات والكوكيز
4. **dynamic-content-handler.js** - معالج المحتوى الديناميكي
5. **anti-detection.js** - نظام مكافحة الكشف
6. **performance-manager.js** - إدارة الأداء والـ Rate Limiting
7. **enhanced-integration.js** - دمج الميزات المتقدمة

### UI Files:
8. **advanced-settings.html** - واجهة الإعدادات
9. **advanced-settings-ui.js** - التحكم في الواجهة

---

## 🚀 البدء السريع

### 1. تثبيت Extension المحدثة:
```bash
1. افتح Chrome/Edge
2. اذهب إلى chrome://extensions
3. فعّل "وضع المطور"
4. اضغط "تحميل Extension غير محزومة"
5. اختر مجلد extension
```

### 2. استخدام الميزات الأساسية:

```javascript
// في content script أو من خلال رسائل Chrome
(async () => {
    // استخراج جميع البيانات
    const response = await chrome.tabs.sendMessage(tabId, {
        action: 'extractAllData'
    });
    
    console.log('النصوص:', response.data.text);
    console.log('الصور:', response.data.images);
    console.log('الروابط:', response.data.links);
    console.log('الجداول:', response.data.tables);
    console.log('الملفات:', response.data.files);
})();
```

### 3. للمواقع الديناميكية:

```javascript
// انتظار تحميل المحتوى
await chrome.tabs.sendMessage(tabId, {
    action: 'waitForDynamicContent',
    options: {
        scrollToBottom: true,
        waitForAjax: true,
        timeout: 30000
    }
});

// ثم استخراج البيانات
const data = await chrome.tabs.sendMessage(tabId, {
    action: 'extractAllData'
});
```

---

## ⚙️ الإعدادات الموصى بها

### للاستخدام العام:
```json
{
    "rateLimiting": {
        "enabled": true,
        "requestsPerSecond": 2,
        "delayBetweenRequests": 500
    },
    "antiDetection": {
        "randomizeTimings": true,
        "simulateHumanBehavior": true
    },
    "legal": {
        "respectTermsOfService": true,
        "checkRobotsTxt": true
    }
}
```

### للأداء العالي:
```json
{
    "rateLimiting": {
        "requestsPerSecond": 5,
        "maxConcurrent": 5
    },
    "performance": {
        "multiThreading": true,
        "maxWorkers": 8,
        "cacheEnabled": true
    }
}
```

### للسرية القصوى:
```json
{
    "userAgentRotation": {
        "enabled": true,
        "rotationInterval": 5
    },
    "antiDetection": {
        "randomizeTimings": true,
        "simulateHumanBehavior": true,
        "avoidCaptcha": true
    }
}
```

---

## 📊 مراقبة الأداء

```javascript
// الحصول على إحصائيات الأداء
const stats = await chrome.tabs.sendMessage(tabId, {
    action: 'getPerformanceStats'
});

console.log('إجمالي الطلبات:', stats.stats.totalRequests);
console.log('متوسط الوقت:', stats.stats.averageRequestTime);
console.log('الأخطاء:', stats.stats.totalErrors);
console.log('الذاكرة:', stats.stats.memory);
```

---

## 🔧 استكشاف الأخطاء

### المشكلة: لا يستجيب Extension
**الحل**: تأكد من تحميل المحتوى كاملاً قبل إرسال الأوامر

### المشكلة: استخراج البيانات بطيء
**الحل**: 
- قلل `delayBetweenRequests`
- زد `maxConcurrent`
- فعّل `cacheEnabled`

### المشكلة: تم اكتشافي كـ Bot
**الحل**:
- فعّل `userAgentRotation`
- فعّل `simulateHumanBehavior`
- زد `delayBetweenRequests`

---

## 📝 ملاحظات مهمة

1. ⚠️ **احترم قوانين المواقع**: استخدم الأداة بطريقة أخلاقية وقانونية
2. 🔒 **الأمان**: بيانات تسجيل الدخول مشفرة بـ Base64 (للإنتاج، استخدم تشفير أقوى)
3. ⚡ **الأداء**: Rate Limiting مهم لتجنب الحظر
4. 📊 **الإحصائيات**: راقب الأداء بانتظام

---

## 🎉 الخلاصة

Extension الآن يدعم:
- ✅ 6+ أنواع من البيانات
- ✅ محتوى ديناميكي وInfinite Scroll
- ✅ Rate Limiting متقدم
- ✅ إدارة جلسات كاملة
- ✅ مكافحة كشف متطورة
- ✅ معالجة متوازية
- ✅ تصدير بصيغ متعددة
- ✅ واجهة إعدادات شاملة

**جاهز للاستخدام الاحترافي! 🚀**
