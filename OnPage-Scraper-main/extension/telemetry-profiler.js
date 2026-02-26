/**
 * Telemetry & Profiling System
 * نظام القياسات الذكية وتحليل الأداء
 */

class TelemetryProfiler {
    constructor() {
        // مقاييس الأداء
        this.metrics = {
            extraction: [],
            healing: [],
            analysis: [],
            network: []
        };

        // الأحداث
        this.events = [];

        // حدود التنبيهات
        this.thresholds = {
            extractionTime: 5000,      // 5 ثواني
            healingAttempts: 3,
            memoryUsage: 50 * 1024 * 1024,  // 50 MB
            errorRate: 0.1             // 10%
        };

        // الإحصائيات
        this.stats = {
            totalExtractions: 0,
            successfulExtractions: 0,
            failedExtractions: 0,
            totalHealings: 0,
            successfulHealings: 0,
            averageExtractionTime: 0,
            averageHealingTime: 0
        };

        // المراقبة ليست مفعلة تلقائياً — استخدم startMonitoring() لتفعيلها
        this._perfInterval = null;
        this._memInterval = null;
    }

    /**
     * بدء عملية استخراج
     */
    startExtraction(id, metadata = {}) {
        const extraction = {
            id: id,
            type: 'extraction',
            startTime: performance.now(),
            startMemory: this.getMemoryUsage(),
            metadata: metadata,
            status: 'running'
        };

        this.metrics.extraction.push(extraction);
        this.logEvent('extraction_started', { id, metadata });

        return extraction;
    }

    /**
     * إنهاء عملية استخراج
     */
    endExtraction(id, result = {}) {
        const extraction = this.metrics.extraction.find(e => e.id === id);
        if (!extraction) return;

        extraction.endTime = performance.now();
        extraction.endMemory = this.getMemoryUsage();
        extraction.duration = extraction.endTime - extraction.startTime;
        extraction.memoryDelta = extraction.endMemory - extraction.startMemory;
        extraction.status = result.success ? 'success' : 'failed';
        extraction.result = result;

        // تحديث الإحصائيات
        this.stats.totalExtractions++;
        if (result.success) {
            this.stats.successfulExtractions++;
        } else {
            this.stats.failedExtractions++;
        }

        // حساب المتوسط
        this.stats.averageExtractionTime = this.calculateAverage(
            this.metrics.extraction.map(e => e.duration).filter(d => d)
        );

        // تحقق من التنبيهات
        this.checkThresholds(extraction);

        this.logEvent('extraction_ended', {
            id,
            duration: extraction.duration,
            success: result.success
        });

        return extraction;
    }

    /**
     * بدء عملية إصلاح
     */
    startHealing(selector, metadata = {}) {
        const healing = {
            id: `healing_${Date.now()}`,
            type: 'healing',
            selector: selector,
            startTime: performance.now(),
            metadata: metadata,
            attempts: 0,
            strategies: [],
            status: 'running'
        };

        this.metrics.healing.push(healing);
        this.logEvent('healing_started', { selector, metadata });

        return healing;
    }

    /**
     * تسجيل محاولة إصلاح
     */
    recordHealingAttempt(healingId, strategy, result) {
        const healing = this.metrics.healing.find(h => h.id === healingId);
        if (!healing) return;

        healing.attempts++;
        healing.strategies.push({
            strategy: strategy,
            success: result.success,
            confidence: result.confidence,
            timestamp: performance.now()
        });

        this.logEvent('healing_attempt', {
            healingId,
            strategy,
            success: result.success,
            attempts: healing.attempts
        });
    }

    /**
     * إنهاء عملية إصلاح
     */
    endHealing(healingId, result = {}) {
        const healing = this.metrics.healing.find(h => h.id === healingId);
        if (!healing) return;

        healing.endTime = performance.now();
        healing.duration = healing.endTime - healing.startTime;
        healing.status = result.success ? 'success' : 'failed';
        healing.result = result;

        // تحديث الإحصائيات
        this.stats.totalHealings++;
        if (result.success) {
            this.stats.successfulHealings++;
        }

        // حساب المتوسط
        this.stats.averageHealingTime = this.calculateAverage(
            this.metrics.healing.map(h => h.duration).filter(d => d)
        );

        // تحقق من التنبيهات
        if (healing.attempts > this.thresholds.healingAttempts) {
            this.alert('high_healing_attempts', {
                selector: healing.selector,
                attempts: healing.attempts
            });
        }

        this.logEvent('healing_ended', {
            healingId,
            duration: healing.duration,
            attempts: healing.attempts,
            success: result.success
        });

        return healing;
    }

