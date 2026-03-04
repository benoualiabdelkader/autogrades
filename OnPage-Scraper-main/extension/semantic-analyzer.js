(function() {
if (window.__loaded_SemanticAnalyzer) return;
window.__loaded_SemanticAnalyzer = true;

/**
 * Semantic & Structure-Based Analyzer
 * محلل دلالي وهيكلي متقدم للصفحات
 */

class SemanticAnalyzer {
    constructor() {
        // قواعد التحليل الدلالي
        this.semanticRules = {
            // أنماط الأسماء
            name: ['name', 'fullname', 'username', 'user', 'nom', 'nombre', 'اسم', 'الاسم'],
            email: ['email', 'mail', 'e-mail', 'correo', 'بريد', 'ايميل'],
            phone: ['phone', 'tel', 'mobile', 'telephone', 'celular', 'هاتف', 'جوال', 'موبايل'],
            address: ['address', 'location', 'street', 'city', 'dirección', 'عنوان', 'موقع'],
            date: ['date', 'time', 'datetime', 'fecha', 'تاريخ', 'وقت'],
            price: ['price', 'cost', 'amount', 'precio', 'سعر', 'مبلغ', 'تكلفة'],
            description: ['description', 'desc', 'details', 'descripción', 'وصف', 'تفاصيل'],
            title: ['title', 'heading', 'header', 'título', 'عنوان', 'رأس'],
            content: ['content', 'text', 'body', 'contenido', 'محتوى', 'نص'],
            image: ['image', 'img', 'photo', 'picture', 'imagen', 'صورة'],
            link: ['link', 'url', 'href', 'enlace', 'رابط'],
            category: ['category', 'type', 'class', 'categoría', 'فئة', 'نوع', 'تصنيف'],
            status: ['status', 'state', 'condition', 'estado', 'حالة', 'وضع'],
            id: ['id', 'identifier', 'code', 'número', 'رقم', 'معرف'],
            quantity: ['quantity', 'qty', 'count', 'cantidad', 'كمية', 'عدد']
        };

        // أنماط HTML الدلالية
        this.semanticTags = {
            article: 'article',
            section: 'section',
            header: 'header',
            footer: 'footer',
            nav: 'navigation',
            aside: 'sidebar',
            main: 'main-content',
            form: 'form',
            table: 'table',
            list: 'list'
        };

        // أنماط ARIA
        this.ariaRoles = {
            'navigation': 'nav',
            'search': 'search',
            'main': 'main',
            'banner': 'header',
            'contentinfo': 'footer',
            'complementary': 'aside',
            'form': 'form',
            'table': 'table',
            'list': 'list',
            'listitem': 'list-item'
        };

        // أنماط Schema.org
        this.schemaTypes = {
            'Product': 'product',
            'Person': 'person',
            'Organization': 'organization',
            'Event': 'event',
            'Article': 'article',
            'Review': 'review',
            'Offer': 'offer',
            'Place': 'place'
        };
        this._cachedDOMDepth = undefined; // Initialize cache
    }

    /**
     * تحليل شامل للصفحة
     */
    analyzePage() {
        this.resetCache();
        const analysis = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            title: document.title,

            // التحليل الدلالي
            semanticStructure: this.analyzeSemanticStructure(),

            // التحليل الهيكلي
            structuralAnalysis: this.analyzeStructure(),

            // كشف الأنماط
            patterns: this.detectPatterns(),

            // استخراج Schema.org
            schemaData: this.extractSchemaData(),

            // تحليل النماذج
            forms: this.analyzeForms(),

            // تحليل الجداول
            tables: this.analyzeTables(),

            // تحليل القوائم
            lists: this.analyzeLists(),

            // كشف المحتوى الرئيسي
            mainContent: this.detectMainContent(),

            // الإحصائيات
            statistics: this.generateStatistics()
        };

        return analysis;
    }

    /** Reset temporary analysis session cache. */
    resetCache() {
        this._cachedDOMDepth = undefined;
    }

    /**
     * تحليل البنية الدلالية
     */
    analyzeSemanticStructure() {
        const structure = {
            semanticTags: {},
            ariaRoles: {},
            landmarks: []
        };

        // تحليل HTML5 Semantic Tags
        Object.keys(this.semanticTags).forEach(tag => {
            const elements = document.querySelectorAll(tag);
            if (elements.length > 0) {
                structure.semanticTags[tag] = {
                    count: elements.length,
                    elements: Array.from(elements).map(el => ({
                        id: el.id || null,
                        classes: typeof el.className === 'string' ? el.className : '',
                        text: el.textContent?.substring(0, 100) || null
                    }))
                };
            }
        });

        // تحليل ARIA Roles
        Object.keys(this.ariaRoles).forEach(role => {
            const elements = document.querySelectorAll(`[role="${role}"]`);
            if (elements.length > 0) {
                structure.ariaRoles[role] = {
                    count: elements.length,
                    elements: Array.from(elements).map(el => ({
                        tag: el.tagName.toLowerCase(),
                        id: el.id || null,
                        label: el.getAttribute('aria-label') || null
                    }))
                };
            }
        });

        // كشف Landmarks
        structure.landmarks = this.detectLandmarks();

        return structure;
    }

    /**
     * تحليل البنية الهيكلية
     */
    analyzeStructure() {
        const structure = {
            depth: this.calculateDOMDepth(),
            hierarchy: this.buildHierarchy(),
            containers: this.detectContainers(),
            repeatingPatterns: this.detectRepeatingPatterns()
        };

        return structure;
    }

    /**
     * حساب عمق DOM
     * Uses caching to avoid redundant recursion during the same analysis cycle.
     */
    calculateDOMDepth(element = document.body, depth = 0) {
        if (element === document.body && this._cachedDOMDepth !== undefined) {
            return this._cachedDOMDepth;
        }

        if (!element.children || element.children.length === 0) return depth;

        let maxDepth = depth;
        for (const child of element.children) {
            const childDepth = this.calculateDOMDepth(child, depth + 1);
            maxDepth = Math.max(maxDepth, childDepth);
        }

        if (element === document.body) {
            this._cachedDOMDepth = maxDepth;
        }
        return maxDepth;
    }

    /**
     * بناء التسلسل الهرمي
     */
    buildHierarchy(element = document.body, level = 0) {
        if (level > 5) return null; // حد أقصى للعمق

        const node = {
            tag: element.tagName?.toLowerCase(),
            id: element.id || null,
            classes: typeof element.className === 'string' ? element.className : '',
            role: element.getAttribute('role') || null,
            children: []
        };

        // معالجة العناصر المهمة فقط
        const importantTags = ['header', 'nav', 'main', 'article', 'section', 'aside', 'footer', 'form', 'table'];

        Array.from(element.children).forEach(child => {
            if (importantTags.includes(child.tagName?.toLowerCase()) ||
                child.getAttribute('role') ||
                child.id) {
                const childNode = this.buildHierarchy(child, level + 1);
                if (childNode) {
                    node.children.push(childNode);
                }
            }
        });

        return node;
    }

    /**
     * كشف الحاويات الرئيسية
     */
    detectContainers() {
        const containers = [];

        // البحث عن الحاويات الشائعة
        const containerSelectors = [
            'main',
            '[role="main"]',
            '#main',
            '.main',
            '#content',
            '.content',
            '#container',
            '.container',
            'article',
            'section'
        ];

        containerSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.children.length > 0) {
                        containers.push({
                            selector: selector,
                            tag: el.tagName.toLowerCase(),
                            id: el.id || null,
                            classes: typeof el.className === 'string' ? el.className : '',
                            childrenCount: el.children.length,
                            textLength: el.textContent?.length || 0
                        });
                    }
                });
            } catch (e) {
                // تجاهل الأخطاء
            }
        });

        return containers;
    }

    /**
     * كشف الأنماط المتكررة - محسّن بالبصمة الهيكلية
     */
    detectRepeatingPatterns() {
        const patterns = [];

        // Static patterns to check
        const commonPatterns = [
            '.item', '.card', '.product', '.post', '.article',
            '.row', '.entry', '.block', '.tile', '.result',
            '.student', '.answer', '.question', '.grade',
            'li', 'tr',
            '[class*="item"]', '[class*="card"]', '[class*="product"]',
            '[class*="row"]', '[class*="entry"]', '[class*="student"]',
            '[data-student-row]', '[data-item]', '[data-row]',
            'article', 'section > div'
        ];

        const found = new Set();

        commonPatterns.forEach(pattern => {
            try {
                const elements = document.querySelectorAll(pattern);
                if (elements.length >= 2) {
                    const key = `${pattern}_${elements.length}`;
                    if (!found.has(key)) {
                        found.add(key);
                        patterns.push({
                            selector: pattern,
                            count: elements.length,
                            sample: this.extractSampleData(elements[0]),
                            fingerprint: this.generateStructuralFingerprint(elements[0])
                        });
                    }
                }
            } catch (e) {}
        });

        // Dynamic detection: find groups of sibling elements with same structure
        this.detectSiblingPatterns(patterns, found);

        return patterns;
    }

    /**
     * Detect patterns among sibling elements that share the same structural fingerprint
     */
    detectSiblingPatterns(patterns, found) {
        const containers = document.querySelectorAll('div, section, main, article, ul, ol, tbody, thead');
        const MAX_CONTAINERS = 100;
        let checked = 0;

        for (const container of containers) {
            if (checked >= MAX_CONTAINERS) break;
            checked++;

            const children = Array.from(container.children);
            if (children.length < 3) continue; // Need at least 3 siblings to detect a pattern

            // Group by tagName
            const tagGroups = {};
            children.forEach(child => {
                const tag = child.tagName.toLowerCase();
                if (!tagGroups[tag]) tagGroups[tag] = [];
                tagGroups[tag].push(child);
            });

            for (const [tag, group] of Object.entries(tagGroups)) {
                if (group.length < 3) continue;

                // Check structural similarity
                const fp0 = this.generateStructuralFingerprint(group[0]);
                const allSimilar = group.every(el => {
                    const fp = this.generateStructuralFingerprint(el);
                    return this.fingerprintSimilarity(fp0, fp) > 0.7;
                });

                if (allSimilar) {
                    // Build a selector for this group
                    let selector = '';
                    const parentId = container.id;
                    const parentClass = typeof container.className === 'string' ? container.className.split(/\s+/)[0] : '';

                    if (parentId) selector = `#${parentId} > ${tag}`;
                    else if (parentClass) selector = `.${parentClass} > ${tag}`;
                    else selector = `${container.tagName.toLowerCase()} > ${tag}`;

                    const key = `${selector}_${group.length}`;
                    if (!found.has(key)) {
                        found.add(key);
                        patterns.push({
                            selector,
                            count: group.length,
                            sample: this.extractSampleData(group[0]),
                            fingerprint: fp0,
                            detectionMethod: 'structural-fingerprint'
                        });
                    }
                }
            }
        }
    }

    /**
     * Generate a structural fingerprint of an element
     */
    generateStructuralFingerprint(element) {
        if (!element) return '';

        const parts = [];
        const tag = element.tagName?.toLowerCase() || '';
        parts.push(tag);
        parts.push(`children:${element.children.length}`);

        // Capture child tag distribution
        const childTags = {};
        Array.from(element.children).forEach(child => {
            const ct = child.tagName.toLowerCase();
            childTags[ct] = (childTags[ct] || 0) + 1;
        });

        const sortedTags = Object.entries(childTags).sort((a, b) => a[0].localeCompare(b[0]));
        sortedTags.forEach(([t, c]) => parts.push(`${t}:${c}`));

        // Include class count and text length range
        const classCount = typeof element.className === 'string' ? element.className.split(/\s+/).filter(Boolean).length : 0;
        parts.push(`cls:${classCount}`);

        const textLen = element.textContent?.trim().length || 0;
        const lenBucket = textLen < 50 ? 'xs' : textLen < 200 ? 'sm' : textLen < 1000 ? 'md' : textLen < 5000 ? 'lg' : 'xl';
        parts.push(`len:${lenBucket}`);

        return parts.join('|');
    }

    /**
     * Calculate similarity between two structural fingerprints
     */
    fingerprintSimilarity(fp1, fp2) {
        if (!fp1 || !fp2) return 0;
        if (fp1 === fp2) return 1;

        const parts1 = new Set(fp1.split('|'));
        const parts2 = new Set(fp2.split('|'));
        const intersection = [...parts1].filter(p => parts2.has(p));
        const union = new Set([...parts1, ...parts2]);

        return intersection.length / union.size;
    }

    /**
     * كشف الأنماط الدلالية
     */
    detectPatterns() {
        const patterns = {
            fields: {},
            entities: []
        };

        // تحليل جميع العناصر القابلة للإدخال
        const inputs = document.querySelectorAll('input, textarea, select');

        inputs.forEach(input => {
            const fieldType = this.detectFieldType(input);
            if (fieldType) {
                if (!patterns.fields[fieldType]) {
                    patterns.fields[fieldType] = [];
                }
                patterns.fields[fieldType].push({
                    name: input.name || input.id || null,
                    type: input.type || 'text',
                    value: input.value || null,
                    placeholder: input.placeholder || null
                });
            }
        });

        // تحليل النصوص والروابط والصور لضمان استخراج البيانات من الصفحات البسيطة
        // Cap at MAX_TEXT_ELEMENTS to prevent performance issues on large pages
        const MAX_TEXT_ELEMENTS = 200;
        const MAX_LINKS = 200;
        const MAX_IMAGES = 100;

        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span[class*="text"], span[class*="label"], span[class*="value"], div[class*="content"], div[class*="stat"]');
        let textCount = 0;
        for (const element of textElements) {
            if (textCount >= MAX_TEXT_ELEMENTS) break;
            if (element.closest('script, style, noscript')) continue;
            const text = element.textContent.trim();
            // Guard: className may be SVGAnimatedString on SVG elements
            const classNameStr = (typeof element.className === 'string') ? element.className : '';
            if (text.length > 0 && (text.length > 10 || element.tagName.startsWith('H') || classNameStr.includes('value'))) {
                if (!patterns.fields['content']) patterns.fields['content'] = [];

                let name = `text_${textCount++}`;
                if (element.id && typeof element.id === 'string') name = element.id;
                else if (classNameStr) name = classNameStr.split(' ')[0];

                patterns.fields['content'].push({
                    name: name,
                    type: element.tagName.toLowerCase(),
                    value: text,
                    placeholder: null
                });
            }
        }

        const links = document.querySelectorAll('a[href]');
        let linkCount = 0;
        for (const link of links) {
            if (linkCount >= MAX_LINKS) break;
            const text = link.textContent.trim();
            if (link.href && text) {
                if (!patterns.fields['link']) patterns.fields['link'] = [];
                patterns.fields['link'].push({
                    name: link.id || `link_${linkCount++}`,
                    type: 'url',
                    value: link.href,
                    placeholder: text
                });
            }
        }

        const images = document.querySelectorAll('img[src]');
        let imgCount = 0;
        for (const img of images) {
            if (imgCount >= MAX_IMAGES) break;
            if (img.src) {
                if (!patterns.fields['image']) patterns.fields['image'] = [];
                patterns.fields['image'].push({
                    name: img.alt || `image_${imgCount++}`,
                    type: 'image',
                    value: img.src,
                    placeholder: img.alt || null
                });
                imgCount++;
            }
        }

        // استخراج بيانات الجداول (Tables) كحقول دلالية بناءً على العناوين (Headers)
        const MAX_TABLE_ROWS = 500;
        const tables = document.querySelectorAll('table');
        tables.forEach((table, tableIndex) => {
            const rows = Array.from(table.rows);
            if (rows.length < 2) return;

            const headerRow = table.querySelector('thead tr') || rows[0];
            const headers = Array.from(headerRow.cells).map((cell, i) => cell.textContent?.trim() || `Column_${i}`);

            const bodyRows = rows.filter(r => r !== headerRow && r.closest('thead') === null).slice(0, MAX_TABLE_ROWS);

            bodyRows.forEach((row, rowIndex) => {
                // محاولة إيجاد معرف للصف (مثل اسم الطالب أو رقم الهوية)
                const rowId = row.cells[0]?.textContent?.trim() || row.cells[1]?.textContent?.trim() || `row_${rowIndex}`;

                Array.from(row.cells).forEach((cell, cellIndex) => {
                    const header = headers[cellIndex];
                    if (!header) return;

                    const cellText = cell.textContent?.trim() || '';
                    if (cellText) {
                        if (!patterns.fields[header]) patterns.fields[header] = [];
                        patterns.fields[header].push({
                            name: rowId,
                            type: 'table_cell',
                            value: cellText,
                            placeholder: null,
                            metadata: {
                                tableId: table.id || `table_${tableIndex}`,
                                rowIndex: rowIndex,
                                header: header,
                                rowIdentifier: rowId
                            }
                        });
                    }
                });
            });
        });

        // كشف الكيانات (Entities)
        patterns.entities = this.detectEntities();

        return patterns;
    }

    /**
     * كشف نوع الحقل دلالياً
     */
    detectFieldType(element) {
        const name = (element.name || element.id || element.placeholder || '').toLowerCase();
        const type = element.type?.toLowerCase();
        const label = this.findLabel(element)?.toLowerCase() || '';

        const combinedText = `${name} ${label}`;

        // البحث في القواعد الدلالية
        for (const [fieldType, keywords] of Object.entries(this.semanticRules)) {
            for (const keyword of keywords) {
                if (combinedText.includes(keyword.toLowerCase())) {
                    return fieldType;
                }
            }
        }

        // التحليل بناءً على نوع الإدخال
        if (type === 'email') return 'email';
        if (type === 'tel') return 'phone';
        if (type === 'date' || type === 'datetime-local') return 'date';
        if (type === 'number') return 'quantity';
        if (type === 'url') return 'link';

        return 'text';
    }

    /**
     * إيجاد Label للعنصر
     */
    findLabel(element) {
        // البحث عن label مرتبط
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            if (label) return label.textContent;
        }

        // البحث عن label أب
        const parentLabel = element.closest('label');
        if (parentLabel) return parentLabel.textContent;

        // البحث عن aria-label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        return null;
    }

    /**
     * كشف الكيانات (Products, People, etc.)
     */
    detectEntities() {
        const entities = [];

        // كشف المنتجات
        const products = this.detectProducts();
        if (products.length > 0) {
            entities.push({
                type: 'products',
                count: products.length,
                items: products
            });
        }

        // كشف الأشخاص
        const people = this.detectPeople();
        if (people.length > 0) {
            entities.push({
                type: 'people',
                count: people.length,
                items: people
            });
        }

        // كشف المقالات
        const articles = this.detectArticles();
        if (articles.length > 0) {
            entities.push({
                type: 'articles',
                count: articles.length,
                items: articles
            });
        }

        return entities;
    }

    /**
     * كشف المنتجات
     */
    detectProducts() {
        const products = [];

        const productSelectors = [
            '[itemtype*="Product"]',
            '.product',
            '[class*="product"]',
            '[data-product]'
        ];

        productSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    const product = {
                        name: this.extractText(el, ['.name', '.title', '[itemprop="name"]']),
                        price: this.extractText(el, ['.price', '[itemprop="price"]']),
                        description: this.extractText(el, ['.description', '[itemprop="description"]']),
                        image: this.extractImage(el),
                        link: this.extractLink(el)
                    };

                    if (product.name || product.price) {
                        products.push(product);
                    }
                });
            } catch (e) {
                // تجاهل الأخطاء
            }
        });

        return products.slice(0, 10); // حد أقصى 10 منتجات
    }

    /**
     * كشف الأشخاص
     */
    detectPeople() {
        const people = [];

        const personSelectors = [
            '[itemtype*="Person"]',
            '.person',
            '.author',
            '[class*="author"]'
        ];

        personSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    const person = {
                        name: this.extractText(el, ['.name', '[itemprop="name"]']),
                        role: this.extractText(el, ['.role', '.title', '[itemprop="jobTitle"]']),
                        email: this.extractText(el, ['.email', '[itemprop="email"]']),
                        image: this.extractImage(el)
                    };

                    if (person.name) {
                        people.push(person);
                    }
                });
            } catch (e) {
                // تجاهل الأخطاء
            }
        });

        return people.slice(0, 10);
    }

    /**
     * كشف المقالات
     */
    detectArticles() {
        const articles = [];

        const articleElements = document.querySelectorAll('article, [itemtype*="Article"]');

        articleElements.forEach(el => {
            const article = {
                title: this.extractText(el, ['h1', 'h2', '.title', '[itemprop="headline"]']),
                author: this.extractText(el, ['.author', '[itemprop="author"]']),
                date: this.extractText(el, ['.date', 'time', '[itemprop="datePublished"]']),
                content: this.extractText(el, ['.content', '[itemprop="articleBody"]'], 200)
            };

            if (article.title) {
                articles.push(article);
            }
        });

        return articles.slice(0, 5);
    }

    /**
     * استخراج نص من عنصر
     */
    extractText(parent, selectors, maxLength = 100) {
        for (const selector of selectors) {
            try {
                const element = parent.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    if (text) {
                        return maxLength ? text.substring(0, maxLength) : text;
                    }
                }
            } catch (e) {
                // تجاهل الأخطاء
            }
        }
        return null;
    }

    /**
     * استخراج صورة
     */
    extractImage(parent) {
        const img = parent.querySelector('img');
        return img ? (img.src || img.dataset.src || null) : null;
    }

    /**
     * استخراج رابط
     */
    extractLink(parent) {
        const link = parent.querySelector('a');
        return link ? link.href : null;
    }

    /**
     * استخراج بيانات Schema.org
     */
    extractSchemaData() {
        const schemaData = [];

        // البحث عن JSON-LD
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        jsonLdScripts.forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                schemaData.push({
                    type: 'json-ld',
                    data: data
                });
            } catch (e) {
                // تجاهل الأخطاء
            }
        });

        // البحث عن Microdata
        Object.keys(this.schemaTypes).forEach(schemaType => {
            const elements = document.querySelectorAll(`[itemtype*="${schemaType}"]`);
            if (elements.length > 0) {
                schemaData.push({
                    type: 'microdata',
                    schemaType: schemaType,
                    count: elements.length
                });
            }
        });

        return schemaData;
    }

    /**
     * تحليل النماذج
     */
    analyzeForms() {
        const forms = [];

        document.querySelectorAll('form').forEach((form, index) => {
            const formData = {
                id: form.id || `form_${index}`,
                action: form.action || null,
                method: form.method || 'get',
                fields: []
            };

            // تحليل حقول النموذج
            form.querySelectorAll('input, textarea, select').forEach(field => {
                formData.fields.push({
                    name: field.name || field.id || null,
                    type: field.type || 'text',
                    semanticType: this.detectFieldType(field),
                    required: field.required || false,
                    value: field.value || null
                });
            });

            forms.push(formData);
        });

        return forms;
    }

    /**
     * تحليل الجداول - محسّن للجداول المعقدة
     */
    analyzeTables() {
        const tables = [];

        document.querySelectorAll('table').forEach((table, index) => {
            const tableData = {
                id: table.id || `table_${index}`,
                ariaLabel: table.getAttribute('aria-label') || '',
                caption: table.querySelector('caption')?.textContent?.trim() || '',
                rows: table.rows.length,
                columns: table.rows[0]?.cells.length || 0,
                headers: [],
                headerGroups: [],
                sample: [],
                hasNestedTable: table.querySelector('table') !== null,
                hasMergedCells: false,
                dataAttributes: {}
            };

            // Extract data-* from table tag
            Array.from(table.attributes).forEach(attr => {
                if (attr.name.startsWith('data-')) {
                    tableData.dataAttributes[attr.name] = attr.value;
                }
            });

            // Extract headers (support multi-level headers)
            const theadRows = table.querySelectorAll('thead tr');
            if (theadRows.length > 0) {
                theadRows.forEach(headerRow => {
                    const rowHeaders = Array.from(headerRow.cells).map(cell => {
                        const colspan = parseInt(cell.getAttribute('colspan') || '1');
                        const rowspan = parseInt(cell.getAttribute('rowspan') || '1');
                        if (colspan > 1 || rowspan > 1) tableData.hasMergedCells = true;
                        return {
                            text: cell.textContent?.trim() || '',
                            colspan,
                            rowspan,
                            scope: cell.getAttribute('scope') || ''
                        };
                    });
                    tableData.headerGroups.push(rowHeaders);
                });
                // Flatten for backwards compatibility
                if (tableData.headerGroups.length > 0) {
                    tableData.headers = tableData.headerGroups[tableData.headerGroups.length - 1].map(h => h.text);
                }
            } else {
                // Fallback: first row as headers
                const firstRow = table.querySelector('tr');
                if (firstRow) {
                    tableData.headers = Array.from(firstRow.cells).map(cell =>
                        cell.textContent?.trim() || ''
                    );
                }
            }

            // Check for merged cells in body
            table.querySelectorAll('td[colspan], td[rowspan], th[colspan], th[rowspan]').forEach(cell => {
                const cs = parseInt(cell.getAttribute('colspan') || '1');
                const rs = parseInt(cell.getAttribute('rowspan') || '1');
                if (cs > 1 || rs > 1) tableData.hasMergedCells = true;
            });

            // Sample data (first 5 rows)
            const dataRows = Array.from(table.querySelectorAll('tbody tr, tr')).slice(0, 5);
            tableData.sample = dataRows.map(row => {
                const rowInfo = {
                    cells: Array.from(row.cells).map(cell => {
                        const text = cell.textContent?.trim() || '';
                        return {
                            text: text.substring(0, 200),
                            tag: cell.tagName.toLowerCase(),
                            colspan: parseInt(cell.getAttribute('colspan') || '1'),
                            classes: typeof cell.className === 'string' ? cell.className : ''
                        };
                    }),
                    data: {}
                };
                // Include data-* from row
                if (row.dataset) {
                    Object.keys(row.dataset).forEach(k => rowInfo.data[k] = row.dataset[k]);
                }
                return rowInfo;
            });

            tables.push(tableData);
        });

        return tables;
    }

    /**
     * تحليل القوائم - محسّن للقوائم المتداخلة
     */
    analyzeLists() {
        const lists = [];

        document.querySelectorAll('ul, ol, dl').forEach((list, index) => {
            // Skip nested lists (only process top-level)
            if (list.parentElement?.closest('ul, ol, dl')) return;

            const listData = {
                id: list.id || `list_${index}`,
                type: list.tagName.toLowerCase(),
                itemCount: 0,
                hasNestedLists: false,
                items: [],
                ariaLabel: list.getAttribute('aria-label') || '',
                role: list.getAttribute('role') || ''
            };

            if (list.tagName.toLowerCase() === 'dl') {
                // Definition list
                const dts = list.querySelectorAll(':scope > dt');
                listData.itemCount = dts.length;
                dts.forEach((dt, dtIdx) => {
                    if (dtIdx >= 20) return;
                    const dd = dt.nextElementSibling;
                    listData.items.push({
                        term: dt.textContent?.trim().substring(0, 100) || '',
                        definition: dd?.tagName?.toLowerCase() === 'dd' ? dd.textContent?.trim().substring(0, 200) : ''
                    });
                });
            } else {
                const lis = list.querySelectorAll(':scope > li');
                listData.itemCount = lis.length;
                lis.forEach((li, liIdx) => {
                    if (liIdx >= 20) return;
                    const nested = li.querySelector('ul, ol');
                    if (nested) listData.hasNestedLists = true;

                    const text = nested ?
                        li.textContent?.trim().replace(nested.textContent?.trim(), '').trim() :
                        li.textContent?.trim();

                    listData.items.push({
                        text: (text || '').substring(0, 200),
                        hasNested: !!nested,
                        nestedCount: nested ? nested.querySelectorAll(':scope > li').length : 0,
                        links: Array.from(li.querySelectorAll('a')).slice(0, 5).map(a => ({
                            text: a.textContent?.trim().substring(0, 100),
                            href: a.href
                        }))
                    });
                });
            }

            if (listData.items.length > 0) {
                lists.push(listData);
            }
        });

        return lists;
    }

    /**
     * كشف المحتوى الرئيسي - محسّن بنظام تسجيل النقاط
     */
    detectMainContent() {
        // Score-based main content detection
        const candidates = [];

        // Priority selectors
        const prioritySelectors = [
            { sel: 'main', score: 100 },
            { sel: '[role="main"]', score: 95 },
            { sel: '#main-content', score: 90 },
            { sel: '#content', score: 85 },
            { sel: '.main-content', score: 80 },
            { sel: '.content', score: 75 },
            { sel: 'article', score: 70 },
            { sel: '#main', score: 65 },
            { sel: '.main', score: 60 },
            { sel: '.container', score: 50 },
            { sel: '.wrapper', score: 45 },
            { sel: '.page-content', score: 55 },
            { sel: '[class*="content"]', score: 40 },
            { sel: '[class*="body"]', score: 35 }
        ];

        for (const { sel, score } of prioritySelectors) {
            try {
                const elements = document.querySelectorAll(sel);
                elements.forEach(element => {
                    const textLen = element.textContent?.trim().length || 0;
                    const childCount = element.children.length;

                    // Prioritize elements with substantial content
                    let finalScore = score;
                    if (textLen > 500) finalScore += 20;
                    if (textLen > 2000) finalScore += 30;
                    if (childCount > 5) finalScore += 10;

                    // Penalize nav/header/footer elements
                    const tag = element.tagName.toLowerCase();
                    if (['nav', 'header', 'footer', 'aside'].includes(tag)) finalScore -= 50;

                    candidates.push({
                        selector: sel,
                        element,
                        tag,
                        textLength: textLen,
                        childrenCount: childCount,
                        score: finalScore,
                        id: element.id || null,
                        classes: typeof element.className === 'string' ? element.className : ''
                    });
                });
            } catch (_) {}
        }

        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);

        if (candidates.length > 0) {
            const best = candidates[0];
            return {
                selector: best.selector,
                tag: best.tag,
                textLength: best.textLength,
                childrenCount: best.childrenCount,
                score: best.score,
                id: best.id,
                classes: best.classes,
                alternativesCount: candidates.length
            };
        }

        // Heuristic: largest text-bearing container
        let bestDiv = null;
        let bestTextLen = 0;
        document.querySelectorAll('div, section').forEach(el => {
            const len = el.textContent?.trim().length || 0;
            if (len > bestTextLen && el.children.length >= 3) {
                bestTextLen = len;
                bestDiv = el;
            }
        });

        if (bestDiv) {
            return {
                selector: bestDiv.id ? `#${bestDiv.id}` : bestDiv.tagName.toLowerCase(),
                tag: bestDiv.tagName.toLowerCase(),
                textLength: bestTextLen,
                childrenCount: bestDiv.children.length,
                score: 30,
                detectionMethod: 'heuristic-largest-container'
            };
        }

        return null;
    }

    /**
     * كشف Landmarks
     */
    detectLandmarks() {
        const landmarks = [];

        const landmarkSelectors = {
            'banner': ['header', '[role="banner"]'],
            'navigation': ['nav', '[role="navigation"]'],
            'main': ['main', '[role="main"]'],
            'complementary': ['aside', '[role="complementary"]'],
            'contentinfo': ['footer', '[role="contentinfo"]'],
            'search': ['[role="search"]'],
            'form': ['form', '[role="form"]']
        };

        Object.entries(landmarkSelectors).forEach(([landmark, selectors]) => {
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    landmarks.push({
                        type: landmark,
                        selector: selector,
                        count: elements.length
                    });
                }
            });
        });

        return landmarks;
    }

    /**
     * استخراج عينة من البيانات
     */
    extractSampleData(element) {
        return {
            text: element.textContent?.trim().substring(0, 100) || '',
            classes: typeof element.className === 'string' ? element.className : '',
            childrenCount: element.children.length
        };
    }

    /**
     * إنشاء الإحصائيات
     * Uses cached DOM depth to avoid re-running the expensive recursion.
     */
    generateStatistics() {
        // Cache DOM depth so we don't recurse twice in one analyzePage() call
        if (this._cachedDOMDepth === undefined) {
            this._cachedDOMDepth = this.calculateDOMDepth();
        }
        return {
            totalElements: document.querySelectorAll('*').length,
            totalText: document.body.textContent?.length || 0,
            totalImages: document.querySelectorAll('img').length,
            totalLinks: document.querySelectorAll('a').length,
            totalForms: document.querySelectorAll('form').length,
            totalTables: document.querySelectorAll('table').length,
            totalInputs: document.querySelectorAll('input, textarea, select').length,
            domDepth: this._cachedDOMDepth
        };
    }

    /**
     * استخراج ذكي بناءً على التحليل
     * Resets the DOM depth cache so a fresh analyzePage() call always reflects
     * the current document state.
     */
    smartExtract() {
        this._cachedDOMDepth = undefined; // reset cache for fresh analysis
        const analysis = this.analyzePage();
        const extracted = {
            metadata: {
                url: analysis.url,
                title: analysis.title,
                timestamp: analysis.timestamp
            },
            data: {},
            entities: analysis.patterns.entities,
            structure: {
                forms: analysis.forms,
                tables: analysis.tables,
                lists: analysis.lists
            },
            schema: analysis.schemaData
        };

        // استخراج الحقول المكتشفة — always guarantee an array per field type
        Object.entries(analysis.patterns.fields).forEach(([fieldType, fields]) => {
            extracted.data[fieldType] = Array.isArray(fields)
                ? fields.map(field => ({
                    name: field.name,
                    value: field.value,
                    type: field.type
                }))
                : [];
        });

        return extracted;
    }
}

// تصدير للاستخدام العام
window.SemanticAnalyzer = SemanticAnalyzer;
})();
