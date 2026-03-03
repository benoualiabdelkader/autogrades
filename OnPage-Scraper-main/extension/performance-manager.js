/**
 * Rate Limiter & Performance Manager
 * نظام إدارة السرعة والأداء
 */

class RateLimiter {
    constructor(options = {}) {
        this.requestsPerSecond = options.requestsPerSecond || 2;
        this.delayBetweenRequests = options.delayBetweenRequests || 500;
        this.maxConcurrent = options.maxConcurrent || 3;
        this.queue = [];
        this.activeRequests = 0;
        this.requestHistory = [];
        this.enabled = options.enabled !== false;
    }

    /**
     * إضافة طلب إلى الطابور
     */
    async enqueue(fn) {
        if (!this.enabled) {
            return fn();
        }

        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * معالجة الطابور
     */
    async processQueue() {
        if (this.queue.length === 0 || this.activeRequests >= this.maxConcurrent) {
            return;
        }

        // Check rate limit
        const now = Date.now();
        const recentRequests = this.requestHistory.filter(
            time => now - time < 1000
        );

        if (recentRequests.length >= this.requestsPerSecond) {
            // Wait before processing
            const oldestRequest = Math.min(...recentRequests);
            const waitTime = 1000 - (now - oldestRequest);
            
            setTimeout(() => this.processQueue(), waitTime);
            return;
        }

        // Process next request
        const { fn, resolve, reject } = this.queue.shift();
        this.activeRequests++;
        this.requestHistory.push(now);

        // Clean old history
        this.requestHistory = this.requestHistory.filter(
            time => now - time < 5000
        );

        try {
            const result = await fn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.activeRequests--;
            
            // Add delay before next request
            if (this.delayBetweenRequests > 0) {
                await this.sleep(this.delayBetweenRequests);
            }

            this.processQueue();
        }
    }

    /**
     * انتظار
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * الحصول على إحصائيات
     */
    getStats() {
        return {
            queueLength: this.queue.length,
            activeRequests: this.activeRequests,
            requestsLastSecond: this.requestHistory.filter(
                time => Date.now() - time < 1000
            ).length,
            totalProcessed: this.requestHistory.length
        };
    }

    /**
     * مسح الطابور
     */
    clear() {
        this.queue = [];
        this.requestHistory = [];
    }

    /**
     * تحديث الإعدادات
     */
    updateSettings(options) {
        if (options.requestsPerSecond !== undefined) {
            this.requestsPerSecond = options.requestsPerSecond;
        }
        if (options.delayBetweenRequests !== undefined) {
            this.delayBetweenRequests = options.delayBetweenRequests;
        }
        if (options.maxConcurrent !== undefined) {
            this.maxConcurrent = options.maxConcurrent;
        }
        if (options.enabled !== undefined) {
            this.enabled = options.enabled;
        }
    }
}

/**
 * Performance Monitor
 * مراقب الأداء
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            requests: [],
            memory: [],
            timing: {},
            errors: []
        };
        this.startTime = Date.now();
    }

    /**
     * تسجيل طلب
     */
    logRequest(url, duration, status, size = 0) {
        this.metrics.requests.push({
            url,
            duration,
            status,
            size,
            timestamp: Date.now()
        });

        // Keep only last 100 requests
        if (this.metrics.requests.length > 100) {
            this.metrics.requests = this.metrics.requests.slice(-100);
        }
    }

    /**
     * تسجيل خطأ
     */
    logError(error, context = '') {
        this.metrics.errors.push({
            message: error.message,
            context,
            timestamp: Date.now()
        });
    }

    /**
     * قياس وقت التنفيذ
     */
    startTiming(label) {
        this.metrics.timing[label] = {
            start: performance.now(),
            end: null,
            duration: null
        };
    }

    endTiming(label) {
        if (this.metrics.timing[label]) {
            this.metrics.timing[label].end = performance.now();
            this.metrics.timing[label].duration = 
                this.metrics.timing[label].end - this.metrics.timing[label].start;
        }
    }

    /**
     * قياس الذاكرة
     */
    measureMemory() {
        if (performance.memory) {
            this.metrics.memory.push({
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            });

            // Keep only last 50 measurements
            if (this.metrics.memory.length > 50) {
                this.metrics.memory = this.metrics.memory.slice(-50);
            }
        }
    }

