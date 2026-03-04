/**
 * Moodle Page Router
 * يحدد نوع الصفحة ويختار الاستراتيجية المناسبة للاستخراج
 * 
 * Phase 1: Modular Architecture
 * Phase 3: Stable Extraction (URL patterns + version detection)
 */

class MoodleRouter {
    constructor() {
        this.strategies = {};
        this.currentStrategy = null;
        this.moodleVersion = null;
        this.baseURL = null;
        this.isInitialized = false;
    }

    /**
     * تسجيل استراتيجية لنوع صفحة معين
     */
    registerStrategy(pageType, strategy) {
        this.strategies[pageType] = strategy;
        console.log(`[Router] Registered strategy: ${pageType}`);
    }

    /**
     * تهيئة الراوتر - كشف Moodle والإصدار
     */
    async init() {
        if (this.isInitialized) return;

        this.baseURL = this._detectBaseURL();
        this.moodleVersion = this._detectMoodleVersion();

        // تسجيل الاستراتيجيات
        if (window.MoodleDashboardStrategy) {
            this.registerStrategy('dashboard', new window.MoodleDashboardStrategy(this.moodleVersion));
        }
        if (window.MoodleCourseStrategy) {
            this.registerStrategy('course', new window.MoodleCourseStrategy(this.moodleVersion));
        }
        if (window.MoodleAssignmentStrategy) {
            this.registerStrategy('assignment', new window.MoodleAssignmentStrategy(this.moodleVersion));
        }
        if (window.MoodleGradesStrategy) {
            this.registerStrategy('grades', new window.MoodleGradesStrategy(this.moodleVersion));
        }

        this.isInitialized = true;
        console.log(`[Router] Initialized - Moodle ${this.moodleVersion || 'unknown'} at ${this.baseURL || 'unknown'}`);
    }

    /**
     * كشف نوع الصفحة الحالية بناءً على URL patterns
     */
    detectPageType(url = window.location.href) {
        const urlObj = new URL(url);
        const path = urlObj.pathname.toLowerCase();
        const params = urlObj.searchParams;

        // Dashboard patterns
        if (path === '/' || path === '/my/' || path === '/my/index.php' ||
            path.endsWith('/my/') || path.includes('/my/courses.php')) {
            return 'dashboard';
        }

        // Assignment patterns  
        if (path.includes('/mod/assign/') || path.includes('/mod/quiz/') ||
            path.includes('/mod/workshop/')) {
            return 'assignment';
        }

        // Grades patterns
        if (path.includes('/grade/') || path.includes('/gradebook/') ||
            (path.includes('/user/') && params.has('mode') && params.get('mode') === 'grade')) {
            return 'grades';
        }

        // Course patterns (general)
        if (path.includes('/course/view.php') || 
            (path.includes('/course/') && params.has('id'))) {
            return 'course';
        }

        // Fallback: check body classes (Moodle adds page-type classes)
        return this._detectFromBodyClasses();
    }

    /**
     * كشف نوع الصفحة من CSS classes على body
     */
    _detectFromBodyClasses() {
        const bodyClasses = document.body?.className || '';

        if (bodyClasses.includes('pagelayout-mydashboard') || 
            bodyClasses.includes('page-my-index')) {
            return 'dashboard';
        }
        if (bodyClasses.includes('path-mod-assign') || 
            bodyClasses.includes('path-mod-quiz')) {
            return 'assignment';
        }
        if (bodyClasses.includes('path-grade') || 
            bodyClasses.includes('pagelayout-report')) {
            return 'grades';
        }
        if (bodyClasses.includes('path-course') || 
            bodyClasses.includes('pagelayout-course')) {
            return 'course';
        }

        return 'unknown';
    }

