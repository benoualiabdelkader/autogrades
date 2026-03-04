/**
 * Sync Engine - مدير المزامنة الدورية
 * 
 * Phase 2: Background Sync
 * Phase 7: Performance Optimization
 * 
 * يعمل في background service worker
 * يستخدم chrome.alarms للمزامنة الدورية
 * يتواصل مع crawler لجلب الصفحات
 */

class SyncEngine {
    constructor() {
        this.isRunning = false;
        this.lastSyncTime = null;
        this.syncIntervalMinutes = 10;
        this.config = {
            enabled: true,
            intervalMinutes: 10,
            syncOnStartup: true,
            maxRetries: 3
        };
    }

    /**
     * تهيئة المحرك وبدء المزامنة الدورية
     */
    async init() {
        // تحميل الإعدادات
        await this._loadConfig();

        // إعداد المنبه الدوري
        if (this.config.enabled) {
            this._setupAlarm();
        }

        // الاستماع للمنبهات
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'moodlePeriodicSync') {
                this.startSync();
            }
        });

        // المزامنة عند بدء التشغيل
        if (this.config.syncOnStartup) {
            // Delay 5s to let the browser settle
            setTimeout(() => this.startSync(), 5000);
        }

        console.log('[SyncEngine] Initialized with interval:', this.config.intervalMinutes, 'min');
    }

    /**
     * إعداد المنبه الدوري
     */
    _setupAlarm() {
        chrome.alarms.create('moodlePeriodicSync', {
            delayInMinutes: 1,
            periodInMinutes: this.config.intervalMinutes
        });
        console.log('[SyncEngine] Alarm set for every', this.config.intervalMinutes, 'minutes');
    }

    /**
     * إيقاف المزامنة الدورية
     */
    async stopSync() {
        await chrome.alarms.clear('moodlePeriodicSync');
        this.isRunning = false;
        console.log('[SyncEngine] Sync stopped');
    }

    /**
     * بدء دورة مزامنة كاملة
     */
    async startSync() {
        if (this.isRunning) {
            console.log('[SyncEngine] Sync already running, skipping');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        console.log('[SyncEngine] Starting sync cycle...');
        this._updateStatus('syncing', 'جاري المزامنة...');

        try {
            // Step 1: Get Moodle base URL from storage
            const moodleURL = await this._getMoodleURL();
            if (!moodleURL) {
                console.warn('[SyncEngine] No Moodle URL configured');
                this._updateStatus('error', 'لم يتم تحديد عنوان Moodle');
                return;
            }

            // Step 2: Fetch dashboard to get course list
            const crawler = new (self.MoodleCrawler || window.MoodleCrawler)(moodleURL);
            
            const dashboardData = await crawler.fetchDashboard();
            if (!dashboardData.success) {
                console.warn('[SyncEngine] Failed to fetch dashboard:', dashboardData.error);
                this._updateStatus('error', 'فشل في جلب لوحة التحكم');
                return;
            }

            // Step 3: Build list of courses to sync
            const courses = dashboardData.data?.courses || [];
            console.log(`[SyncEngine] Found ${courses.length} courses`);

            // Step 4: Fetch each course + its assignments/grades
            const allData = {
                user_id: dashboardData.data?.user?.id || null,
                courses: [],
                assignments: [],
                grades: [],
                synced_at: new Date().toISOString()
            };

            // Merge dashboard data
            allData.courses = courses.map(c => ({
                course_id: c.course_id,
                title: c.title,
                teachers: c.teachers || [],
                url: c.url
            }));

            // Phase 7: Batch fetch - 2 courses at a time with delay
            const batchSize = 2;
            for (let i = 0; i < courses.length; i += batchSize) {
                const batch = courses.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (course) => {
                    try {
                        // Fetch course page
                        const courseData = await crawler.fetchCoursePage(course.url || course.course_id);
                        if (courseData.success && courseData.data) {
                            // Collect assignments
                            const assignments = courseData.data.assignments || [];
                            const quizzes = courseData.data.quizzes || [];
                            
                            [...assignments, ...quizzes].forEach(a => {
                                allData.assignments.push({
                                    assignment_id: a.activity_id,
                                    course_id: course.course_id,
                                    title: a.title,
                                    url: a.url,
                                    type: a.type || 'assign',
                                    due_date: null,
                                    status: a.completion === 'completed' ? 'submitted' : 'not_submitted',
                                    grade: null
                                });
                            });
                        }

                        // Fetch grades for this course
                        const gradesData = await crawler.fetchGradesPage(course.course_id);
                        if (gradesData.success && gradesData.data?.student) {
                            gradesData.data.student.forEach(g => {
                                allData.grades.push({
                                    course_id: course.course_id,
                                    item_name: g.item_name,
                                    grade: g.grade,
                                    percentage: g.percentage
                                });
                            });
                        }
                    } catch (err) {
                        console.warn(`[SyncEngine] Error syncing course ${course.course_id}:`, err);
                    }
                }));

                // Phase 7: Delay between batches
                if (i + batchSize < courses.length) {
                    await this._delay(800);
                }
            }

            // Step 5: Delta detection - only send if changed
            const delta = new (self.DeltaDetector || window.DeltaDetector)();
            const hasChanged = await delta.hasChanged(allData);

            if (hasChanged) {
                // Step 6: Send to backend
                const sender = new (self.DataSender || window.DataSender)();
                const sendResult = await sender.send(allData);

                if (sendResult.success) {
                    await delta.saveHash(allData);
                    this._updateStatus('success', `مزامنة ناجحة - ${courses.length} دورة`);
                    console.log('[SyncEngine] Sync completed and data sent successfully');
                } else {
                    // Queue for retry
                    await sender.queueForRetry(allData);
                    this._updateStatus('warning', 'تم حفظ البيانات - سيتم إعادة الإرسال');
                }
            } else {
                this._updateStatus('success', 'لا توجد تغييرات');
                console.log('[SyncEngine] No changes detected, skipping send');
            }

            // Save locally regardless
            await this._saveLocalData(allData);

            this.lastSyncTime = Date.now();
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[SyncEngine] Sync cycle completed in ${duration}s`);

        } catch (error) {
            console.error('[SyncEngine] Sync failed:', error);
            this._updateStatus('error', `خطأ في المزامنة: ${error.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * تحديث حالة المزامنة
     */
    _updateStatus(status, message) {
        chrome.storage.local.set({
            'moodle_sync_status': {
                status,
                message,
                timestamp: new Date().toISOString()
            }
        });

        // إرسال إشعار للـ popup إن كان مفتوحاً
        chrome.runtime.sendMessage({
            action: 'syncStatusUpdate',
            status,
            message
        }).catch(() => { /* popup not open */ });
    }

    /**
     * الحصول على عنوان Moodle المحفوظ
     */
    async _getMoodleURL() {
        return new Promise(resolve => {
            chrome.storage.local.get(['moodle_base_url'], result => {
                resolve(result.moodle_base_url || null);
            });
        });
    }

    /**
     * حفظ البيانات محلياً
     */
    async _saveLocalData(data) {
        return new Promise(resolve => {
            chrome.storage.local.set({
                'moodle_normalized_data': data,
                'moodle_last_sync': new Date().toISOString()
            }, resolve);
        });
    }

    /**
     * تحميل الإعدادات
     */
    async _loadConfig() {
        return new Promise(resolve => {
            chrome.storage.local.get(['moodle_sync_config'], result => {
                if (result.moodle_sync_config) {
                    this.config = { ...this.config, ...result.moodle_sync_config };
                }
                resolve();
            });
        });
    }

    /**
     * حفظ الإعدادات
     */
    async saveConfig(config) {
        this.config = { ...this.config, ...config };
        return new Promise(resolve => {
            chrome.storage.local.set({ 'moodle_sync_config': this.config }, () => {
                // Update alarm
                if (this.config.enabled) {
                    this._setupAlarm();
                } else {
                    this.stopSync();
                }
                resolve();
            });
        });
    }

    /**
     * تأخير
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * حالة المزامنة الحالية
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastSyncTime: this.lastSyncTime,
            config: this.config
        };
    }
}

// Export for service worker
if (typeof self !== 'undefined') {
    self.SyncEngine = SyncEngine;
}
if (typeof window !== 'undefined') {
    window.SyncEngine = SyncEngine;
}
