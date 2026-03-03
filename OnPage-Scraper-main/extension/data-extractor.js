/**
 * Advanced Data Extractor
 * محرك استخراج البيانات المتقدم - يدعم النص، الصور، الروابط، الجداول، والملفات
 */

class AdvancedDataExtractor {
    constructor() {
        this.supportedDataTypes = ['text', 'images', 'links', 'tables', 'files', 'metadata'];
        this.extractedData = {};
    }

    /**
     * استخراج شامل لجميع أنواع البيانات من الصفحة
     */
    async extractAll(settings = {}) {
        const data = {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            title: document.title,
            metadata: {}
        };

        // استخراج كل نوع من البيانات بناءً على الإعدادات
        if (settings.dataTypes?.text !== false) {
            data.text = this.extractText();
        }

        if (settings.dataTypes?.images !== false) {
            data.images = await this.extractImages();
        }

        if (settings.dataTypes?.links !== false) {
            data.links = this.extractLinks();
        }

        if (settings.dataTypes?.tables !== false) {
            data.tables = this.extractTables();
        }

        if (settings.dataTypes?.files !== false) {
            data.files = this.extractFileLinks();
        }

        // Metadata
        data.metadata = this.extractMetadata();

        return data;
    }

    /**
     * 📝 استخراج النصوص
     */
    extractText() {
        const textData = {
            headings: {},
            paragraphs: [],
            lists: [],
            textContent: '',
            wordCount: 0
        };

        // Extract headings (h1-h6)
        for (let i = 1; i <= 6; i++) {
            const headings = Array.from(document.querySelectorAll(`h${i}`));
            textData.headings[`h${i}`] = headings.map(h => ({
                text: h.textContent.trim(),
                id: h.id || null
            }));
        }

        // Extract paragraphs
        const paragraphs = Array.from(document.querySelectorAll('p'));
        textData.paragraphs = paragraphs
            .map(p => p.textContent.trim())
            .filter(text => text.length > 0);

        // Extract lists
        const lists = Array.from(document.querySelectorAll('ul, ol'));
        textData.lists = lists.map(list => ({
            type: list.tagName.toLowerCase(),
            items: Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim())
        }));

        // Main text content
        const bodyClone = document.body.cloneNode(true);
        // Remove scripts and styles
        bodyClone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        textData.textContent = bodyClone.textContent.trim().replace(/\s+/g, ' ');
        textData.wordCount = textData.textContent.split(/\s+/).length;