    /**
     * تسجيل تحليل دلالي
     */
    recordAnalysis(type, duration, result = {}) {
        const analysis = {
            type: type,
            timestamp: performance.now(),
            duration: duration,
            result: result
        };

        this.metrics.analysis.push(analysis);
        this.logEvent('analysis_completed', { type, duration });

        return analysis;
    }

    /**
     * تسجيل طلب شبكة
     */
    recordNetworkRequest(url, method, duration, status) {
        const request = {
            url: url,
            method: method,
            timestamp: performance.now(),
            duration: duration,
            status: status
        };

        this.metrics.network.push(request);
        this.logEvent('network_request', { url, method, duration, status });

        return request;
    }

    /**
     * تسجيل حدث
     */
    logEvent(type, data = {}) {
        const event = {
            type: type,
            timestamp: Date.now(),
            data: data
        };

        this.events.push(event);

        // حد أقصى للأحداث
        if (this.events.length > 1000) {
            this.events = this.events.slice(-500);
        }

        // إرسال للـ console في وضع التطوير
        if (this.isDevelopment()) {
            console.log(`📊 [Telemetry] ${type}:`, data);
        }
    }

    /**
     * التحقق من الحدود
     */
    checkThresholds(metric) {
        // وقت الاستخراج
        if (metric.type === 'extraction' && metric.duration > this.thresholds.extractionTime) {
            this.alert('slow_extraction', {
                id: metric.id,
                duration: metric.duration,
                threshold: this.thresholds.extractionTime
            });
        }

        // استخدام الذاكرة
        if (metric.memoryDelta > this.thresholds.memoryUsage) {
            this.alert('high_memory_usage', {
                id: metric.id,
                memoryDelta: metric.memoryDelta,
                threshold: this.thresholds.memoryUsage
            });
        }

        // معدل الأخطاء
        const errorRate = this.stats.failedExtractions / this.stats.totalExtractions;
        if (errorRate > this.thresholds.errorRate) {
            this.alert('high_error_rate', {
                errorRate: errorRate,
                threshold: this.thresholds.errorRate
            });
        }
    }

    /**
     * إرسال تنبيه
     */
    alert(type, data) {
        console.warn(`⚠️ [Alert] ${type}:`, data);

        this.logEvent('alert', { type, data });

        // يمكن إرسال التنبيه إلى خادم خارجي
        // this.sendToServer('alert', { type, data });
    }

    /**
     * الحصول على استخدام الذاكرة
     */
    getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * حساب المتوسط
     */
    calculateAverage(numbers) {
        if (numbers.length === 0) return 0;
        const sum = numbers.reduce((a, b) => a + b, 0);
        return sum / numbers.length;
    }

    /**
     * بدء المراقبة (optional, opt-in)
     * Call startMonitoring(intervalMs) to enable periodic snapshots.
     * By default no intervals run to avoid wasting CPU in every content script.
     */
    startMonitoring(intervalMs = 30000) {
        this.stopMonitoring(); // clear any previous intervals

        this._perfInterval = setInterval(() => {
            this.collectPerformanceMetrics();
        }, intervalMs);

        this._memInterval = setInterval(() => {
            this.collectMemoryMetrics();
        }, Math.max(intervalMs * 2, 60000));
    }

    /** Stop background monitoring intervals. */
    stopMonitoring() {
        if (this._perfInterval) { clearInterval(this._perfInterval); this._perfInterval = null; }
        if (this._memInterval) { clearInterval(this._memInterval); this._memInterval = null; }
    }


    /**
     * جمع مقاييس الأداء
     */
    collectPerformanceMetrics() {
        const metrics = {
            timestamp: Date.now(),
            memory: this.getMemoryUsage(),
            extractions: {
                total: this.stats.totalExtractions,
                successful: this.stats.successfulExtractions,
                failed: this.stats.failedExtractions,
                successRate: this.stats.totalExtractions > 0
                    ? this.stats.successfulExtractions / this.stats.totalExtractions
                    : 0
            },
            healings: {
                total: this.stats.totalHealings,
                successful: this.stats.successfulHealings,
                successRate: this.stats.totalHealings > 0
                    ? this.stats.successfulHealings / this.stats.totalHealings
                    : 0
            },
            timing: {
                averageExtraction: this.stats.averageExtractionTime,
                averageHealing: this.stats.averageHealingTime
            }
        };

        this.logEvent('performance_snapshot', metrics);

        return metrics;
    }

