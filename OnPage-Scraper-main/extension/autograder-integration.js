/**
 * AutoGrader Integration Module v2.1
 * Handles communication with the AutoGrader dashboard API.
 * Improvements:
 *  - URL validation before requests
 *  - Structured error codes
 *  - Configurable API endpoint
 *  - CSV export helper
 *  - Richer previewData supporting both data shapes
 */

class AutoGraderIntegration {
    constructor() {
        this.autoGraderURL = 'http://localhost:5173';
        this.apiEndpoint = '/api/scraper-data';
        this.isConnected = false;
        this._requestTimeout = 10000; // 10 s per request
        this._version = '2.1.0';
    }

    /** Allow callers to adjust the per-request timeout at runtime. */
    setRequestTimeout(ms) {
        if (typeof ms === 'number' && ms > 0) {
            this._requestTimeout = ms;
        }
    }

    // ─── Connection ──────────────────────────────────────────────────

    /**
     * Verify that AutoGrader is reachable.
     * Returns true/false; never throws.
     */
    async checkConnection() {
        if (!this._isValidURL(this.autoGraderURL)) {
            this.isConnected = false;
            return false;
        }

        try {
            const response = await this._fetch(`${this.autoGraderURL}/api/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            this.isConnected = response.ok;
            return this.isConnected;
        } catch (error) {
            console.warn('[AutoGrader] Connection check failed:', error.message);
            this.isConnected = false;
            return false;
        }
    }

    // ─── Send Data ───────────────────────────────────────────────────

    /**
     * Send extracted page data to AutoGrader Dashboard.
     * @param {object} extractedData
     * @returns {{ success: boolean, message: string, data?: object, errorCode?: string }}
     */
    async sendToAutoGrader(extractedData) {
        if (!this._isValidURL(this.autoGraderURL)) {
            return {
                success: false,
                message: 'عنوان AutoGrader غير صالح. تحقق من الإعدادات.',
                errorCode: 'INVALID_URL'
            };
        }

        try {
            const formattedData = this.formatForAutoGrader(extractedData);

            const response = await this._fetch(`${this.autoGraderURL}${this.apiEndpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Source': 'OnPage-Scraper-Extension',
                    'X-Version': this._version
                },
                body: JSON.stringify(formattedData)
            });

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw Object.assign(
                    new Error(`HTTP ${response.status}: ${response.statusText}`),
                    { errorCode: `HTTP_${response.status}`, body: errText }
                );
            }

