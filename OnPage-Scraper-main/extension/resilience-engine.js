/**
 * Resilience Engine - محرك المرونة والإصلاح الذاتي
 * يتعامل مع تغييرات المواقع ويصلح Selectors تلقائياً
 */

class ResilienceEngine {
    constructor() {
        // تاريخ الـ Selectors
        this.selectorHistory = new Map();

        // استراتيجيات الإصلاح
        this.healingStrategies = [
            'byId',
            'byClass',
            'byAttribute',
            'byText',
            'byPosition',
            'byStructure',
            'bySimilarity'
        ];

        // درجات الثقة
        this.confidenceThresholds = {
            high: 0.9,
            medium: 0.7,
            low: 0.5
        };

        // ذاكرة التعلم
        this.learningMemory = this.loadLearningMemory();
    }

    /**
     * محاولة استخراج مع إصلاح تلقائي
     */
    async resilientExtract(selector, options = {}) {
        const {
            maxRetries = 3,
            fallbackStrategies = true,
            learnFromFailure = true
        } = options;

        let attempt = 0;
        let lastError = null;

        while (attempt < maxRetries) {
            try {
                // محاولة الاستخراج
                const element = document.querySelector(selector);

                if (element) {
                    // نجح! حفظ في التاريخ
                    this.recordSuccess(selector, element);
                    return {
                        success: true,
                        element: element,
                        selector: selector,
                        confidence: 1.0,
                        attempts: attempt + 1
                    };
                }

                // فشل - محاولة الإصلاح
                if (fallbackStrategies) {
                    const healed = await this.healSelector(selector);

                    if (healed.success) {
                        console.log(`🔧 Self-healed selector: ${selector} → ${healed.selector}`);

                        // تعلم من الإصلاح
                        if (learnFromFailure) {
                            this.learnFromHealing(selector, healed.selector);
                        }

                        return healed;
                    }
                }

                lastError = new Error(`Selector not found: ${selector}`);
                attempt++;

            } catch (error) {
                lastError = error;
                attempt++;

                // انتظار قصير قبل المحاولة التالية
                await this.delay(100 * attempt);
            }
        }

        // فشلت جميع المحاولات
        return {
            success: false,
            error: lastError.message,
            selector: selector,
            attempts: attempt
        };
    }

    /**
     * محاولة استخراج كافة العناصر المطابقة (للقوائم السحرية)
     */
    async resilientExtractAll(selector, options = {}) {
        const {
            maxRetries = 3,
            fallbackStrategies = true
        } = options;

        let attempt = 0;
        let lastError = null;

        while (attempt < maxRetries) {
            try {
                const elements = document.querySelectorAll(selector);

                if (elements && elements.length > 0) {
                    // تسجيل نجاح لأول عنصر كممثل
                    this.recordSuccess(selector, elements[0]);
                    return {
                        success: true,
                        elements: Array.from(elements),
                        selector: selector,
                        confidence: 1.0,
                        attempts: attempt + 1
                    };
                }

                // فشل - محاولة الإصلاح باستخدام healSelector
                if (fallbackStrategies) {
                    const healed = await this.healSelector(selector);
                    if (healed.success) {
                        const healedElements = document.querySelectorAll(healed.selector);
                        if (healedElements && healedElements.length > 0) {
                            console.log(`🔧 Self-healed ALL selector: ${selector} → ${healed.selector}`);
                            return {
                                ...healed,
                                elements: Array.from(healedElements)
                            };
                        }
                    }
                }

                lastError = new Error(`Elements not found for selector: ${selector}`);
                attempt++;
                await this.delay(100 * attempt);

            } catch (error) {
                lastError = error;
                attempt++;
                await this.delay(100 * attempt);
            }
        }

        return {
            success: false,
            error: lastError ? lastError.message : 'Unknown error',
            selector: selector,
            attempts: attempt
        };
    }

    /**
     * إصلاح Selector تلقائياً
     */
    async healSelector(brokenSelector) {
        console.log(`🔍 Attempting to heal selector: ${brokenSelector}`);

        // البحث في التاريخ
        const historical = this.findHistoricalMatch(brokenSelector);
        if (historical) {
            const element = document.querySelector(historical.selector);
            if (element) {
                return {
                    success: true,
                    element: element,
                    selector: historical.selector,
                    confidence: historical.confidence,
                    strategy: 'historical'
                };
            }
        }

        // تجربة استراتيجيات الإصلاح
        for (const strategy of this.healingStrategies) {
            const result = await this.tryHealingStrategy(brokenSelector, strategy);

            if (result.success && result.confidence >= this.confidenceThresholds.low) {
                return result;
            }
        }

        return { success: false, error: 'All healing strategies failed' };
    }