        return textData;
    }

    /**
     * 🖼️ استخراج الصور
     */
    async extractImages() {
        const images = Array.from(document.querySelectorAll('img'));
        const imageData = [];

        for (const img of images) {
            const data = {
                src: this.getAbsoluteUrl(img.src),
                alt: img.alt || '',
                title: img.title || '',
                width: img.naturalWidth || img.width,
                height: img.naturalHeight || img.height,
                loading: img.loading,
                className: img.className
            };

            // Try to get base64 for small images (< 500KB)
            if (data.width > 0 && data.height > 0 && data.width * data.height < 500000) {
                try {
                    data.base64 = await this.imageToBase64(img);
                } catch (e) {
                    // CORS or other error - skip base64
                }
            }

            imageData.push(data);
        }

        // Also check for background images
        const elementsWithBgImages = this.extractBackgroundImages();
        
        return {
            count: imageData.length,
            items: imageData,
            backgroundImages: elementsWithBgImages
        };
    }

    extractBackgroundImages() {
        const bgImages = [];
        const allElements = document.querySelectorAll('*');

        allElements.forEach(el => {
            const bgImage = window.getComputedStyle(el).backgroundImage;
            if (bgImage && bgImage !== 'none') {
                const urlMatch = bgImage.match(/url\(["']?(.+?)["']?\)/);
                if (urlMatch && urlMatch[1]) {
                    bgImages.push({
                        url: this.getAbsoluteUrl(urlMatch[1]),
                        element: el.tagName.toLowerCase(),
                        className: el.className
                    });
                }
            }
        });

        return bgImages;
    }

    async imageToBase64(img) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            
            try {
                ctx.drawImage(img, 0, 0);
                const base64 = canvas.toDataURL('image/png');
                resolve(base64);
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * 🔗 استخراج الروابط
     */
    extractLinks() {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const linkData = {
            count: links.length,
            internal: [],
            external: [],
            email: [],
            tel: [],
            other: []
        };

        const currentDomain = window.location.hostname;

        links.forEach(link => {
            const data = {
                href: this.getAbsoluteUrl(link.href),
                text: link.textContent.trim(),
                title: link.title || '',
                target: link.target || '',
                rel: link.rel || ''
            };

            // Categorize links
            if (data.href.startsWith('mailto:')) {
                linkData.email.push(data);
            } else if (data.href.startsWith('tel:')) {
                linkData.tel.push(data);
            } else if (data.href.startsWith('http')) {
                try {
                    const linkUrl = new URL(data.href);
                    if (linkUrl.hostname === currentDomain) {
                        linkData.internal.push(data);
                    } else {
                        linkData.external.push(data);
                    }
                } catch (e) {
                    linkData.other.push(data);
                }
            } else {
                linkData.other.push(data);
            }
        });

        return linkData;
    }

    /**
     * 📊 استخراج الجداول
     */
    extractTables() {
        const tables = Array.from(document.querySelectorAll('table'));
        const tableData = [];

        tables.forEach((table, index) => {
            const data = {
                index: index,
                headers: [],
                rows: [],
                summary: table.getAttribute('summary') || '',
                caption: ''
            };

            // Extract caption
            const caption = table.querySelector('caption');
            if (caption) {
                data.caption = caption.textContent.trim();
            }

            // Extract headers
            const headerCells = table.querySelectorAll('thead th, thead td');
            if (headerCells.length > 0) {
                data.headers = Array.from(headerCells).map(cell => cell.textContent.trim());
            } else {
                // Try first row as headers
                const firstRow = table.querySelector('tr');
                if (firstRow) {
                    const cells = firstRow.querySelectorAll('th, td');
                    data.headers = Array.from(cells).map(cell => cell.textContent.trim());
                }
            }

            // Extract rows
            const rows = table.querySelectorAll('tbody tr, tr');
            data.rows = Array.from(rows).map(row => {
                const cells = row.querySelectorAll('th, td');
                return Array.from(cells).map(cell => ({
                    text: cell.textContent.trim(),
                    colspan: cell.colSpan || 1,
                    rowspan: cell.rowSpan || 1
                }));
            });

            // Skip if table has no data
            if (data.rows.length > 0) {
                tableData.push(data);
            }
        });

        return {
            count: tableData.length,
            items: tableData
        };
    }

    /**
     * 📁 استخراج روابط الملفات
     */
    extractFileLinks() {
        const fileExtensions = {
            documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
            spreadsheets: ['xls', 'xlsx', 'csv', 'ods'],
            presentations: ['ppt', 'pptx', 'odp'],
            archives: ['zip', 'rar', '7z', 'tar', 'gz'],
            images: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'],
            videos: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
            audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a']
        };

        const links = Array.from(document.querySelectorAll('a[href]'));
        const fileLinks = {
            documents: [],
            spreadsheets: [],
            presentations: [],
            archives: [],
            images: [],
            videos: [],
            audio: [],
            other: []
        };

        links.forEach(link => {
            const href = link.href.toLowerCase();
            let categorized = false;

            for (const [category, extensions] of Object.entries(fileExtensions)) {
                for (const ext of extensions) {
                    if (href.endsWith(`.${ext}`) || href.includes(`.${ext}?`)) {
                        fileLinks[category].push({
                            url: this.getAbsoluteUrl(link.href),
                            text: link.textContent.trim(),
                            extension: ext,
                            size: link.getAttribute('data-size') || 'unknown'
                        });
                        categorized = true;
                        break;
                    }
                }
                if (categorized) break;
            }
        });

        // Count total files
        const totalFiles = Object.values(fileLinks).reduce((sum, arr) => sum + arr.length, 0);

        return {
            count: totalFiles,
            byType: fileLinks
        };
    }

    /**
     * 🏷️ استخراج Metadata
     */
    extractMetadata() {
        const metadata = {
            title: document.title,
            description: '',
            keywords: '',
            author: '',
            language: document.documentElement.lang || 'unknown',
            charset: document.characterSet,
            viewport: '',
            
            // Open Graph
            og: {},
            
            // Twitter Cards
            twitter: {},
            
            // Schema.org
            schema: [],
            
            // Custom meta tags
            custom: []
        };

        // Extract standard meta tags
        const metaTags = Array.from(document.querySelectorAll('meta'));
        
        metaTags.forEach(meta => {
            const name = meta.getAttribute('name');
            const property = meta.getAttribute('property');
            const content = meta.getAttribute('content');

            if (!content) return;

            // Standard meta tags
            if (name === 'description') metadata.description = content;
            if (name === 'keywords') metadata.keywords = content;
            if (name === 'author') metadata.author = content;
            if (name === 'viewport') metadata.viewport = content;

            // Open Graph
            if (property && property.startsWith('og:')) {
                const key = property.replace('og:', '');
                metadata.og[key] = content;
            }

            // Twitter Cards
            if (name && name.startsWith('twitter:')) {
                const key = name.replace('twitter:', '');
                metadata.twitter[key] = content;
            }

            // Custom tags
            if (name && !['description', 'keywords', 'author', 'viewport'].includes(name)) {
                metadata.custom.push({ name, content });
            }
        });

        // Extract Schema.org JSON-LD
        const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        jsonLdScripts.forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                metadata.schema.push(data);
            } catch (e) {
                // Invalid JSON-LD
            }
        });

        return metadata;
    }

    /**
     * استخراج بيانات من العنصر المحدد فقط
     */
    async extractFromElement(element, settings = {}) {
        const data = {
            tagName: element.tagName.toLowerCase(),
            className: element.className,
            id: element.id,
            text: element.textContent.trim(),
            html: element.innerHTML,
            attributes: {}
        };

        // Extract all attributes
        Array.from(element.attributes).forEach(attr => {
            data.attributes[attr.name] = attr.value;
        });

        // Extract children data based on type
        if (settings.dataTypes?.images !== false) {
            const images = element.querySelectorAll('img');
            if (images.length > 0) {
                data.images = await this.extractImages();
                data.images.items = data.images.items.filter(img => 
                    element.contains(document.querySelector(`img[src="${img.src}"]`))
                );
            }
        }

        if (settings.dataTypes?.links !== false) {
            const links = element.querySelectorAll('a');
            if (links.length > 0) {
                data.links = this.extractLinks();
                // Filter to only links within this element
                const elementLinks = Array.from(links).map(l => l.href);
                Object.keys(data.links).forEach(key => {
                    if (Array.isArray(data.links[key])) {
                        data.links[key] = data.links[key].filter(link => 
                            elementLinks.includes(link.href)
                        );
                    }
                });
            }
        }

        if (settings.dataTypes?.tables !== false) {
            const tables = element.querySelectorAll('table');
            if (tables.length > 0) {
                data.tables = this.extractTables();
            }
        }

        return data;
    }

    /**
     * تحويل URL نسبي إلى مطلق
     */
    getAbsoluteUrl(url) {
        if (!url) return '';
        
        try {
            return new URL(url, window.location.href).href;
        } catch (e) {
            return url;
        }
    }

    /**
     * استخراج بيانات من نماذج الإدخال
     */
    extractForms() {
        const forms = Array.from(document.querySelectorAll('form'));
        
        return forms.map(form => ({
            action: form.action,
            method: form.method,
            name: form.name,
            id: form.id,
            fields: Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
                type: field.type,
                name: field.name,
                id: field.id,
                placeholder: field.placeholder,
                required: field.required,
                value: field.value
            }))
        }));
    }

    /**
     * تصدير البيانات بصيغ مختلفة
     */
    exportData(data, format = 'json') {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);
            
            case 'csv':
                return this.convertToCSV(data);
            
            case 'xml':
                return this.convertToXML(data);
            
            default:
                return JSON.stringify(data, null, 2);
        }
    }

    convertToCSV(data) {
        // Simple CSV conversion for flat data
        if (Array.isArray(data)) {
            if (data.length === 0) return '';
            
            const headers = Object.keys(data[0]);
            const rows = data.map(row => 
                headers.map(header => 
                    JSON.stringify(row[header] || '')
                ).join(',')
            );
            
            return [headers.join(','), ...rows].join('\n');
        }
        
        return '';
    }

    convertToXML(data, rootName = 'data') {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n`;
        
        const objectToXML = (obj, indent = 1) => {
            const indentStr = '  '.repeat(indent);
            let result = '';
            
            for (const [key, value] of Object.entries(obj)) {
                if (value === null || value === undefined) continue;
                
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        result += `${indentStr}<${key}>\n`;
                        if (typeof item === 'object') {
                            result += objectToXML(item, indent + 1);
                        } else {
                            result += `${indentStr}  ${item}\n`;
                        }
                        result += `${indentStr}</${key}>\n`;
                    });
                } else if (typeof value === 'object') {
                    result += `${indentStr}<${key}>\n`;
                    result += objectToXML(value, indent + 1);
                    result += `${indentStr}</${key}>\n`;
                } else {
                    result += `${indentStr}<${key}>${value}</${key}>\n`;
                }
            }
            
            return result;
        };
        
        xml += objectToXML(data);
        xml += `</${rootName}>`;
        
        return xml;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedDataExtractor;
}
