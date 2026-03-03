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
     * استخراج البيانات من عنصر واحد - محسّن للصفحات المعقدة
     */
    extractElementData(element, fieldName, id) {
        const data = {
            id: id,
            fieldName: fieldName,
            type: this.detectElementType(element),
            value: null,
            metadata: {},
            children: []
        };

        // استخراج القيمة حسب نوع العنصر
        switch (data.type) {
            case 'input':
                data.value = element.value || element.placeholder || '';
                data.metadata.inputType = element.type;
                data.metadata.name = element.name || '';
                data.metadata.required = element.required;
                break;

            case 'textarea':
                data.value = element.value || '';
                data.metadata.name = element.name || '';
                break;

            case 'select':
                data.value = element.value || '';
                data.metadata.selectedText = element.options?.[element.selectedIndex]?.text || '';
                data.metadata.allOptions = Array.from(element.options || []).map(o => ({ value: o.value, text: o.text }));
                break;

            case 'image':
                data.value = element.src || element.dataset.src || element.getAttribute('data-lazy-src') || '';
                data.metadata.alt = element.alt || '';
                data.metadata.srcset = element.srcset || '';
                data.metadata.naturalWidth = element.naturalWidth;
                data.metadata.naturalHeight = element.naturalHeight;
                break;

            case 'link':
                data.value = element.href || '';
                data.metadata.text = this.cleanText(element.textContent);
                data.metadata.target = element.target || '';
                data.metadata.rel = element.rel || '';
                break;

            case 'table':
                data.value = this.extractFullTableData(element);
                data.metadata.rows = element.rows?.length || 0;
                data.metadata.cols = element.rows?.[0]?.cells?.length || 0;
                break;

            case 'list':
                data.value = this.extractListData(element);
                data.metadata.itemCount = element.querySelectorAll(':scope > li, :scope > dt').length;
                break;

            case 'media':
                data.value = element.src || element.querySelector('source')?.src || '';
                data.metadata.duration = element.duration || null;
                data.metadata.poster = element.poster || '';
                break;

            case 'heading':
                data.value = this.cleanText(element.textContent);
                data.metadata.level = parseInt(element.tagName[1]);
                break;

            case 'iframe':
                data.value = element.src || '';
                data.metadata.title = element.title || '';
                // Try to extract iframe content if same-origin
                try {
                    const iframeDoc = element.contentDocument;
                    if (iframeDoc) {
                        data.metadata.iframeContent = iframeDoc.body?.textContent?.trim()?.substring(0, 5000) || '';
                    }
                } catch (_) {
                    data.metadata.iframeContent = '[cross-origin iframe]';
                }
                break;

            case 'code':
                data.value = element.textContent || '';
                data.metadata.language = element.className?.match(/language-(\w+)/)?.[1] || '';
                break;

            case 'form':
                data.value = this.extractFormData(element);
                data.metadata.action = element.action || '';
                data.metadata.method = element.method || 'get';
                break;

            case 'editable':
                data.value = element.innerHTML || element.textContent || '';
                break;

            case 'text':
            default:
                data.value = this.extractTextContent(element);
                break;
        }

        // استخراج البيانات الإضافية
        data.metadata.tagName = element.tagName?.toLowerCase();
        data.metadata.className = typeof element.className === 'string' ? element.className : '';
        data.metadata.id = element.id;
        data.metadata.dataAttributes = this.extractDataAttributes(element);
        data.metadata.ariaLabel = element.getAttribute('aria-label') || '';
        data.metadata.role = element.getAttribute('role') || '';

        // Extract children data for complex containers
        if (element.children.length > 0 && ['div', 'section', 'article', 'main'].includes(element.tagName?.toLowerCase())) {
            data.children = this.extractChildrenSummary(element);
        }

        return data;
    }

    /**
     * Extract full table data as structured object
     */
    extractFullTableData(table) {
        const result = { headers: [], rows: [] };

        // Extract headers
        const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
        if (headerRow) {
            result.headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell => {
                const text = cell.textContent?.trim() || '';
                const colspan = parseInt(cell.getAttribute('colspan') || '1');
                return { text, colspan };
            });
        }

        // Extract body rows
        const bodyRows = table.querySelectorAll('tbody tr');
        const rows = bodyRows.length > 0 ? bodyRows : table.querySelectorAll('tr');
        const MAX_ROWS = 1000;
        let count = 0;

        rows.forEach(row => {
            if (row === headerRow || count >= MAX_ROWS) return;
            count++;

            const cells = Array.from(row.querySelectorAll('td, th')).map(cell => {
                const text = cell.textContent?.trim() || '';
                const colspan = parseInt(cell.getAttribute('colspan') || '1');
                const rowspan = parseInt(cell.getAttribute('rowspan') || '1');
                return { text, colspan, rowspan };
            });

            // Include data-* attributes from the row
            const rowData = {};
            if (row.dataset) {
                Object.keys(row.dataset).forEach(k => rowData[k] = row.dataset[k]);
            }

            result.rows.push({ cells, data: rowData });
        });

        return result;
    }

    /**
     * Extract list data as structured array
     */
    extractListData(listEl) {
        const tag = listEl.tagName.toLowerCase();
        if (tag === 'dl') {
            const items = [];
            listEl.querySelectorAll('dt').forEach(dt => {
                const dd = dt.nextElementSibling;
                items.push({
                    term: dt.textContent?.trim() || '',
                    definition: dd?.tagName?.toLowerCase() === 'dd' ? dd.textContent?.trim() : ''
                });
            });
            return items;
        }

        return Array.from(listEl.querySelectorAll(':scope > li')).map((li, i) => {
            const nested = li.querySelector('ul, ol');
            return {
                index: i,
                text: nested ?
                    li.textContent?.trim().replace(nested.textContent?.trim(), '').trim() :
                    li.textContent?.trim() || '',
                nested: nested ? this.extractListData(nested) : null,
                links: Array.from(li.querySelectorAll('a')).map(a => ({ text: a.textContent?.trim(), href: a.href }))
            };
        });
    }

    /**
     * Extract form data with all field values
     */
    extractFormData(form) {
        const fields = [];
        form.querySelectorAll('input, textarea, select').forEach(field => {
            fields.push({
                name: field.name || field.id || '',
                type: field.type || 'text',
                value: field.value || '',
                label: this.findFieldLabel(field),
                required: field.required,
                placeholder: field.placeholder || ''
            });
        });
        return fields;
    }

    /**
     * Find label text for a form field
     */
    findFieldLabel(field) {
        if (field.id) {
            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label) return label.textContent?.trim();
        }
        const parentLabel = field.closest('label');
        if (parentLabel) return parentLabel.textContent?.trim();
        return field.getAttribute('aria-label') || field.placeholder || '';
    }

    /**
     * Extract summary of children for complex containers
     */
    extractChildrenSummary(element) {
        const MAX_CHILDREN = 50;
        const children = [];
        const directChildren = Array.from(element.children).slice(0, MAX_CHILDREN);

        directChildren.forEach(child => {
            const tag = child.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'svg'].includes(tag)) return;

            children.push({
                tag,
                id: child.id || '',
                class: typeof child.className === 'string' ? child.className : '',
                text: (child.textContent?.trim() || '').substring(0, 200)
            });
        });

        return children;
    }

    /**
     * كشف نوع العنصر بشكل أكثر دقة
     */
    detectElementType(element) {
        const tagName = element.tagName.toLowerCase();

        if (tagName === 'input') return 'input';
        if (tagName === 'textarea') return 'textarea';
        if (tagName === 'select') return 'select';
        if (tagName === 'img' || tagName === 'picture' || tagName === 'svg') return 'image';
        if (tagName === 'a') return 'link';
        if (tagName === 'button' || (element.getAttribute('role') === 'button')) return 'button';
        if (tagName === 'video' || tagName === 'audio') return 'media';
        if (tagName === 'table') return 'table';
        if (tagName === 'ul' || tagName === 'ol' || tagName === 'dl') return 'list';
        if (tagName === 'form') return 'form';
        if (tagName === 'iframe') return 'iframe';
        if (/^h[1-6]$/.test(tagName)) return 'heading';
        if (tagName === 'nav' || element.getAttribute('role') === 'navigation') return 'navigation';
        if (tagName === 'time') return 'datetime';
        if (tagName === 'code' || tagName === 'pre') return 'code';
        if (element.getAttribute('contenteditable') === 'true') return 'editable';

        // Detect by content pattern
        const text = element.textContent?.trim() || '';
        if (text.match(/^\$?\d+[.,]\d{2}$/)) return 'price';
        if (text.match(/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/)) return 'date';
        if (text.match(/^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/)) return 'email';
        if (text.match(/^(https?:\/\/|www\.)/)) return 'url';

        return 'text';
    }

    /**
     * استخراج محتوى نصي نظيف مع الحفاظ على البنية
     */
    extractTextContent(element) {
        // Check visibility: skip hidden elements
        if (!this.isElementVisible(element)) return '';

        const clone = element.cloneNode(true);

        // Remove unwanted elements
        const unwanted = clone.querySelectorAll('script, style, noscript, svg, iframe, [hidden], [aria-hidden="true"]');
        unwanted.forEach(el => el.remove());

        // Remove elements hidden via inline style
        clone.querySelectorAll('*').forEach(el => {
            const style = el.getAttribute('style') || '';
            if (style.includes('display: none') || style.includes('display:none') ||
                style.includes('visibility: hidden') || style.includes('visibility:hidden')) {
                el.remove();
            }
        });

        // For structured elements, preserve structure
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'table') return this.extractTableText(element);
        if (tagName === 'ul' || tagName === 'ol') return this.extractListText(element);
        if (tagName === 'dl') return this.extractDefinitionListText(element);

        // For elements with children, try structured extraction
        if (element.children.length > 3) {
            return this.extractStructuredText(clone);
        }

        let text = clone.textContent || clone.innerText || '';
        return this.cleanText(text);
    }

    /**
     * Extract text from table preserving row/column structure
     */
    extractTableText(tableEl) {
        const rows = [];
        const allRows = tableEl.querySelectorAll('tr');
        allRows.forEach(row => {
            const cells = [];
            row.querySelectorAll('th, td').forEach(cell => {
                let text = cell.textContent?.trim() || '';
                // Handle colspan
                const colspan = parseInt(cell.getAttribute('colspan') || '1');
                cells.push(text);
                for (let i = 1; i < colspan; i++) cells.push('');
            });
            if (cells.some(c => c)) rows.push(cells.join(' | '));
        });
        return rows.join('\n');
    }

    /**
     * Extract text from lists preserving structure
     */
    extractListText(listEl) {
        const items = [];
        listEl.querySelectorAll(':scope > li').forEach((li, i) => {
            const text = li.textContent?.trim();
            if (text) items.push(`${i + 1}. ${text}`);
        });
        return items.join('\n');
    }

    /**
     * Extract definition list text
     */
    extractDefinitionListText(dlEl) {
        const pairs = [];
        const dts = dlEl.querySelectorAll('dt');
        dts.forEach(dt => {
            const term = dt.textContent?.trim();
            const dd = dt.nextElementSibling;
            const def = dd?.tagName?.toLowerCase() === 'dd' ? dd.textContent?.trim() : '';
            if (term) pairs.push(`${term}: ${def}`);
        });
        return pairs.join('\n');
    }

    /**
     * Extract structured text from complex containers
     */
    extractStructuredText(clone) {
        const parts = [];
        const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
            acceptNode(node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const tag = node.tagName.toLowerCase();
                    if (['br', 'hr', 'p', 'div', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
                return NodeFilter.FILTER_SKIP;
            }
        });

        let node;
        while (node = walker.nextNode()) {
            if (node.nodeType === Node.TEXT_NODE) {
                parts.push(node.textContent.trim());
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName.toLowerCase();
                if (['br', 'hr', 'p', 'div', 'li', 'tr'].includes(tag)) {
                    parts.push('\n');
                }
            }
        }

        return parts.join(' ').replace(/\s*\n\s*/g, '\n').replace(/[ \t]+/g, ' ').trim();
    }

    /**
     * Check if element is visible on page
     */
    isElementVisible(element) {
        if (!element || !element.getBoundingClientRect) return true;
        try {
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }
            const rect = element.getBoundingClientRect();
            return rect.width > 0 || rect.height > 0;
        } catch (_) {
            return true;
        }
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
     * التحقق من صحة البيانات المستخرجة - محسّن
     */
    validateExtractedData(data) {
        // For structured data types (table, list, form), check differently
        if (data.type === 'table' || data.type === 'list' || data.type === 'form') {
            return data.value !== null && data.value !== undefined;
        }

        // تحقق من وجود قيمة
        if (data.value === null || data.value === undefined) return false;

        // For string values
        if (typeof data.value === 'string') {
            if (data.value.trim() === '') return false;
            // Truncate excessively long text
            if (data.value.length > 50000) {
                data.value = data.value.substring(0, 50000) + '...[truncated]';
            }
        }

        // For object/array values (structured data)
        if (typeof data.value === 'object') {
            if (Array.isArray(data.value) && data.value.length === 0) return false;
            if (!Array.isArray(data.value) && Object.keys(data.value).length === 0) return false;
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
            useSemanticAnalysis = true,
            includeShadowDOM = true,
            includeTables = true,
            includeLists = true,
            maxDepth = 10
        } = options;

        // إذا كان التحليل الدلالي مفعّل
        if (useSemanticAnalysis && this.semanticAnalyzer) {
            return this.semanticSmartExtract(options);
        }

        // الاستخراج التقليدي المحسّن
        const container = document.querySelector(containerSelector);
        if (!container) return null;

        const autoElements = [];

        // استخراج الحقول (inputs, textareas, selects)
        if (includeInputs) {
            const inputs = container.querySelectorAll('input, textarea, select, [contenteditable="true"]');
            inputs.forEach((input, index) => {
                const name = input.name || input.id || input.getAttribute('aria-label') || `field_${index}`;
                autoElements.push({
                    name: name,
                    selector: this.generateUniqueSelector(input)
                });
            });
        }

        // استخراج النصوص المهمة - بشكل أوسع
        if (includeText) {
            const textSelectors = [
                'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'blockquote', 'figcaption', 'caption',
                'span[class*="text"]', 'span[class*="label"]', 'span[class*="value"]', 'span[class*="title"]',
                'div[class*="content"]', 'div[class*="description"]', 'div[class*="body"]',
                'div[class*="answer"]', 'div[class*="question"]', 'div[class*="stat"]',
                'article', 'section > p', 'main p',
                '[itemprop]', '[data-content]', 'time', 'address',
                'dd', 'dt',
                '.answer-block', '.question-meta'
            ];
            const textElements = container.querySelectorAll(textSelectors.join(', '));
            const seen = new Set();  // Avoid duplicates
            let textIdx = 0;

            textElements.forEach((element) => {
                if (seen.has(element)) return;
                // Skip hidden elements
                if (!this.isElementVisible(element)) return;
                // Skip if inside script/style
                if (element.closest('script, style, noscript')) return;

                const text = element.textContent?.trim();
                if (text && text.length > 5) {
                    // Don't add parent if child already added
                    let dominated = false;
                    seen.forEach(prev => {
                        if (element.contains(prev) || prev.contains(element)) dominated = true;
                    });
                    if (!dominated) {
                        autoElements.push({
                            name: element.id || element.getAttribute('itemprop') || `text_${textIdx}`,
                            selector: this.generateUniqueSelector(element)
                        });
                        seen.add(element);
                        textIdx++;
                    }
                }
            });
        }

        // استخراج الجداول كعناصر كاملة
        if (includeTables) {
            const tables = container.querySelectorAll('table');
            tables.forEach((table, index) => {
                if (table.rows.length >= 2) {
                    autoElements.push({
                        name: table.id || table.getAttribute('aria-label') || `table_${index}`,
                        selector: this.generateUniqueSelector(table)
                    });
                }
            });
        }

        // استخراج القوائم
        if (includeLists) {
            container.querySelectorAll('ul, ol, dl').forEach((list, index) => {
                const items = list.querySelectorAll(':scope > li, :scope > dt');
                if (items.length >= 2) {
                    autoElements.push({
                        name: list.id || `list_${index}`,
                        selector: this.generateUniqueSelector(list)
                    });
                }
            });
        }

        // استخراج الروابط
        if (includeLinks) {
            const links = container.querySelectorAll('a[href]');
            links.forEach((link, index) => {
                if (link.href && link.textContent?.trim()) {
                    autoElements.push({
                        name: `link_${index}`,
                        selector: this.generateUniqueSelector(link)
                    });
                }
            });
        }

        // استخراج الصور
        if (includeImages) {
            const images = container.querySelectorAll('img[src], picture, [style*=\"background-image\"]');
            images.forEach((img, index) => {
                autoElements.push({
                    name: img.alt || `image_${index}`,
                    selector: this.generateUniqueSelector(img)
                });
            });
        }

        // Shadow DOM extraction
        if (includeShadowDOM) {
            this.extractFromShadowRoots(container, autoElements, maxDepth);
        }

        return this.extractFromElements(autoElements);
    }

    /**
     * Extract elements from Shadow DOM roots recursively
     */
    extractFromShadowRoots(root, elements, maxDepth, depth = 0) {
        if (depth >= maxDepth) return;

        const allElements = root.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.shadowRoot) {
                const shadowElements = el.shadowRoot.querySelectorAll('input, textarea, select, p, h1, h2, h3, h4, h5, h6, table, ul, ol');
                shadowElements.forEach((shadowEl, idx) => {
                    const text = shadowEl.textContent?.trim();
                    if (text && text.length > 5) {
                        elements.push({
                            name: `shadow_${depth}_${idx}`,
                            selector: this.generateUniqueSelector(shadowEl),
                            shadowHost: this.generateUniqueSelector(el)
                        });
                    }
                });
                this.extractFromShadowRoots(el.shadowRoot, elements, maxDepth, depth + 1);
            }
        });
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
     * إنشاء selector فريد للعنصر - محسّن مع استراتيجيات متعددة
     */
    generateUniqueSelector(element) {
        if (!element) return '';

        // Strategy 1: ID (if unique)
        if (element.id) {
            try {
                const escaped = CSS.escape ? CSS.escape(element.id) : element.id;
                if (document.querySelectorAll(`#${escaped}`).length === 1) {
                    return `#${escaped}`;
                }
            } catch (_) {}
        }

        // Strategy 2: Unique stable data attributes
        const stableAttrs = ['data-testid', 'data-cy', 'data-id', 'data-key', 'data-student-row',
                              'data-score', 'name', 'aria-label', 'itemprop', 'itemtype'];
        for (const attr of stableAttrs) {
            const val = element.getAttribute(attr);
            if (val) {
                const sel = `${element.tagName.toLowerCase()}[${attr}="${val}"]`;
                try {
                    if (document.querySelectorAll(sel).length === 1) return sel;
                } catch (_) {}
            }
        }

        // Strategy 3: Tag + classes + position
        let selector = element.tagName.toLowerCase();
        if (element.className) {
            const classStr = typeof element.className === 'string' ? element.className : '';
            const classes = classStr.trim().split(/\s+/).filter(c =>
                c && !c.startsWith('onpage-') && !c.includes(':')
            );
            if (classes.length > 0) {
                selector += '.' + classes.slice(0, 2).join('.');
            }
        }

        // Add nth-of-type for uniqueness
        const parent = element.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children).filter(
                child => child.tagName === element.tagName
            );
            if (siblings.length > 1) {
                const index = siblings.indexOf(element) + 1;
                selector += `:nth-of-type(${index})`;
            }
        }

        // Validate
        try {
            const matches = document.querySelectorAll(selector);
            if (matches.length === 1) return selector;
        } catch (_) {}

        // Strategy 4: Build path from parent if not unique
        if (parent && parent !== document.body) {
            const parentSelector = this.generateUniqueSelector(parent);
            if (parentSelector) {
                const combined = `${parentSelector} > ${selector}`;
                try {
                    if (document.querySelectorAll(combined).length >= 1) return combined;
                } catch (_) {}
            }
        }

        return selector;
    }
}

// تصدير للاستخدام العام
window.SmartExtractor = SmartExtractor;
