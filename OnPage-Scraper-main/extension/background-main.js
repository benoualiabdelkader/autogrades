/**
 * Main Background Service Worker v3.0
 * Entry point for the service worker
 * 
 * Loads:
 * 1. background.js — original OnPage scraper
 * 2. Moodle Sync System (Phases 1-7)
 * 3. Universal Scraper coordination
 */

// ─── Load Original Background Service ────────────────────────────
importScripts('background.js');

// ─── Load Moodle Sync Modules ────────────────────────────────────
importScripts(
    'content/strategies/dashboard.js',
    'content/strategies/course.js',
    'content/strategies/assignment.js',
    'content/strategies/grades.js',
    'background_sync/crawler.js',
    'background_sync/delta.js',
    'background_sync/sender.js',
    'background_sync/syncEngine.js',
    'background_sync/scraper-controller.js'
);

// ─── Moodle Sync Controller ─────────────────────────────────────

class MoodleSyncController {
    constructor() {
        this.syncEngine = null;
        this.scraperController = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        this.syncEngine = new SyncEngine();
        await this.syncEngine.init();

        this.scraperController = new MoodleScraperController();

        // Listen for Moodle-specific messages
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            // Only handle moodle_* messages, let background.js handle the rest
            if (message.action && message.action.startsWith('moodle_')) {
                this._handleMessage(message, sender, sendResponse);
                return true; // async response
            }
        });

        // Process retry queue periodically
        chrome.alarms.create('processRetryQueue', { periodInMinutes: 5 });
        chrome.alarms.onAlarm.addListener(alarm => {
            if (alarm.name === 'processRetryQueue') {
                this._processRetryQueue();
            }
        });

        this.initialized = true;
        console.log('[MoodleSyncController] Initialized ✅');
    }

    async _handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                // ─── Sync Control ──────────────────────
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

                // ─── Data Access ───────────────────────
                case 'moodle_getData':
                    chrome.storage.local.get(['moodle_normalized_data'], result => {
                        sendResponse({ success: true, data: result.moodle_normalized_data || null });
                    });
                    return;

                case 'moodle_clearData':
                    await chrome.storage.local.remove([
                        'moodle_normalized_data',
                        'moodle_data_hashes',
                        'moodle_send_queue',
                        'moodle_sender_logs'
                    ]);
                    sendResponse({ success: true });
                    break;

                // ─── URL Config ────────────────────────
                case 'moodle_setBaseURL':
                    await chrome.storage.local.set({ 'moodle_base_url': message.url });
                    sendResponse({ success: true });
                    break;

                case 'moodle_getBaseURL':
                    chrome.storage.local.get(['moodle_base_url'], result => {
                        sendResponse({ success: true, url: result.moodle_base_url || null });
                    });
                    return;

                // ─── Sender Config ─────────────────────
                case 'moodle_setSenderConfig': {
                    const sender = new DataSender();
                    await sender.saveConfig(message.config);
                    sendResponse({ success: true });
                    break;
                }

                case 'moodle_getSenderLogs': {
                    const logSender = new DataSender();
                    const logs = await logSender.getLogs();
                    sendResponse({ success: true, logs });
                    break;
                }

                case 'moodle_getQueueSize': {
                    const qSender = new DataSender();
                    const queueSize = await qSender.getQueueSize();
                    sendResponse({ success: true, queueSize });
                    break;
                }

                // ─── Delta / Force Sync ────────────────
                case 'moodle_forceResync': {
                    const delta = new DeltaDetector();
                    await delta.clearHashes();
                    await this.syncEngine.startSync();
                    sendResponse({ success: true });
                    break;
                }

                case 'moodle_getDeltaInfo': {
                    const deltaInfo = new DeltaDetector();
                    const info = await deltaInfo.getLastChangeInfo();
                    sendResponse({ success: true, data: info });
                    break;
                }

                // ─── Content Script Data ───────────────
                case 'moodle_pageExtracted':
                    if (message.data) {
                        await this._mergeContentData(message.data);
                    }
                    sendResponse({ success: true });
                    break;

                // ─── Auto Scraper Control ──────────────
                case 'moodle_startAutoScrape': {
                    const tabId = message.tabId || sender.tab?.id;
                    if (!tabId) {
                        sendResponse({ success: false, error: 'No tab ID' });
                        break;
                    }
                    const scrapeResult = await this.scraperController.startAutoScrape(tabId, message.config || {});
                    sendResponse(scrapeResult);
                    break;
                }

                case 'moodle_stopAutoScrape': {
                    const stopTabId = message.tabId || sender.tab?.id;
                    if (!stopTabId) {
                        sendResponse({ success: false, error: 'No tab ID' });
                        break;
                    }
                    const stopResult = await this.scraperController.stopAutoScrape(stopTabId);
                    sendResponse(stopResult);
                    break;
                }

                case 'moodle_scrapeStatus': {
                    const statusTabId = message.tabId || sender.tab?.id;
                    if (!statusTabId) {
                        sendResponse({ success: false, error: 'No tab ID' });
                        break;
                    }
                    const status = await this.scraperController.getStatus(statusTabId);
                    sendResponse({ success: true, data: status });
                    break;
                }

                case 'moodle_scrapeProgress':
                    // Progress update from content script — just store it
                    this.scraperController.progress = message.progress;
                    sendResponse({ success: true });
                    break;

                case 'moodle_getLastScrapeResult': {
                    const lastResult = await this.scraperController.getLastResult();
                    sendResponse({ success: true, data: lastResult });
                    break;
                }

                case 'moodle_exportScrapeCSV': {
                    const csvTabId = message.tabId || sender.tab?.id;
                    if (!csvTabId) {
                        sendResponse({ success: false, error: 'No tab ID' });
                        break;
                    }
                    const csv = await this.scraperController.exportCSV(csvTabId);
                    sendResponse({ success: true, data: csv });
                    break;
                }

                default:
                    sendResponse({ success: false, error: 'Unknown moodle action' });
            }
        } catch (error) {
            console.error('[MoodleSyncController] Error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

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

                if (pageData.type === 'course' && pageData.assignments) {
                    pageData.assignments.forEach(a => {
                        const idx = existing.assignments.findIndex(
                            x => x.assignment_id === a.activity_id
                        );
                        const norm = {
                            assignment_id: a.activity_id,
                            course_id: pageData.course_id,
                            title: a.title,
                            url: a.url,
                            type: a.type,
                            status: a.completion === 'completed' ? 'submitted' : 'not_submitted'
                        };
                        if (idx >= 0) {
                            existing.assignments[idx] = { ...existing.assignments[idx], ...norm };
                        } else {
                            existing.assignments.push(norm);
                        }
                    });
                }

                if (pageData.type === 'assignment' && pageData.assignment_id) {
                    const idx = existing.assignments.findIndex(
                        a => a.assignment_id === pageData.assignment_id
                    );
                    const norm = {
                        assignment_id: pageData.assignment_id,
                        course_id: pageData.course_id,
                        title: pageData.title,
                        url: pageData.url,
                        due_date: pageData.due_date,
                        status: pageData.status,
                        grade: pageData.grade
                    };
                    if (idx >= 0) {
                        existing.assignments[idx] = { ...existing.assignments[idx], ...norm };
                    } else {
                        existing.assignments.push(norm);
                    }
                }

                if (pageData.type === 'grades' && pageData.student) {
                    pageData.student.forEach(g => {
                        const idx = existing.grades.findIndex(
                            x => x.course_id === pageData.course_id && x.item_name === g.item_name
                        );
                        const norm = {
                            course_id: pageData.course_id,
                            item_name: g.item_name,
                            grade: g.grade,
                            percentage: g.percentage,
                            feedback: g.feedback
                        };
                        if (idx >= 0) {
                            existing.grades[idx] = { ...existing.grades[idx], ...norm };
                        } else {
                            existing.grades.push(norm);
                        }
                    });
                }

                existing.synced_at = new Date().toISOString();
                chrome.storage.local.set({ 'moodle_normalized_data': existing }, resolve);
            });
        });
    }

    async _processRetryQueue() {
        try {
            const sender = new DataSender();
            const queueSize = await sender.getQueueSize();
            if (queueSize > 0) {
                console.log(`[MoodleSyncController] Processing retry queue (${queueSize} items)`);
                await sender.processQueue();
            }
        } catch (error) {
            console.error('[MoodleSyncController] Queue error:', error);
        }
    }
}

