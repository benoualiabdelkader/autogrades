/**
 * Moodle Sync Background Service Worker
 * يدمج كل مكونات الخلفية: SyncEngine, Crawler, Delta, Sender
 * 
 * هذا هو الملف الرئيسي لـ service worker
 * يتم تحميله جنباً إلى جنب مع background.js الأصلي
 */

// Import modules (service worker context)
try {
    importScripts(
        'content/strategies/dashboard.js',
        'content/strategies/course.js',
        'content/strategies/assignment.js',
        'content/strategies/grades.js',
        'background_sync/crawler.js',
        'background_sync/delta.js',
        'background_sync/sender.js',
        'background_sync/syncEngine.js'
    );
} catch (e) {
    console.warn('[MoodleBG] Some imports failed (may not be available yet):', e.message);
}

// ─── Main Sync Controller ───────────────────────────────────────

class MoodleSyncController {
    constructor() {
        this.syncEngine = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        this.syncEngine = new SyncEngine();
        await this.syncEngine.init();

        // Listen for messages from popup and content scripts
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this._handleMessage(message, sender, sendResponse);
            return true; // async response
        });

        // Process retry queue periodically
        chrome.alarms.create('processRetryQueue', { periodInMinutes: 5 });
        chrome.alarms.onAlarm.addListener(alarm => {
            if (alarm.name === 'processRetryQueue') {
                this._processRetryQueue();
            }
        });

        this.initialized = true;
        console.log('[MoodleSyncController] Initialized');
    }

    async _handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                // ─── Sync Control ─────────────────────────

                case 'moodle_startSync':
                    await this.syncEngine.startSync();
                    sendResponse({ success: true });
                    break;

                case 'moodle_stopSync':
                    await this.syncEngine.stopSync();
                    sendResponse({ success: true });
                    break;

                case 'moodle_getSyncStatus':
                    sendResponse({ success: true, data: this.syncEngine.getStatus() });
                    break;

                case 'moodle_setSyncConfig':
                    await this.syncEngine.saveConfig(message.config);
                    sendResponse({ success: true });
                    break;

                // ─── Data Access ──────────────────────────

                case 'moodle_getData':
                    chrome.storage.local.get(['moodle_normalized_data'], result => {
                        sendResponse({ success: true, data: result.moodle_normalized_data || null });
                    });
                    return; // async

                case 'moodle_clearData':
                    await chrome.storage.local.remove([
                        'moodle_normalized_data',
                        'moodle_data_hashes',
                        'moodle_send_queue',
                        'moodle_sender_logs'
                    ]);
                    sendResponse({ success: true });
                    break;

                // ─── URL Config ────────────────────────────

                case 'moodle_setBaseURL':
                    await chrome.storage.local.set({ 'moodle_base_url': message.url });
                    sendResponse({ success: true });
                    break;

                case 'moodle_getBaseURL':
                    chrome.storage.local.get(['moodle_base_url'], result => {
                        sendResponse({ success: true, url: result.moodle_base_url || null });
                    });
                    return; // async

                // ─── Sender Config ─────────────────────────

                case 'moodle_setSenderConfig':
                    const sender = new DataSender();
                    await sender.saveConfig(message.config);
                    sendResponse({ success: true });
                    break;

                case 'moodle_getSenderLogs':
                    const logSender = new DataSender();
                    const logs = await logSender.getLogs();
                    sendResponse({ success: true, logs });
                    break;

                case 'moodle_getQueueSize':
                    const qSender = new DataSender();
                    const queueSize = await qSender.getQueueSize();
                    sendResponse({ success: true, queueSize });
                    break;

                // ─── Delta Check ──────────────────────────

                case 'moodle_forceResync':
                    const delta = new DeltaDetector();
                    await delta.clearHashes();
                    await this.syncEngine.startSync();
                    sendResponse({ success: true });
                    break;

                case 'moodle_getDeltaInfo':
                    const deltaInfo = new DeltaDetector();
                    const info = await deltaInfo.getLastChangeInfo();
                    sendResponse({ success: true, data: info });
                    break;

                // ─── Content Script Data ───────────────────

                case 'moodle_pageExtracted':
                    // Content script extracted data from the page user is viewing
                    if (message.data) {
                        await this._mergeContentData(message.data);
                    }
                    sendResponse({ success: true });
                    break;

                default:
                    // Don't handle unknown messages - let other listeners handle them
                    return;
            }
        } catch (error) {
            console.error('[MoodleSyncController] Error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * دمج البيانات من content script مع البيانات المحلية
     */
    async _mergeContentData(pageData) {
        return new Promise(resolve => {
            chrome.storage.local.get(['moodle_normalized_data'], async (result) => {
                const existing = result.moodle_normalized_data || {
                    user_id: null,
                    courses: [],
                    assignments: [],
                    grades: [],
                    synced_at: null
                };

                // Merge based on page type
                // Use DataNormalizer logic here if available
                // For now, simple merge
                if (pageData.type === 'dashboard' && pageData.courses) {
                    pageData.courses.forEach(course => {
                        const idx = existing.courses.findIndex(c => c.course_id === course.course_id);
                        if (idx >= 0) {
                            existing.courses[idx] = { ...existing.courses[idx], ...course };
                        } else {
                            existing.courses.push(course);
                        }
                    });
                    if (pageData.user?.id) {
                        existing.user_id = pageData.user.id;
                    }
                }

                existing.synced_at = new Date().toISOString();

                chrome.storage.local.set({ 'moodle_normalized_data': existing }, resolve);
            });
        });
    }

    /**
     * معالجة قائمة إعادة المحاولة
     */
    async _processRetryQueue() {
        try {
            const sender = new DataSender();
            const queueSize = await sender.getQueueSize();
            if (queueSize > 0) {
                console.log(`[MoodleSyncController] Processing retry queue (${queueSize} items)`);
                await sender.processQueue();
            }
        } catch (error) {
            console.error('[MoodleSyncController] Error processing queue:', error);
        }
    }
}

// ─── Initialize ───────────────────────────────────────────────────

const moodleSyncController = new MoodleSyncController();
moodleSyncController.init().catch(err => {
    console.error('[MoodleSyncController] Init failed:', err);
});