    /**
     * تجربة استراتيجية إصلاح محددة
     */
    async tryHealingStrategy(selector, strategy) {
        try {
            switch (strategy) {
                case 'byId':
                    return this.healById(selector);

                case 'byClass':
                    return this.healByClass(selector);

                case 'byAttribute':
                    return this.healByAttribute(selector);

                case 'byText':
                    return this.healByText(selector);

                case 'byPosition':
                    return this.healByPosition(selector);

                case 'byStructure':
                    return this.healByStructure(selector);

                case 'bySimilarity':
                    return this.healBySimilarity(selector);

                default:
                    return { success: false };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * الإصلاح بواسطة ID
     */
    healById(selector) {
        // استخراج ID من الـ selector
        const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
        if (!idMatch) return { success: false };

        const id = idMatch[1];

        // البحث عن IDs مشابهة
        const similarIds = this.findSimilarIds(id);

        for (const similarId of similarIds) {
            const element = document.getElementById(similarId);
            if (element) {
                const confidence = this.calculateSimilarity(id, similarId);
                return {
                    success: true,
                    element: element,
                    selector: `#${similarId}`,
                    confidence: confidence,
                    strategy: 'byId'
                };
            }
        }

        return { success: false };
    }

    /**
     * الإصلاح بواسطة Class
     */
    healByClass(selector) {
        // استخراج Classes من الـ selector
        const classMatches = selector.match(/\.([a-zA-Z0-9_-]+)/g);
        if (!classMatches) return { success: false };

        const classes = classMatches.map(c => c.substring(1));

        // البحث عن عناصر بـ classes مشابهة
        for (const className of classes) {
            const similarClasses = this.findSimilarClasses(className);

            for (const similarClass of similarClasses) {
                const elements = document.getElementsByClassName(similarClass);
                if (elements.length > 0) {
                    const confidence = this.calculateSimilarity(className, similarClass);
                    return {
                        success: true,
                        element: elements[0],
                        selector: `.${similarClass}`,
                        confidence: confidence,
                        strategy: 'byClass'
                    };
                }
            }
        }

        return { success: false };
    }

    /**
     * الإصلاح بواسطة Attributes
     */
    healByAttribute(selector) {
        // استخراج attributes من الـ selector
        const attrMatch = selector.match(/\[([a-zA-Z-]+)(?:=["']([^"']+)["'])?\]/);
        if (!attrMatch) return { success: false };

        const [, attrName, attrValue] = attrMatch;

        // البحث عن عناصر بنفس الـ attribute
        const elements = document.querySelectorAll(`[${attrName}]`);

        for (const element of elements) {
            const elementValue = element.getAttribute(attrName);

            if (attrValue) {
                const similarity = this.calculateSimilarity(attrValue, elementValue);
                if (similarity >= this.confidenceThresholds.medium) {
                    return {
                        success: true,
                        element: element,
                        selector: `[${attrName}="${elementValue}"]`,
                        confidence: similarity,
                        strategy: 'byAttribute'
                    };
                }
            } else {
                return {
                    success: true,
                    element: element,
                    selector: `[${attrName}]`,
                    confidence: 0.8,
                    strategy: 'byAttribute'
                };
            }
        }

        return { success: false };
    }

    /**
     * الإصلاح بواسطة النص
     * Queries only elements that are likely to carry visible text,
     * instead of the expensive document.querySelectorAll('*').
     */
    healByText(selector) {
        // محاولة استخراج نص متوقع من التاريخ
        const historical = this.selectorHistory.get(selector);
        if (!historical || !historical.text) return { success: false };

        const expectedText = historical.text;

        // Query only meaningful text-bearing elements — much faster than querySelectorAll('*')
        const candidates = document.querySelectorAll(
            'p, h1, h2, h3, h4, h5, h6, li, td, th, span, div, a, label, button'
        );

        for (const element of candidates) {
            const elementText = element.textContent?.trim();
            if (!elementText || elementText.length > 500) continue; // skip huge nodes

            const similarity = this.calculateTextSimilarity(expectedText, elementText);

            if (similarity >= this.confidenceThresholds.medium) {
                return {
                    success: true,
                    element: element,
                    selector: this.generateSelector(element),
                    confidence: similarity,
                    strategy: 'byText'
                };
            }
        }

        return { success: false };
    }

    /**
     * الإصلاح بواسطة الموقع
     */
    healByPosition(selector) {
        const historical = this.selectorHistory.get(selector);
        if (!historical || !historical.position) return { success: false };

        const { parent, index } = historical.position;

        // محاولة إيجاد الأب
        const parentElement = document.querySelector(parent);
        if (!parentElement) return { success: false };

        // محاولة إيجاد العنصر بنفس الموقع
        const children = Array.from(parentElement.children);
        if (children[index]) {
            return {
                success: true,
                element: children[index],
                selector: this.generateSelector(children[index]),
                confidence: 0.7,
                strategy: 'byPosition'
            };
        }

        return { success: false };
    }

    /**
     * الإصلاح بواسطة البنية
     */
    healByStructure(selector) {
        const historical = this.selectorHistory.get(selector);
        if (!historical || !historical.structure) return { success: false };

        const { tag, attributes, children } = historical.structure;

        // البحث عن عناصر بنفس البنية
        const candidates = document.querySelectorAll(tag);

        for (const candidate of candidates) {
            let score = 0;
            let total = 0;

            // مقارنة الـ attributes
            if (attributes) {
                for (const [key, value] of Object.entries(attributes)) {
                    total++;
                    if (candidate.getAttribute(key) === value) {
                        score++;
                    }
                }
            }

            // مقارنة عدد الأطفال
            if (children !== undefined) {
                total++;
                if (candidate.children.length === children) {
                    score++;
                }
            }

            const confidence = total > 0 ? score / total : 0;

            if (confidence >= this.confidenceThresholds.medium) {
                return {
                    success: true,
                    element: candidate,
                    selector: this.generateSelector(candidate),
                    confidence: confidence,
                    strategy: 'byStructure'
                };
            }
        }

        return { success: false };
    }

    /**
     * الإصلاح بواسطة التشابه
     */
    healBySimilarity(selector) {
        // استخراج جميع الـ selectors المحفوظة
        const allSelectors = Array.from(this.selectorHistory.keys());

        // إيجاد أكثر selector مشابه
        let bestMatch = null;
        let bestSimilarity = 0;

        for (const historicalSelector of allSelectors) {
            const similarity = this.calculateSimilarity(selector, historicalSelector);

            if (similarity > bestSimilarity) {
                const element = document.querySelector(historicalSelector);
                if (element) {
                    bestMatch = {
                        element: element,
                        selector: historicalSelector,
                        similarity: similarity
                    };
                    bestSimilarity = similarity;
                }
            }
        }

        if (bestMatch && bestSimilarity >= this.confidenceThresholds.low) {
            return {
                success: true,
                element: bestMatch.element,
                selector: bestMatch.selector,
                confidence: bestSimilarity,
                strategy: 'bySimilarity'
            };
        }

        return { success: false };
    }

    /**
     * حساب التشابه بين نصين
     */
    calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        if (str1 === str2) return 1;

        // Levenshtein distance
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = [];

        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        const distance = matrix[len1][len2];
        const maxLen = Math.max(len1, len2);

        return 1 - (distance / maxLen);
    }

    /**
     * حساب التشابه بين نصوص طويلة
     */
    calculateTextSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;

        // تنظيف النصوص
        const clean1 = text1.toLowerCase().trim();
        const clean2 = text2.toLowerCase().trim();

        if (clean1 === clean2) return 1;

        // حساب التشابه بناءً على الكلمات المشتركة
        const words1 = new Set(clean1.split(/\s+/));
        const words2 = new Set(clean2.split(/\s+/));

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    /**
     * إيجاد IDs مشابهة
     */
    findSimilarIds(targetId) {
        const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);

        return allIds
            .map(id => ({
                id: id,
                similarity: this.calculateSimilarity(targetId, id)
            }))
            .filter(item => item.similarity >= this.confidenceThresholds.low)
            .sort((a, b) => b.similarity - a.similarity)
            .map(item => item.id)
            .slice(0, 5);
    }

    /**
     * إيجاد Classes مشابهة
     */
    findSimilarClasses(targetClass) {
        const allClasses = new Set();

        document.querySelectorAll('[class]').forEach(el => {
            el.className.split(/\s+/).forEach(cls => {
                if (cls) allClasses.add(cls);
            });
        });

        return Array.from(allClasses)
            .map(cls => ({
                class: cls,
                similarity: this.calculateSimilarity(targetClass, cls)
            }))
            .filter(item => item.similarity >= this.confidenceThresholds.low)
            .sort((a, b) => b.similarity - a.similarity)
            .map(item => item.class)
            .slice(0, 5);
    }

    /**
     * توليد selector للعنصر
     */
    generateSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }

        if (element.className) {
            const classes = element.className.toString().trim().split(/\s+/);
            if (classes.length > 0 && classes[0]) {
                return `.${classes[0]}`;
            }
        }

        // استخدام tag + nth-child
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children);
            const index = siblings.indexOf(element) + 1;
            return `${element.tagName.toLowerCase()}:nth-child(${index})`;
        }

        return element.tagName.toLowerCase();
    }

    /**
     * تسجيل نجاح
     * Caps history at 500 entries to prevent unbounded memory growth.
     */
    recordSuccess(selector, element) {
        const record = {
            selector: selector,
            timestamp: Date.now(),
            text: element.textContent?.trim().substring(0, 100),
            position: {
                parent: this.generateSelector(element.parentElement),
                index: Array.from(element.parentElement?.children || []).indexOf(element)
            },
            structure: {
                tag: element.tagName.toLowerCase(),
                attributes: this.extractAttributes(element),
                children: element.children.length
            },
            confidence: 1.0
        };

        this.selectorHistory.set(selector, record);

        // Prevent unbounded growth — keep the most recent 500 entries
        if (this.selectorHistory.size > 500) {
            const oldestKey = this.selectorHistory.keys().next().value;
            this.selectorHistory.delete(oldestKey);
        }

        this.saveLearningMemory();
    }

    /**
     * استخراج attributes
     */
    extractAttributes(element) {
        const attrs = {};
        Array.from(element.attributes).forEach(attr => {
            attrs[attr.name] = attr.value;
        });
        return attrs;
    }

    /**
     * البحث في التاريخ
     */
    findHistoricalMatch(selector) {
        return this.selectorHistory.get(selector);
    }

    /**
     * التعلم من الإصلاح
     */
    learnFromHealing(oldSelector, newSelector) {
        // حفظ العلاقة بين الـ selectors
        if (!this.learningMemory.mappings) {
            this.learningMemory.mappings = {};
        }

        this.learningMemory.mappings[oldSelector] = {
            newSelector: newSelector,
            timestamp: Date.now(),
            confidence: 0.9
        };

        this.saveLearningMemory();
    }

    /**
     * حفظ ذاكرة التعلم
     * Guards against localStorage quota errors with a size check.
     */
    saveLearningMemory() {
        try {
            const data = {
                history: Array.from(this.selectorHistory.entries()),
                mappings: this.learningMemory.mappings || {}
            };

            const serialized = JSON.stringify(data);
            // Skip write if payload exceeds 2 MB to avoid localStorage quota errors
            if (serialized.length > 2 * 1024 * 1024) {
                console.warn('[ResilienceEngine] Learning memory too large, skipping save.');
                return;
            }

            localStorage.setItem('resilience_learning_memory', serialized);
        } catch (error) {
            console.warn('Failed to save learning memory:', error);
        }
    }

    /**
     * تحميل ذاكرة التعلم
     */
    loadLearningMemory() {
        try {
            const stored = localStorage.getItem('resilience_learning_memory');
            if (stored) {
                const data = JSON.parse(stored);

                // استعادة التاريخ
                if (data.history) {
                    this.selectorHistory = new Map(data.history);
                }

                return data.mappings || {};
            }
        } catch (error) {
            console.warn('Failed to load learning memory:', error);
        }

        return {};
    }

    /**
     * تأخير
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * مسح الذاكرة
     */
    clearMemory() {
        this.selectorHistory.clear();
        this.learningMemory = {};
        localStorage.removeItem('resilience_learning_memory');
    }

    /**
     * إحصائيات المرونة
     */
    getStatistics() {
        return {
            totalSelectors: this.selectorHistory.size,
            totalMappings: Object.keys(this.learningMemory.mappings || {}).length,
            memorySize: JSON.stringify({
                history: Array.from(this.selectorHistory.entries()),
                mappings: this.learningMemory.mappings
            }).length
        };
    }
}

// تصدير للاستخدام العام
window.ResilienceEngine = ResilienceEngine;