// ─── Initialize Moodle Sync ──────────────────────────────────────

const moodleSyncController = new MoodleSyncController();
moodleSyncController.init().catch(err => {
    console.error('[MoodleSyncController] Init failed:', err);
});

// ═══════════════════════════════════════════════════════════════════
//  UNIVERSAL SCRAPER — Background Message Coordinator
// ═══════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle universal scraper messages
    if (message.action && message.action.startsWith('universal_')) {
        handleUniversalMessage(message, sender, sendResponse);
        return true; // async response
    }
});

async function handleUniversalMessage(message, sender, sendResponse) {
    try {
        switch (message.action) {
            case 'universal_scrapeTab': {
                const tabId = message.tabId || sender.tab?.id;
                if (!tabId) { sendResponse({ success: false, error: 'No tab ID' }); break; }

                // Inject core scripts into the target tab
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId },
                        files: ['core/SiteDetector.js', 'core/StealthEngine.js', 'core/UniversalScraper.js']
                    });
                } catch (_) { /* already injected */ }

                // Execute the scrape
                const result = await chrome.scripting.executeScript({
                    target: { tabId },
                    function: (config) => {
                        try {
                            if (config.stealth && typeof StealthEngine !== 'undefined') {
                                const se = new StealthEngine();
                                se.applyStealthPatches();
                            }
                            const scraper = new UniversalScraper(config);
                            return JSON.parse(JSON.stringify(scraper.scrapeCurrentPage()));
                        } catch (e) {
                            return { __error: e.message };
                        }
                    },
                    args: [message.config || {}]
                });

                if (result?.[0]?.result?.__error) {
                    sendResponse({ success: false, error: result[0].result.__error });
                } else {
                    sendResponse({ success: true, data: result[0]?.result });
                }
                break;
            }

            case 'universal_detectPlatform': {
                const tabId = message.tabId || sender.tab?.id;
                if (!tabId) { sendResponse({ success: false, error: 'No tab ID' }); break; }

                try {
                    await chrome.scripting.executeScript({
                        target: { tabId },
                        files: ['core/SiteDetector.js']
                    });
                } catch (_) {}

                const result = await chrome.scripting.executeScript({
                    target: { tabId },
                    function: () => {
                        try {
                            const d = new SiteDetector();
                            return JSON.parse(JSON.stringify(d.detect()));
                        } catch (e) {
                            return { platform: 'unknown', pageType: 'generic', confidence: 0 };
                        }
                    }
                });

                sendResponse({ success: true, data: result?.[0]?.result });
                break;
            }

            case 'universal_checkLogin': {
                const tabId = message.tabId || sender.tab?.id;
                if (!tabId) { sendResponse({ success: false, error: 'No tab ID' }); break; }

                try {
                    await chrome.scripting.executeScript({
                        target: { tabId },
                        files: ['core/StealthEngine.js']
                    });
                } catch (_) {}

                const result = await chrome.scripting.executeScript({
                    target: { tabId },
                    function: () => {
                        try {
                            const se = new StealthEngine();
                            return {
                                hasLoginForm: !!se.detectLoginForm(),
                                isLoggedIn: se.isLoggedIn()
                            };
                        } catch (e) {
                            return { hasLoginForm: false, isLoggedIn: true };
                        }
                    }
                });

                sendResponse({ success: true, data: result?.[0]?.result });
                break;
            }

            default:
                sendResponse({ success: false, error: 'Unknown universal action' });
        }
    } catch (error) {
        console.error('[UniversalScraper Background] Error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

console.log('AutoGrader Universal Scraper v3.0.0 — Background loaded');
console.log('  - Original OnPage Scraper');
console.log('  - Moodle Sync Engine');
console.log('  - Universal Scraper (any website)');
console.log('  - Platform Auto-Detection');
console.log('  - Stealth Engine');
