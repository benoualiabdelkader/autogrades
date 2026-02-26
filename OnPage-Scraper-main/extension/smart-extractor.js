/**
 * Smart DOM-Based Data Extractor
 * محرك استخراج ذكي للبيانات من DOM
 */

class SmartExtractor {
    constructor() {
        this.extractedData = [];
        this.cleaningRules = {
            removeWhitespace: true,
            removeDuplicates: true,
            validateData: true,
            normalizeText: true
        };

        // دمج المحلل الدلالي
        this.semanticAnalyzer = new window.SemanticAnalyzer();

        // دمج محرك المرونة
        this.resilienceEngine = new window.ResilienceEngine();

        // دمج نظام Telemetry
        this.telemetry = new window.TelemetryProfiler();

        console.log('🚀 Smart Extractor initialized with:');
        console.log('  ✅ Semantic Analysis');
        console.log('  ✅ Resilience Engine');
        console.log('  ✅ Telemetry & Profiling');
    }

    /**
     * استخراج ذكي من العناصر المحددة مع مرونة
     */
    async extractFromElements(elements) {
        const extractionId = `extraction_${Date.now()}`;
        const extraction = this.telemetry.startExtraction(extractionId, {
            elementsCount: elements.length
        });

        const results = [];

        // Group elements by selector to detect "Magic Grouped" lists
        const groupedElements = {};
        elements.forEach(el => {
            if (!groupedElements[el.selector]) {
                groupedElements[el.selector] = [];
            }
            groupedElements[el.selector].push(el);
        });

        for (const [selector, group] of Object.entries(groupedElements)) {
            try {
                if (group.length > 1) {
                    // Structure is a list - Smart Multiple Extraction (Sitemap style iteration)
                    const resilientResult = await this.resilienceEngine.resilientExtractAll(
                        selector,
                        { maxRetries: 3, fallbackStrategies: true }
                    );

                    if (resilientResult.success && resilientResult.elements) {
                        resilientResult.elements.forEach((el, idx) => {
                            const cleanName = group[0].name.replace(/_\d+$/, ''); // clean up trailing counts
                            const extractedItem = this.extractElementData(el, cleanName, `grp_${idx}`);
                            if (extractedItem && this.validateExtractedData(extractedItem)) {
                                extractedItem.isList = true;
                                extractedItem.listName = cleanName;
                                extractedItem.resilience = { confidence: resilientResult.confidence, listIndex: idx };
                                results.push(extractedItem);
                            }
                        });
                    }
                } else {
                    // Normal single element execution
                    const elementData = group[0];
                    const resilientResult = await this.resilienceEngine.resilientExtract(
                        selector,
                        { maxRetries: 3, fallbackStrategies: true, learnFromFailure: true }
                    );

                    if (resilientResult.success) {
                        const extractedItem = this.extractElementData(
                            resilientResult.element,
                            elementData.name,
                            `${elements.indexOf(elementData)}`
                        );

                        if (extractedItem && this.validateExtractedData(extractedItem)) {
                            extractedItem.resilience = {
                                confidence: resilientResult.confidence,
                                attempts: resilientResult.attempts,
                                strategy: resilientResult.strategy
                            };
                            results.push(extractedItem);
                        }
                    } else {
                        console.warn(`Failed to extract: ${selector}`, resilientResult.error);
                    }
                }
            } catch (error) {
                console.error(`Error extracting group ${group[0]?.name || 'unknown'}:`, error);
            }
        }

        const organized = this.cleanAndOrganizeData(results);

        this.telemetry.endExtraction(extractionId, {
            success: results.length > 0,
            itemsExtracted: results.length
        });

        return organized;
    }

    /**
     * استخراج البيانات من عنصر واحد
     */
    extractElementData(element, fieldName, id) {
        const data = {
            id: id,
            fieldName: fieldName,
            type: this.detectElementType(element),
            value: null,
            metadata: {}
        };

        // استخراج القيمة حسب نوع العنصر
        switch (data.type) {
            case 'input':
                data.value = element.value || element.placeholder || '';
                data.metadata.inputType = element.type;
                break;

            case 'textarea':
                data.value = element.value || '';
                break;

            case 'select':
                data.value = element.value || '';
                data.metadata.selectedText = element.options[element.selectedIndex]?.text || '';
                break;

            case 'image':
                data.value = element.src || element.dataset.src || '';
                data.metadata.alt = element.alt || '';
                break;

            case 'link':
                data.value = element.href || '';
                data.metadata.text = this.cleanText(element.textContent);
                break;

            case 'text':
            default:
                data.value = this.extractTextContent(element);
                break;
        }

        // استخراج البيانات الإضافية
        data.metadata.className = element.className;
        data.metadata.id = element.id;
        data.metadata.dataAttributes = this.extractDataAttributes(element);

        return data;
    }

