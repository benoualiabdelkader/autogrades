/**
 * Moodle Content Main
 * النقطة الرئيسية لتفعيل نظام Moodle في content scripts
 * 
 * يتم تحميله بعد كل الاستراتيجيات والـ parser
 * يكتشف صفحات Moodle تلقائياً ويبدأ الاستخراج
 */

(function () {
    'use strict';

    // Prevent multiple init
    if (window._moodleContentInitialized) return;
    window._moodleContentInitialized = true;

    /**
     * هل هذه صفحة Moodle؟
     */
    function isMoodlePage() {
        // Check body ID (Moodle always adds page-* id)
        const bodyId = document.body?.id || '';
        if (bodyId.startsWith('page-')) return true;

        // Check for Moodle-specific meta
        const meta = document.querySelector('meta[name="generator"]');
        if (meta && /moodle/i.test(meta.getAttribute('content') || '')) return true;

        // Check for M.cfg global
        try {
            if (typeof M !== 'undefined' && M.cfg) return true;
        } catch (e) { /* ignore */ }

        // Check for Moodle CSS/JS references
        const links = document.querySelectorAll('link[href*="moodle"], script[src*="moodle"]');
        if (links.length > 0) return true;

        // Check body classes
        const bodyClass = document.body?.className || '';
        if (bodyClass.includes('path-') || bodyClass.includes('pagelayout-')) return true;

        return false;
    }

    /**
     * تهيئة وتشغيل الاستخراج
     */
    async function initMoodleExtraction() {
        if (!isMoodlePage()) {
            console.log('[MoodleContent] Not a Moodle page, skipping');
            return;
        }

        console.log('[MoodleContent] Moodle page detected, initializing...');

        // Initialize router
        const router = new window.MoodleRouter();
        await router.init();

        // Detect and route
        const pageType = router.detectPageType();
        console.log(`[MoodleContent] Page type: ${pageType}`);

        if (pageType === 'unknown') {
            console.log('[MoodleContent] Unknown page type, no extraction');
            return;
        }

        // Extract data
        const result = await router.route();

        if (result.success && result.data) {
            console.log(`[MoodleContent] Extracted ${pageType} data:`, result.data);

            // Auto-detect and save Moodle base URL
            if (router.baseURL) {
                chrome.storage.local.set({ 'moodle_base_url': router.baseURL });
            }

            // Send to background for normalization and storage
            try {
                chrome.runtime.sendMessage({
                    action: 'moodle_pageExtracted',
                    data: result.data,
                    pageType: result.pageType,
                    moodleVersion: result.moodleVersion
                });
            } catch (e) {
                console.warn('[MoodleContent] Could not send to background:', e);
            }

            // Also normalize locally for immediate access
            if (window.DataNormalizer) {
                const normalizer = new window.DataNormalizer();
                await normalizer.loadFromStorage();
                normalizer.merge(result);
                await normalizer.saveToStorage();
            }
        } else {
            console.warn(`[MoodleContent] Extraction failed for ${pageType}:`, result.error);
        }

        // Store the router for external access
        window._moodleRouter = router;
    }

    // Listen for manual extraction requests from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'moodle_extractCurrent') {
            initMoodleExtraction().then(() => {
                sendResponse({ success: true });
            }).catch(err => {
                sendResponse({ success: false, error: err.message });
            });
            return true; // async
        }

        if (message.action === 'moodle_getPageType') {
            const router = window._moodleRouter || new window.MoodleRouter();
            sendResponse({
                success: true,
                pageType: router.detectPageType(),
                isMoodle: isMoodlePage(),
                moodleVersion: router.moodleVersion
            });
        }
    });

    // Auto-run on page load (with a small delay for DOM to settle)
    if (document.readyState === 'complete') {
        setTimeout(initMoodleExtraction, 1000);
    } else {
        window.addEventListener('load', () => {
            setTimeout(initMoodleExtraction, 1000);
        });
    }

})();
