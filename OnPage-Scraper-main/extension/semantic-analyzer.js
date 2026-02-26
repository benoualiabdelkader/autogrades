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
    }

    /**
     * تحليل شامل للصفحة
     */
    analyzePage() {
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
                        classes: el.className || null,
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
     */
    calculateDOMDepth(element = document.body, depth = 0) {
        if (!element || !element.children || element.children.length === 0) {
            return depth;
        }

        let maxDepth = depth;
        Array.from(element.children).forEach(child => {
            const childDepth = this.calculateDOMDepth(child, depth + 1);
            maxDepth = Math.max(maxDepth, childDepth);
        });

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
            classes: element.className || null,
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
                            classes: el.className || null,
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
     * كشف الأنماط المتكررة
     */
    detectRepeatingPatterns() {
        const patterns = [];

        // البحث عن العناصر المتكررة
        const commonPatterns = [
            '.item',
            '.card',
            '.product',
            '.post',
            '.article',
            'li',
            'tr',
            '[class*="item"]',
            '[class*="card"]',
            '[class*="product"]'
        ];

        commonPatterns.forEach(pattern => {
            try {
                const elements = document.querySelectorAll(pattern);
                if (elements.length >= 3) { // على الأقل 3 عناصر متكررة
                    patterns.push({
                        selector: pattern,
                        count: elements.length,
                        sample: this.extractSampleData(elements[0])
                    });
                }
            } catch (e) {
                // تجاهل الأخطاء
            }
        });

        return patterns;
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
     * تحليل الجداول
     */
    analyzeTables() {
        const tables = [];

        document.querySelectorAll('table').forEach((table, index) => {
            const tableData = {
                id: table.id || `table_${index}`,
                rows: table.rows.length,
                columns: table.rows[0]?.cells.length || 0,
                headers: [],
                sample: []
            };

            // استخراج الرؤوس
            const headerRow = table.querySelector('thead tr, tr:first-child');
            if (headerRow) {
                tableData.headers = Array.from(headerRow.cells).map(cell =>
                    cell.textContent?.trim() || ''
                );
            }

            // استخراج عينة من البيانات (أول 3 صفوف)
            const dataRows = Array.from(table.querySelectorAll('tbody tr, tr')).slice(0, 3);
            tableData.sample = dataRows.map(row =>
                Array.from(row.cells).map(cell => cell.textContent?.trim() || '')
            );

            tables.push(tableData);
        });

        return tables;
    }

    /**
     * تحليل القوائم
     */
    analyzeLists() {
        const lists = [];

        document.querySelectorAll('ul, ol').forEach((list, index) => {
            const listData = {
                id: list.id || `list_${index}`,
                type: list.tagName.toLowerCase(),
                items: Array.from(list.querySelectorAll('li')).map(li =>
                    li.textContent?.trim().substring(0, 100) || ''
                ).slice(0, 10) // أول 10 عناصر
            };

            if (listData.items.length > 0) {
                lists.push(listData);
            }
        });

        return lists;
    }

    /**
     * كشف المحتوى الرئيسي
     */
    detectMainContent() {
        // البحث عن المحتوى الرئيسي
        const mainSelectors = [
            'main',
            '[role="main"]',
            '#main',
            '.main',
            '#content',
            '.content',
            'article'
        ];

        for (const selector of mainSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                return {
                    selector: selector,
                    tag: element.tagName.toLowerCase(),
                    textLength: element.textContent?.length || 0,
                    childrenCount: element.children.length
                };
            }
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
            classes: element.className || null,
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