    /**
     * كشف نوع العنصر
     */
    detectElementType(element) {
        const tagName = element.tagName.toLowerCase();

        if (tagName === 'input') return 'input';
        if (tagName === 'textarea') return 'textarea';
        if (tagName === 'select') return 'select';
        if (tagName === 'img') return 'image';
        if (tagName === 'a') return 'link';
        if (tagName === 'button') return 'button';

        return 'text';
    }

    /**
     * استخراج محتوى نصي نظيف
     */
    extractTextContent(element) {
        // إزالة العناصر المخفية والسكريبتات
        const clone = element.cloneNode(true);

        // إزالة العناصر غير المرغوبة
        const unwanted = clone.querySelectorAll('script, style, noscript');
        unwanted.forEach(el => el.remove());

        let text = clone.textContent || clone.innerText || '';

        return this.cleanText(text);
    }

    /**
     * تنظيف النص
     */
    cleanText(text) {
        if (!text) return '';

        return text
            .replace(/\s+/g, ' ')  // إزالة المسافات الزائدة
            .replace(/\n+/g, ' ')  // إزالة الأسطر الجديدة
            .trim();  // إزالة المسافات من البداية والنهاية
    }

    /**
     * استخراج data attributes
     * Guards against elements that have no attributes NamedNodeMap.
     */
    extractDataAttributes(element) {
        const dataAttrs = {};
        if (!element || !element.attributes) return dataAttrs;

        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
                const key = attr.name.replace('data-', '');
                dataAttrs[key] = attr.value;
            }
        });

        return dataAttrs;
    }

    /**
     * التحقق من صحة البيانات المستخرجة
     */
    validateExtractedData(data) {
        // تحقق من وجود قيمة
        if (!data.value || data.value.trim() === '') {
            return false;
        }

        // تحقق من طول القيمة
        if (data.value.length > 10000) {
            data.value = data.value.substring(0, 10000) + '...';
        }

        return true;
    }

    /**
     * تنظيف وتنظيم البيانات
     */
    cleanAndOrganizeData(rawData) {
        let cleanedData = [...rawData];

        // إزالة التكرارات
        if (this.cleaningRules.removeDuplicates) {
            cleanedData = this.removeDuplicates(cleanedData);
        }

        // تنظيم البيانات في JSON منظم
        return this.organizeAsJSON(cleanedData);
    }

    /**
     * إزالة التكرارات
     */
    removeDuplicates(data) {
        const seen = new Set();

        return data.filter(item => {
            const key = `${item.fieldName}_${item.value}`;

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });
    }

    /**
     * تنظيم البيانات كـ JSON منظم
     */
    organizeAsJSON(data) {
        // تجميع البيانات للحقول والقوائم (Lists processing similar to web scraper lists)
        const fields = {};
        const lists = {};

        data.forEach(item => {
            if (item.isList) {
                if (!lists[item.listName]) {
                    lists[item.listName] = [];
                }
                lists[item.listName].push({
                    value: item.value,
                    type: item.type,
                    metadata: item.metadata,
                    resilience: item.resilience
                });
            } else {
                if (!fields[item.fieldName]) {
                    fields[item.fieldName] = [];
                }
                fields[item.fieldName].push({
                    value: item.value,
                    type: item.type,
                    metadata: item.metadata
                });
            }
        });

        // إنشاء JSON منظم يطابق شكل Web Scraper Exports
        const organized = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            title: document.title,
            totalItems: data.length,
            dataStructure: {
                flatFields: fields,
                smartLists: lists
            },
            summary: this.generateSummary(fields, lists)
        };

        return organized;
    }

    /**
     * إنشاء ملخص للبيانات
     */
    generateSummary(fields, lists) {
        const summary = {
            totalSingleFields: Object.keys(fields).length,
            totalLists: Object.keys(lists).length,
            fieldCounts: {},
            listCounts: {}
        };

        Object.keys(fields).forEach(fieldName => {
            summary.fieldCounts[fieldName] = fields[fieldName].length;
        });
        Object.keys(lists).forEach(listName => {
            summary.listCounts[listName] = lists[listName].length;
        });

        return summary;
    }

    /**
     * استخراج تلقائي ذكي مع تحليل دلالي
     */
    autoExtract(options = {}) {
        const {
            includeInputs = true,
            includeText = true,
            includeLinks = false,
            includeImages = false,
            containerSelector = 'body',
            useSemanticAnalysis = true
        } = options;

        // إذا كان التحليل الدلالي مفعّل
        if (useSemanticAnalysis && this.semanticAnalyzer) {
            return this.semanticSmartExtract(options);
        }

        // الاستخراج التقليدي
        const container = document.querySelector(containerSelector);
        if (!container) return null;

        const autoElements = [];

        // استخراج الحقول (inputs, textareas, selects)
        if (includeInputs) {
            const inputs = container.querySelectorAll('input, textarea, select');
            inputs.forEach((input, index) => {
                const name = input.name || input.id || `field_${index}`;
                autoElements.push({
                    name: name,
                    selector: this.generateUniqueSelector(input)
                });
            });
        }

        // استخراج النصوص المهمة
        if (includeText) {
            const textElements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span[class*="text"], div[class*="content"]');
            textElements.forEach((element, index) => {
                if (element.textContent.trim().length > 10) {
                    autoElements.push({
                        name: `text_${index}`,
                        selector: this.generateUniqueSelector(element)
                    });
                }
            });
        }

        // استخراج الروابط
        if (includeLinks) {
            const links = container.querySelectorAll('a[href]');
            links.forEach((link, index) => {
                autoElements.push({
                    name: `link_${index}`,
                    selector: this.generateUniqueSelector(link)
                });
            });
        }

        // استخراج الصور
        if (includeImages) {
            const images = container.querySelectorAll('img[src]');
            images.forEach((img, index) => {
                autoElements.push({
                    name: `image_${index}`,
                    selector: this.generateUniqueSelector(img)
                });
            });
        }

        return this.extractFromElements(autoElements);
    }

    /**
     * استخراج ذكي مع تحليل دلالي وهيكلي
     */
    semanticSmartExtract(options = {}) {
        console.log('🧠 Starting Semantic & Structure-Based Extraction...');

        // تحليل الصفحة بالكامل
        const analysis = this.semanticAnalyzer.analyzePage();

        console.log('📊 Page Analysis Complete:', {
            forms: analysis.forms.length,
            tables: analysis.tables.length,
            entities: analysis.patterns.entities.length,
            semanticTags: Object.keys(analysis.semanticStructure.semanticTags).length
        });

        // استخراج ذكي بناءً على التحليل
        const smartData = this.semanticAnalyzer.smartExtract();

        // تحويل إلى تنسيق منظم
        const organized = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            title: document.title,

            // التحليل الدلالي
            semanticAnalysis: {
                structure: analysis.semanticStructure,
                patterns: analysis.patterns,
                mainContent: analysis.mainContent
            },

            // البيانات المستخرجة
            extractedData: smartData.data,

            // الكيانات المكتشفة
            entities: smartData.entities,

            // البنية الهيكلية
            structure: {
                forms: analysis.forms,
                tables: analysis.tables,
                lists: analysis.lists,
                hierarchy: analysis.structuralAnalysis.hierarchy
            },

            // Schema.org Data
            schemaData: smartData.schema,

            // الإحصائيات
            statistics: analysis.statistics,

            // الملخص
            summary: {
                // Guard: data values are always arrays from smartExtract, but be safe
                totalFields: Object.values(smartData.data).reduce(
                    (acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0
                ),
                totalEntities: Array.isArray(smartData.entities)
                    ? smartData.entities.reduce((acc, entity) => acc + (entity.count || 0), 0)
                    : 0,
                totalForms: analysis.forms.length,
                totalTables: analysis.tables.length,
                domDepth: analysis.structuralAnalysis.depth
            }
        };

        console.log('✅ Semantic Extraction Complete!', organized.summary);

        return organized;
    }

    /**
     * إنشاء selector فريد للعنصر
     */
    generateUniqueSelector(element) {
        if (element.id) {
            return `#${element.id}`;
        }

        let selector = element.tagName.toLowerCase();

        if (element.className) {
            const classes = element.className.toString().trim().split(/\s+/);
            if (classes.length > 0 && classes[0]) {
                selector += `.${classes[0]}`;
            }
        }

        // إضافة nth-child للتفرد
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children).filter(
                child => child.tagName === element.tagName
            );

            if (siblings.length > 1) {
                const index = siblings.indexOf(element) + 1;
                selector += `:nth-child(${index})`;
            }
        }

        return selector;
    }
}

// تصدير للاستخدام العام
window.SmartExtractor = SmartExtractor;
