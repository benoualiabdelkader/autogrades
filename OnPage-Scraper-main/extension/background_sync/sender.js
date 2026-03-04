/**
 * Data Sender
 * إرسال البيانات للـ backend بشكل آمن مع retry logic
 * 
 * Phase 6: Secure Data Sending
 * Phase 5: Queue management
 * Phase 7: Exponential backoff
 */

class DataSender {
    constructor() {
        this.config = {
            backendURL: '',
            apiEndpoint: '/api/moodle-sync',
            authToken: '',
            maxRetries: 3,
            baseDelay: 1000,     // 1 second base delay
            maxDelay: 30000,     // 30 seconds max delay
            requestTimeout: 15000 // 15 seconds timeout
        };
        this.retryQueue = [];
        this._configLoaded = false;
    }

    /**
     * تحميل الإعدادات من التخزين
     */
    async _ensureConfig() {
        if (this._configLoaded) return;

        return new Promise(resolve => {
            chrome.storage.local.get(['moodle_sender_config'], result => {
                if (result.moodle_sender_config) {
                    this.config = { ...this.config, ...result.moodle_sender_config };
                }
                this._configLoaded = true;
                resolve();
            });
        });
    }

    /**
     * حفظ إعدادات الإرسال
     */
    async saveConfig(config) {
        this.config = { ...this.config, ...config };
        return new Promise(resolve => {
            chrome.storage.local.set({ 'moodle_sender_config': this.config }, resolve);
        });
    }

    /**
     * إرسال البيانات للـ backend
     */
    async send(data) {
        await this._ensureConfig();

        if (!this.config.backendURL) {
            return { success: false, error: 'Backend URL not configured', errorCode: 'NO_URL' };
        }

        const url = `${this.config.backendURL}${this.config.apiEndpoint}`;
        let lastError = null;

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    // Phase 7: Exponential backoff
                    const delay = Math.min(
                        this.config.baseDelay * Math.pow(2, attempt - 1),
                        this.config.maxDelay
                    );
                    console.log(`[Sender] Retry ${attempt}/${this.config.maxRetries} after ${delay}ms`);
                    await this._delay(delay);
                }

                const result = await this._doSend(url, data);
                if (result.success) {
                    console.log('[Sender] Data sent successfully');
                    this._logSuccess(data);
                    return result;
                }

                lastError = result.error;

                // Don't retry on auth errors
                if (result.statusCode === 401 || result.statusCode === 403) {
                    this._logError('AUTH_ERROR', result.error);
                    return result;
                }

            } catch (error) {
                lastError = error.message;
                this._logError('SEND_ERROR', error.message, attempt);
            }
        }

        // All retries failed
        return { 
            success: false, 
            error: `All ${this.config.maxRetries + 1} attempts failed: ${lastError}`,
            errorCode: 'MAX_RETRIES_EXCEEDED'
        };
    }

    /**
     * تنفيذ الإرسال الفعلي
     */
    async _doSend(url, data) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

        try {
            const headers = {
                'Content-Type': 'application/json',
                'X-Source': 'MoodleSync-Extension',
                'X-Timestamp': new Date().toISOString()
            };

            // Phase 6: Authorization token
            if (this.config.authToken) {
                headers['Authorization'] = `Bearer ${this.config.authToken}`;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(data),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`,
                    statusCode: response.status,
                    body: errorText
                };
            }

            const result = await response.json().catch(() => ({}));
            return { success: true, data: result };

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                return { success: false, error: 'Request timeout', errorCode: 'TIMEOUT' };
            }

            throw error;
        }
    }

    /**
     * Phase 5: إضافة البيانات لقائمة الانتظار (عند فشل الإرسال)
     */
    async queueForRetry(data) {
        return new Promise(resolve => {
            chrome.storage.local.get(['moodle_send_queue'], result => {
                const queue = result.moodle_send_queue || [];

                // Limit queue size (max 10 entries)
                if (queue.length >= 10) {
                    queue.shift(); // Remove oldest
                }

                queue.push({
                    data,
                    queuedAt: new Date().toISOString(),
                    attempts: 0
                });

                chrome.storage.local.set({ 'moodle_send_queue': queue }, resolve);
            });
        });

        console.log('[Sender] Data queued for retry');
    }

    /**
     * Phase 5: معالجة قائمة الانتظار
     */
    async processQueue() {
        await this._ensureConfig();

        return new Promise(resolve => {
            chrome.storage.local.get(['moodle_send_queue'], async (result) => {
                const queue = result.moodle_send_queue || [];
                if (queue.length === 0) {
                    resolve({ processed: 0, succeeded: 0, failed: 0 });
                    return;
                }

                console.log(`[Sender] Processing queue: ${queue.length} items`);

                const remaining = [];
                let succeeded = 0;
                let failed = 0;

                for (const item of queue) {
                    const sendResult = await this.send(item.data);
                    if (sendResult.success) {
                        succeeded++;
                    } else {
                        item.attempts++;
                        if (item.attempts < 5) {
                            remaining.push(item);
                        } else {
                            failed++;
                            console.warn('[Sender] Queue item dropped after 5 attempts');
                        }
                    }

                    // Delay between queue items
                    await this._delay(1000);
                }

                chrome.storage.local.set({ 'moodle_send_queue': remaining }, () => {
                    resolve({
                        processed: queue.length,
                        succeeded,
                        failed,
                        remaining: remaining.length
                    });
                });
            });
        });
    }

    /**
     * تسجيل نجاح الإرسال
     */
    _logSuccess(data) {
        this._addLog({
            type: 'success',
            timestamp: new Date().toISOString(),
            coursesCount: data.courses?.length || 0,
            assignmentsCount: data.assignments?.length || 0,
            gradesCount: data.grades?.length || 0
        });
    }

    /**
     * تسجيل خطأ
     */
    _logError(code, message, attempt = 0) {
        this._addLog({
            type: 'error',
            code,
            message,
            attempt,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * إضافة سجل
     */
    _addLog(entry) {
        chrome.storage.local.get(['moodle_sender_logs'], result => {
            const logs = result.moodle_sender_logs || [];
            logs.push(entry);

            // Keep last 50 logs
            while (logs.length > 50) logs.shift();

            chrome.storage.local.set({ 'moodle_sender_logs': logs });
        });
    }

    /**
     * الحصول على السجلات
     */
    async getLogs() {
        return new Promise(resolve => {
            chrome.storage.local.get(['moodle_sender_logs'], result => {
                resolve(result.moodle_sender_logs || []);
            });
        });
    }

    /**
     * مسح السجلات
     */
    async clearLogs() {
        return new Promise(resolve => {
            chrome.storage.local.remove(['moodle_sender_logs'], resolve);
        });
    }

    /**
     * الحصول على حجم القائمة
     */
    async getQueueSize() {
        return new Promise(resolve => {
            chrome.storage.local.get(['moodle_send_queue'], result => {
                resolve((result.moodle_send_queue || []).length);
            });
        });
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export
if (typeof self !== 'undefined') {
    self.DataSender = DataSender;
}
if (typeof window !== 'undefined') {
    window.DataSender = DataSender;
}