    /**
     * كشف إصدار Moodle من meta tag أو footer
     */
    _detectMoodleVersion() {
        // Method 1: meta generator tag
        const metaGenerator = document.querySelector('meta[name="generator"]');
        if (metaGenerator) {
            const content = metaGenerator.getAttribute('content') || '';
            const match = content.match(/Moodle\s+([\d.]+)/i);
            if (match) return match[1];
        }

        // Method 2: Check Moodle's M.cfg JavaScript object
        try {
            if (typeof M !== 'undefined' && M.cfg && M.cfg.version) {
                return M.cfg.version;
            }
        } catch (e) { /* ignore */ }

        // Method 3: Footer version text
        const footer = document.querySelector('#page-footer, .footer-content, footer');
        if (footer) {
            const text = footer.textContent || '';
            const match = text.match(/Moodle\s*([\d.]+)/i);
            if (match) return match[1];
        }

        // Method 4: Check for known Moodle 4.x indicators
        if (document.querySelector('[data-region="drawer"]') || 
            document.querySelector('.primary-navigation')) {
            return '4.x';
        }

        // Method 5: Moodle 3.x indicators
        if (document.querySelector('#nav-drawer') || 
            document.querySelector('.boost-navigation')) {
            return '3.x';
        }

        return null;
    }

    /**
     * كشف Base URL لموقع Moodle
     */
    _detectBaseURL() {
        // Method 1: M.cfg.wwwroot
        try {
            if (typeof M !== 'undefined' && M.cfg && M.cfg.wwwroot) {
                return M.cfg.wwwroot;
            }
        } catch (e) { /* ignore */ }

        // Method 2: Canonical link
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            try {
                const url = new URL(canonical.href);
                return url.origin;
            } catch (e) { /* ignore */ }
        }

        // Default: current origin
        return window.location.origin;
    }

    /**
     * تنفيذ الاستراتيجية المناسبة للصفحة الحالية
     */
    async route(url) {
        const pageType = this.detectPageType(url);
        const strategy = this.strategies[pageType];

        if (!strategy) {
            console.warn(`[Router] No strategy for page type: ${pageType}`);
            return { pageType, success: false, error: 'No strategy available' };
        }

        this.currentStrategy = strategy;

        try {
            // Phase 3: انتظار استقرار DOM
            await this._waitForStableDOM();

            const data = await strategy.extract();
            return {
                pageType,
                success: true,
                data,
                moodleVersion: this.moodleVersion,
                baseURL: this.baseURL,
                extractedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[Router] Strategy ${pageType} failed:`, error);
            return {
                pageType,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Phase 3: انتظر حتى يستقر DOM (no mutations for 500ms)
     */
    _waitForStableDOM(timeout = 5000) {
        return new Promise((resolve) => {
            let timer = null;
            let timeoutId = null;

            const observer = new MutationObserver(() => {
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => {
                    observer.disconnect();
                    if (timeoutId) clearTimeout(timeoutId);
                    resolve();
                }, 500);
            });

            observer.observe(document.body || document.documentElement, {
                childList: true,
                subtree: true,
                attributes: false
            });

            // Initial check - if DOM is already stable
            timer = setTimeout(() => {
                observer.disconnect();
                if (timeoutId) clearTimeout(timeoutId);
                resolve();
            }, 500);

            // Safety timeout
            timeoutId = setTimeout(() => {
                observer.disconnect();
                if (timer) clearTimeout(timer);
                resolve();
            }, timeout);
        });
    }

    /**
     * استخراج البيانات من صفحة عبر fetch (للـ background sync)
     * يُستخدم عندما لا يكون المستخدم في الصفحة
     */
    async extractFromHTML(html, url, pageType) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const strategy = this.strategies[pageType];
        if (!strategy) {
            return { success: false, error: `No strategy for: ${pageType}` };
        }

        try {
            const data = await strategy.extractFromDocument(doc, url);
            return { success: true, data, pageType };
        } catch (error) {
            return { success: false, error: error.message, pageType };
        }
    }
}

// Export
window.MoodleRouter = MoodleRouter;