    /**
     * جمع مقاييس الذاكرة
     */
    collectMemoryMetrics() {
        if (!performance.memory) return null;

        const metrics = {
            timestamp: Date.now(),
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            usagePercentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
        };

        this.logEvent('memory_snapshot', metrics);

        // تنبيه إذا كان الاستخدام عالي
        if (metrics.usagePercentage > 80) {
            this.alert('high_memory_percentage', metrics);
        }

        return metrics;
    }

    /**
     * الحصول على تقرير شامل
     */
    getReport() {
        return {
            timestamp: Date.now(),
            statistics: this.stats,
            metrics: {
                extraction: this.metrics.extraction.slice(-10),
                healing: this.metrics.healing.slice(-10),
                analysis: this.metrics.analysis.slice(-10),
                network: this.metrics.network.slice(-10)
            },
            recentEvents: this.events.slice(-50),
            performance: this.collectPerformanceMetrics(),
            memory: this.collectMemoryMetrics()
        };
    }

    /**
     * الحصول على ملخص
     */
    getSummary() {
        const successRate = this.stats.totalExtractions > 0
            ? (this.stats.successfulExtractions / this.stats.totalExtractions * 100).toFixed(2)
            : 0;

        const healingSuccessRate = this.stats.totalHealings > 0
            ? (this.stats.successfulHealings / this.stats.totalHealings * 100).toFixed(2)
            : 0;

        return {
            extractions: {
                total: this.stats.totalExtractions,
                successful: this.stats.successfulExtractions,
                failed: this.stats.failedExtractions,
                successRate: `${successRate}%`,
                averageTime: `${this.stats.averageExtractionTime.toFixed(2)}ms`
            },
            healings: {
                total: this.stats.totalHealings,
                successful: this.stats.successfulHealings,
                successRate: `${healingSuccessRate}%`,
                averageTime: `${this.stats.averageHealingTime.toFixed(2)}ms`
            },
            memory: this.getMemoryUsage(),
            events: this.events.length
        };
    }

    /**
     * تصدير البيانات
     */
    exportData() {
        const data = {
            report: this.getReport(),
            summary: this.getSummary(),
            fullMetrics: this.metrics,
            fullEvents: this.events
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * مسح البيانات
     */
    clearData() {
        this.metrics = {
            extraction: [],
            healing: [],
            analysis: [],
            network: []
        };
        this.events = [];
        this.stats = {
            totalExtractions: 0,
            successfulExtractions: 0,
            failedExtractions: 0,
            totalHealings: 0,
            successfulHealings: 0,
            averageExtractionTime: 0,
            averageHealingTime: 0
        };
    }

    /**
     * التحقق من وضع التطوير
     */
    isDevelopment() {
        return window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
    }

    /**
     * إرسال البيانات إلى الخادم (اختياري)
     */
    async sendToServer(endpoint, data) {
        try {
            const response = await fetch(`/api/telemetry/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            return response.ok;
        } catch (error) {
            console.warn('Failed to send telemetry data:', error);
            return false;
        }
    }

    /**
     * عرض Dashboard في Console
     */
    showDashboard() {
        console.clear();
        console.log('%c📊 Telemetry Dashboard', 'font-size: 20px; font-weight: bold; color: #3b82f6;');
        console.log('');

        const summary = this.getSummary();

        console.log('%c🎯 Extractions', 'font-size: 16px; font-weight: bold; color: #10b981;');
        console.table(summary.extractions);

        console.log('%c🔧 Healings', 'font-size: 16px; font-weight: bold; color: #f59e0b;');
        console.table(summary.healings);

        console.log('%c💾 Memory', 'font-size: 16px; font-weight: bold; color: #ef4444;');
        console.log(`Used: ${(summary.memory / 1024 / 1024).toFixed(2)} MB`);

        console.log('%c📝 Recent Events', 'font-size: 16px; font-weight: bold; color: #8b5cf6;');
        console.table(this.events.slice(-10));
    }
}

// تصدير للاستخدام العام
window.TelemetryProfiler = TelemetryProfiler;