    /**
     * الحصول على ملخص الأداء
     */
    getSummary() {
        const now = Date.now();
        const uptime = now - this.startTime;

        const summary = {
            uptime: uptime,
            totalRequests: this.metrics.requests.length,
            totalErrors: this.metrics.errors.length,
            averageRequestTime: 0,
            requestsPerMinute: 0,
            slowestRequests: [],
            recentErrors: this.metrics.errors.slice(-5)
        };

        // Calculate averages
        if (this.metrics.requests.length > 0) {
            const totalDuration = this.metrics.requests.reduce(
                (sum, req) => sum + req.duration, 0
            );
            summary.averageRequestTime = totalDuration / this.metrics.requests.length;

            // Requests per minute
            const recentRequests = this.metrics.requests.filter(
                req => now - req.timestamp < 60000
            );
            summary.requestsPerMinute = recentRequests.length;

            // Slowest requests
            summary.slowestRequests = [...this.metrics.requests]
                .sort((a, b) => b.duration - a.duration)
                .slice(0, 5)
                .map(req => ({
                    url: req.url,
                    duration: req.duration
                }));
        }

        // Memory stats
        if (this.metrics.memory.length > 0) {
            const latestMemory = this.metrics.memory[this.metrics.memory.length - 1];
            summary.memory = {
                used: Math.round(latestMemory.usedJSHeapSize / 1024 / 1024) + ' MB',
                total: Math.round(latestMemory.totalJSHeapSize / 1024 / 1024) + ' MB',
                limit: Math.round(latestMemory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
            };
        }

        // Timing summary
        summary.timings = {};
        for (const [label, timing] of Object.entries(this.metrics.timing)) {
            if (timing.duration !== null) {
                summary.timings[label] = Math.round(timing.duration) + ' ms';
            }
        }

        return summary;
    }

    /**
     * مسح جميع المقاييس
     */
    clear() {
        this.metrics = {
            requests: [],
            memory: [],
            timing: {},
            errors: []
        };
        this.startTime = Date.now();
    }

    /**
     * تصدير المقاييس
     */
    export() {
        return {
            summary: this.getSummary(),
            raw: this.metrics
        };
    }
}

/**
 * Worker Pool Manager
 * مدير تعدد الخيوط
 */
class WorkerPoolManager {
    constructor(maxWorkers = 4) {
        this.maxWorkers = maxWorkers;
        this.workers = [];
        this.taskQueue = [];
        this.activeWorkers = 0;
    }

    /**
     * تنفيذ مهمة في worker
     */
    async executeTask(task) {
        return new Promise((resolve, reject) => {
            this.taskQueue.push({ task, resolve, reject });
            this.processTasks();
        });
    }

    /**
     * معالجة المهام
     */
    async processTasks() {
        if (this.taskQueue.length === 0 || this.activeWorkers >= this.maxWorkers) {
            return;
        }

        const { task, resolve, reject } = this.taskQueue.shift();
        this.activeWorkers++;

        try {
            // Since we can't actually create Web Workers in content script,
            // we'll simulate async execution with Promise
            const result = await this.simulateWorker(task);
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.activeWorkers--;
            this.processTasks();
        }
    }

    /**
     * محاكاة worker (بما أن Web Workers لا تعمل في content scripts)
     */
    async simulateWorker(task) {
        // Use setTimeout to simulate async execution
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    const result = typeof task === 'function' ? task() : task;
                    resolve(result);
                } catch (error) {
                    resolve({ error: error.message });
                }
            }, 0);
        });
    }

    /**
     * معالجة المهام بالتوازي
     */
    async parallel(tasks) {
        const promises = tasks.map(task => this.executeTask(task));
        return Promise.all(promises);
    }

    /**
     * معالجة المهام بالدفعات
     */
    async batch(tasks, batchSize = null) {
        const size = batchSize || this.maxWorkers;
        const results = [];

        for (let i = 0; i < tasks.length; i += size) {
            const batch = tasks.slice(i, i + size);
            const batchResults = await this.parallel(batch);
            results.push(...batchResults);
        }

        return results;
    }

    /**
     * الحصول على الإحصائيات
     */
    getStats() {
        return {
            maxWorkers: this.maxWorkers,
            activeWorkers: this.activeWorkers,
            queuedTasks: this.taskQueue.length
        };
    }
}

/**
 * Cache Manager
 * مدير التخزين المؤقت
 */
class CacheManager {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * حفظ في الكاش
     */
    set(key, value, ttl = 3600000) { // Default 1 hour
        if (this.cache.size >= this.maxSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl
        });
    }

    /**
     * الحصول من الكاش
     */
    get(key) {
        const entry = this.cache.get(key);

        if (!entry) {
            this.misses++;
            return null;
        }

        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }

        this.hits++;
        return entry.value;
    }

    /**
     * حذف من الكاش
     */
    delete(key) {
        return this.cache.delete(key);
    }

    /**
     * مسح الكاش
     */
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * الحصول على الإحصائيات
     */
    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? (this.hits / total * 100).toFixed(2) : 0;

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.hits,
            misses: this.misses,
            hitRate: hitRate + '%'
        };
    }

    /**
     * مسح البيانات المنتهية
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        RateLimiter,
        PerformanceMonitor,
        WorkerPoolManager,
        CacheManager
    };
}
