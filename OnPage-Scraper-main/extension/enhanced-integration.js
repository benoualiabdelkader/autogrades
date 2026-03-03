/**
 * Enhanced Content Script Integration
 * دمج جميع الميزات المتقدمة مع Content Script الأساسي
 */

// Initialize all advanced systems
let advancedSettings = null;
let dataExtractor = null;
let sessionManager = null;
let dynamicContentHandler = null;
let antiDetection = null;
let rateLimiter = null;
let performanceMonitor = null;
let cacheManager = null;

// Initialize on load
(async function initAdvancedFeatures() {
    try {
        // Load settings
        advancedSettings = new AdvancedSettings();
        const settings = await advancedSettings.loadSettings();

        // Initialize data extractor
        dataExtractor = new AdvancedDataExtractor();

        // Initialize session manager
        sessionManager = new SessionManager();

        // Initialize dynamic content handler
        dynamicContentHandler = new DynamicContentHandler();

        // Initialize anti-detection
        antiDetection = new AntiDetectionSystem();

        // Apply anti-detection if enabled
        if (settings.antiDetection?.enabled !== false) {
            antiDetection.applyAntiDetection({
                hideWebDriver: true,
                modifyNavigator: settings.userAgentRotation?.enabled || false
            });
        }

        // Initialize rate limiter
        rateLimiter = new RateLimiter({
            requestsPerSecond: settings.rateLimiting?.requestsPerSecond || 2,
            delayBetweenRequests: settings.rateLimiting?.delayBetweenRequests || 500,
            maxConcurrent: settings.rateLimiting?.maxConcurrent || 3,
            enabled: settings.rateLimiting?.enabled !== false
        });

        // Initialize performance monitor
        performanceMonitor = new PerformanceMonitor();

        // Initialize cache
        cacheManager = new CacheManager(settings.performance?.cacheSize || 100);

        console.log('✅ Advanced features initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize advanced features:', error);
    }
})();

// Enhanced message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleAdvancedMessage(message, sender, sendResponse);
    return true; // Keep channel open for async response
});

/**
 * معالج الرسائل المتقدم
 */