            const result = await response.json();
            return { success: true, message: 'تم إرسال البيانات بنجاح إلى AutoGrader', data: result };

        } catch (error) {
            console.error('[AutoGrader] Send failed:', error);
            return {
                success: false,
                message: `فشل الإرسال: ${error.message}`,
                errorCode: error.errorCode || 'NETWORK_ERROR'
            };
        }
    }

    // ─── Assignments (Grade Batch) ───────────────────────────────────

    /**
     * Send extracted data as assignments for AI grading.
     * @param {object} extractedData
     * @param {{ rubricCriteria?: string, assignmentPrefix?: string }} options
     */
    async sendAsAssignments(extractedData, options = {}) {
        const {
            rubricCriteria = 'الوضوح، الدقة، الاكتمال',
            assignmentPrefix = 'web_assignment'
        } = options;

        if (!this._isValidURL(this.autoGraderURL)) {
            return { success: false, message: 'عنوان AutoGrader غير صالح', errorCode: 'INVALID_URL' };
        }

        try {
            const assignments = this.convertToAssignments(extractedData, rubricCriteria, assignmentPrefix);

            const response = await this._fetch(`${this.autoGraderURL}/api/grade-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Source': 'OnPage-Scraper-Extension'
                },
                body: JSON.stringify({
                    assignments,
                    options: { maxConcurrent: 3, delayBetweenRequests: 2 }
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

            const result = await response.json();
            return { success: true, message: 'تم إرسال الواجبات للتقييم بنجاح', data: result };

        } catch (error) {
            console.error('[AutoGrader] Grade batch failed:', error);
            return { success: false, message: `فشل إرسال الواجبات: ${error.message}` };
        }
    }

    // ─── Data Formatting ────────────────────────────────────────────

    /**
     * Normalise extracted data into the AutoGrader wire format.
     * Supports both classic { fields } and semantic { extractedData } shapes.
     */
    formatForAutoGrader(extractedData) {
        const fieldsObject = this._resolveFieldsObject(extractedData);
        const fieldNames = Object.keys(fieldsObject);

        const totalItemsFromFields = fieldNames.reduce((sum, name) => {
            const items = fieldsObject[name];
            return sum + (Array.isArray(items) ? items.length : 0);
        }, 0);

        return {
            source: 'web-scraper',
            timestamp: extractedData?.timestamp || new Date().toISOString(),
            url: extractedData?.url || (typeof window !== 'undefined' ? window.location.href : ''),
            pageTitle: extractedData?.title || (typeof document !== 'undefined' ? document.title : ''),
            data: this.transformFields(fieldsObject),
            statistics: {
                totalItems: extractedData?.totalItems ?? totalItemsFromFields,
                totalFields: extractedData?.summary?.totalFields ?? fieldNames.length,
                fieldCounts: extractedData?.summary?.fieldCounts || {}
            },
            metadata: {
                extractionMethod: 'smart-dom-extraction',
                extensionVersion: this._version,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
                screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '',
                language: typeof navigator !== 'undefined' ? navigator.language : ''
            }
        };
    }

    /**
     * Flatten fields object into an array of { id, fieldName, value, type, metadata }.
     */
    transformFields(fields) {
        if (!fields || typeof fields !== 'object') return [];

        const transformed = [];
        Object.keys(fields).forEach(fieldName => {
            const items = fields[fieldName];
            if (!Array.isArray(items)) return;
            items.forEach((item, index) => {
                transformed.push({
                    id: `${fieldName}_${index}`,
                    fieldName,
                    value: item.value,
                    type: item.type,
                    metadata: item.metadata || {}
                });
            });
        });
        return transformed;
    }

    convertToAssignments(extractedData, rubricCriteria, assignmentPrefix) {
        const assignments = [];
        const fieldsObject = this._resolveFieldsObject(extractedData);

        Object.keys(fieldsObject).forEach((fieldName, fi) => {
            const items = fieldsObject[fieldName];
            if (!Array.isArray(items)) return;
            items.forEach((item, ii) => {
                assignments.push({
                    studentId: `student_${fi}_${ii}`,
                    assignmentId: `${assignmentPrefix}_${fi}_${ii}`,
                    assignmentText: item.value || '',
                    rubricCriteria
                });
            });
        });

        return assignments;
    }

    // ─── Local Storage ──────────────────────────────────────────────

    async saveLocally(extractedData) {
        try {
            await chrome.storage.local.set({
                'autograder_last_extraction': {
                    ...extractedData,
                    savedAt: new Date().toISOString(),
                    version: this._version
                }
            });
            return { success: true, message: 'تم حفظ البيانات محلياً' };
        } catch (error) {
            console.error('[AutoGrader] Local save failed:', error);
            return { success: false, message: `فشل الحفظ المحلي: ${error.message}` };
        }
    }

    async getLastSavedData() {
        try {
            const result = await chrome.storage.local.get(['autograder_last_extraction']);
            return result.autograder_last_extraction || null;
        } catch (error) {
            console.error('[AutoGrader] Retrieve failed:', error);
            return null;
        }
    }

    // ─── Export ─────────────────────────────────────────────────────

    exportAsJSON(extractedData, filename = null) {
        const jsonString = JSON.stringify(extractedData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `autograder_data_${Date.now()}.json`;
        // Must be in the DOM for Firefox + some Chrome contexts
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true, message: 'تم تصدير البيانات كـ JSON' };
    }

    /**
     * Export extracted data as a UTF-8 BOM CSV file.
     * @param {object} extractedData
     * @param {string|null} filename
     */
    exportAsCSV(extractedData, filename = null) {
        try {
            const fieldsObj = this._resolveFieldsObject(extractedData);
            const rows = [['Field', 'Value', 'Type']];

            Object.entries(fieldsObj).forEach(([field, items]) => {
                if (!Array.isArray(items)) return;
                items.forEach(item => {
                    const val = String(item.value ?? '').replace(/"/g, '""');
                    rows.push([field, `"${val}"`, item.type || 'text']);
                });
            });

            const csv = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = filename || `autograder_data_${Date.now()}.csv`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return { success: true, message: 'تم تصدير البيانات كـ CSV' };
        } catch (error) {
            console.error('[AutoGrader] CSV export error:', error);
            return { success: false, message: `فشل تصدير CSV: ${error.message}` };
        }
    }

    // ─── Preview ────────────────────────────────────────────────────

    previewData(extractedData) {
        if (!extractedData) return { summary: {}, fields: {}, sampleData: [] };

        const fieldsObject = this._resolveFieldsObject(extractedData);
        const preview = {
            summary: {
                url: extractedData.url,
                title: extractedData.title,
                timestamp: extractedData.timestamp,
                totalItems: extractedData.totalItems ?? Object.values(fieldsObject).flat().length,
                totalFields: extractedData.summary?.totalFields ?? Object.keys(fieldsObject).length
            },
            fields: {},
            sampleData: []
        };

        Object.keys(fieldsObject).forEach(fieldName => {
            const items = fieldsObject[fieldName];
            if (!Array.isArray(items)) return;

            preview.fields[fieldName] = {
                count: items.length,
                types: [...new Set(items.map(i => i.type).filter(Boolean))]
            };

            preview.sampleData.push({
                fieldName,
                samples: items.slice(0, 3).map(item => ({
                    value: String(item.value || '').substring(0, 100),
                    type: item.type
                }))
            });
        });

        return preview;
    }

    // ─── Settings ───────────────────────────────────────────────────

    setAutoGraderURL(url) {
        this.autoGraderURL = url;
        chrome.storage.local.set({ 'autograder_url': url });
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['autograder_url']);
            if (result.autograder_url) this.autoGraderURL = result.autograder_url;
            return true;
        } catch (error) {
            console.error('[AutoGrader] Load settings failed:', error);
            return false;
        }
    }

    // ─── Private Helpers ────────────────────────────────────────────

    /**
     * Normalise the various data shapes into a flat fields object.
     */
    _resolveFieldsObject(data) {
        if (!data) return {};
        // Classic shape: { fields: {...} }
        if (data.fields && typeof data.fields === 'object') return data.fields;
        // Semantic shape: { extractedData: {...} }
        if (data.extractedData && typeof data.extractedData === 'object') return data.extractedData;
        // Smart extractor: { dataStructure: { flatFields, smartLists } }
        if (data.dataStructure?.flatFields) {
            return { ...data.dataStructure.flatFields, ...data.dataStructure.smartLists };
        }
        return {};
    }

    /**
     * fetch() wrapper with a configurable timeout.
     */
    _fetch(url, options = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this._requestTimeout);
        return fetch(url, { ...options, signal: controller.signal })
            .finally(() => clearTimeout(timer));
    }

    /**
     * Simple URL validator (http / https scheme required).
     */
    _isValidURL(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }
}

// Export for global use
window.AutoGraderIntegration = AutoGraderIntegration;