async function handleAdvancedMessage(message, sender, sendResponse) {
    try {
        switch (message.action) {
            // ==================== Data Extraction ====================
            case 'extractAllData':
                performanceMonitor.startTiming('extractAllData');
                const settings = await advancedSettings.loadSettings();
                const allData = await dataExtractor.extractAll(settings);
                performanceMonitor.endTiming('extractAllData');
                sendResponse({ success: true, data: allData });
                break;

            case 'extractText':
                const textData = dataExtractor.extractText();
                sendResponse({ success: true, data: textData });
                break;

            case 'extractImages':
                const imageData = await dataExtractor.extractImages();
                sendResponse({ success: true, data: imageData });
                break;

            case 'extractLinks':
                const linkData = dataExtractor.extractLinks();
                sendResponse({ success: true, data: linkData });
                break;

            case 'extractTables':
                const tableData = dataExtractor.extractTables();
                sendResponse({ success: true, data: tableData });
                break;

            case 'extractFiles':
                const fileData = dataExtractor.extractFileLinks();
                sendResponse({ success: true, data: fileData });
                break;

            case 'extractMetadata':
                const metadata = dataExtractor.extractMetadata();
                sendResponse({ success: true, data: metadata });
                break;

            case 'extractForms':
                const formData = dataExtractor.extractForms();
                sendResponse({ success: true, data: formData });
                break;

            // ==================== Dynamic Content ====================
            case 'waitForDynamicContent':
                const waitResult = await dynamicContentHandler.waitForDynamicContent(message.options || {});
                sendResponse({ success: true, result: waitResult });
                break;

            case 'scrollAndLoad':
                const scrollResult = await dynamicContentHandler.scrollAndWaitForContent(message.timeout || 30000);
                sendResponse({ success: true, result: scrollResult });
                break;

            case 'handleInfiniteScroll':
                const infiniteResult = await dynamicContentHandler.handleInfiniteScroll(message.options || {});
                sendResponse({ success: true, result: infiniteResult });
                break;

            case 'waitForImages':
                const imageLoadResult = await dynamicContentHandler.waitForImages(message.timeout || 10000);
                sendResponse({ success: true, result: imageLoadResult });
                break;

            case 'executeScript':
                const scriptResult = await dynamicContentHandler.executeScript(message.code);
                sendResponse({ success: true, result: scriptResult });
                break;

            // ==================== Session Management ====================
            case 'getLocalStorage':
                const localStorageData = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    localStorageData[key] = localStorage.getItem(key);
                }
                sendResponse({ success: true, data: localStorageData });
                break;

            case 'getSessionStorage':
                const sessionStorageData = {};
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    sessionStorageData[key] = sessionStorage.getItem(key);
                }
                sendResponse({ success: true, data: sessionStorageData });
                break;

            case 'restoreStorage':
                if (message.localStorage) {
                    for (const [key, value] of Object.entries(message.localStorage)) {
                        localStorage.setItem(key, value);
                    }
                }
                if (message.sessionStorage) {
                    for (const [key, value] of Object.entries(message.sessionStorage)) {
                        sessionStorage.setItem(key, value);
                    }
                }
                sendResponse({ success: true });
                break;

            case 'checkLoginState':
                // Check for common login indicators
                const indicators = message.indicators || [
                    'logout', 'sign out', 'profile', 'dashboard',
                    'account', 'settings'
                ];
                
                const bodyText = document.body.textContent.toLowerCase();
                const loggedIn = indicators.some(indicator => 
                    bodyText.includes(indicator.toLowerCase())
                );

                sendResponse({ success: true, loggedIn });
                break;

            // ==================== Settings ====================
            case 'getSettings':
                const currentSettings = await advancedSettings.loadSettings();
                sendResponse({ success: true, settings: currentSettings });
                break;

            case 'updateSettings':
                const saveResult = await advancedSettings.saveSettings(message.settings);
                sendResponse(saveResult);
                break;

            case 'resetSettings':
                const resetResult = await advancedSettings.resetSettings();
                sendResponse(resetResult);
                break;

            // ==================== Performance ====================
            case 'getPerformanceStats':
                const stats = performanceMonitor.getSummary();
                sendResponse({ success: true, stats });
                break;

            case 'getCacheStats':
                const cacheStats = cacheManager.getStats();
                sendResponse({ success: true, stats: cacheStats });
                break;

            case 'getRateLimitStats':
                const rateStats = rateLimiter.getStats();
                sendResponse({ success: true, stats: rateStats });
                break;

            // ==================== Anti-Detection ====================
            case 'detectAntiScraping':
                const detection = antiDetection.detectAntiScraping();
                sendResponse({ success: true, detection });
                break;

            case 'generateFingerprint':
                const fingerprint = antiDetection.generateBrowserFingerprint();
                sendResponse({ success: true, fingerprint });
                break;

            // ==================== Export ====================
            case 'exportData':
                const exportSettings = await advancedSettings.loadSettings();
                const exportData = await dataExtractor.extractAll(exportSettings);
                const format = message.format || exportSettings.export?.format || 'json';
                const exported = dataExtractor.exportData(exportData, format);
                sendResponse({ success: true, data: exported, format });
                break;

            default:
                // Let original content script handle it
                break;
        }
    } catch (error) {
        console.error('Error handling advanced message:', error);
        performanceMonitor.logError(error, message.action);
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
}

/**
 * Enhanced extraction with rate limiting
 */
async function extractWithRateLimit(extractFn) {
    return rateLimiter.enqueue(async () => {
        const startTime = performance.now();
        try {
            const result = await extractFn();
            const duration = performance.now() - startTime;
            performanceMonitor.logRequest(window.location.href, duration, 200);
            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            performanceMonitor.logRequest(window.location.href, duration, 500);
            performanceMonitor.logError(error, 'extraction');
            throw error;
        }
    });
}

/**
 * Monitor performance periodically
 */
setInterval(() => {
    if (performanceMonitor) {
        performanceMonitor.measureMemory();
    }
    if (cacheManager) {
        cacheManager.cleanup();
    }
}, 30000); // Every 30 seconds

/**
 * Cleanup on unload
 */
window.addEventListener('beforeunload', () => {
    if (dynamicContentHandler) {
        dynamicContentHandler.cleanup();
    }
});

// Log initialization
console.log('🚀 OnPage Scraper - Advanced Edition Loaded');
console.log('📦 Features: Multi-type data extraction, Dynamic content handling, Session management, Anti-detection, Rate limiting, Performance monitoring');
