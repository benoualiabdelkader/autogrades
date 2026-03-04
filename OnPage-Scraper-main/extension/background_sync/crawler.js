/**
 * Moodle Crawler
 * يدير جلب الصفحات عبر fetch بدون تغيير الصفحة
 * 
 * Phase 2: Background Sync - Crawl pages via fetch
 * Phase 3: Stable Extraction from HTML
 * Phase 7: Rate limiting + batch control
 */

class MoodleCrawler {
    constructor(baseURL) {
        this.baseURL = baseURL.replace(/\/$/, '');
        this.fetchQueue = [];
        this.activeFetches = 0;
        this.maxConcurrent = 2;        // Phase 7: max parallel fetches
        this.delayBetweenRequests = 700; // Phase 7: delay in ms
        this.requestTimeout = 15000;     // 15 seconds per request
    }

    /**
     * جلب صفحة Dashboard
     */
    async fetchDashboard() {
        const urls = [
            `${this.baseURL}/my/`,
            `${this.baseURL}/my/index.php`,
            `${this.baseURL}/`
        ];

        for (const url of urls) {
            const result = await this._fetchAndParse(url, 'dashboard');
            if (result.success) return result;
        }

        return { success: false, error: 'Could not fetch dashboard from any URL' };
    }

    /**
     * جلب صفحة دورة
     */
    async fetchCoursePage(courseIdOrUrl) {
        let url;
        if (courseIdOrUrl.startsWith('http')) {
            url = courseIdOrUrl;
        } else {
            url = `${this.baseURL}/course/view.php?id=${courseIdOrUrl}`;
        }

        return this._fetchAndParse(url, 'course');
    }

    /**
     * جلب صفحة درجات لدورة معينة
     */
    async fetchGradesPage(courseId) {
        const url = `${this.baseURL}/grade/report/user/index.php?id=${courseId}`;
        return this._fetchAndParse(url, 'grades');
    }

    /**
     * جلب صفحة مهمة معينة
     */
    async fetchAssignmentPage(assignmentUrl) {
        return this._fetchAndParse(assignmentUrl, 'assignment');
    }

    /**
     * جلب وتحليل صفحة
     */
    async _fetchAndParse(url, pageType) {
        try {
            const html = await this._fetchPage(url);
            if (!html) {
                return { success: false, error: 'Empty response', url };
            }

            // Check if we're redirected to login page
            if (this._isLoginPage(html)) {
                return { success: false, error: 'Not authenticated - redirected to login', url };
            }

            // Parse HTML and extract data using the appropriate strategy
            const data = await this._extractFromHTML(html, url, pageType);
            return { success: true, data, url };

        } catch (error) {
            console.error(`[Crawler] Failed to fetch ${url}:`, error);
            return { success: false, error: error.message, url };
        }
    }

    /**
     * جلب صفحة HTML عبر fetch مع المصادقة
     * يستخدم credentials: "include" للحفاظ على الجلسة
     */
    async _fetchPage(url) {
        // Rate limiting
        await this._waitForSlot();

        this.activeFetches++;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',  // Phase 2: include cookies for Moodle session
                headers: {
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'ar,en;q=0.9',
                    'Cache-Control': 'no-cache'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.text();

        } finally {
            this.activeFetches--;
        }
    }

    /**
     * Phase 7: انتظار slot متاح للطلب
     */
    async _waitForSlot() {
        while (this.activeFetches >= this.maxConcurrent) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        // Delay between requests
        if (this.activeFetches > 0) {
            await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));
        }
    }

    /**
     * كشف إن كانت الصفحة هي صفحة تسجيل الدخول
     */
    _isLoginPage(html) {
        const loginIndicators = [
            'id="login"',
            'action="login/index.php"',
            'name="logintoken"',
            'id="loginbtn"',
            'class="login-form"',
            'login/forgot_password.php'
        ];

        const lowerHTML = html.toLowerCase();
        return loginIndicators.some(indicator => lowerHTML.includes(indicator.toLowerCase()));
    }

    /**
     * استخراج البيانات من HTML باستخدام Strategy المناسب
     */
    async _extractFromHTML(html, url, pageType) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // حدد الاستراتيجية
        const moodleVersion = this._detectVersionFromHTML(doc);

        switch (pageType) {
            case 'dashboard': {
                const strategy = new (self.MoodleDashboardStrategy || window.MoodleDashboardStrategy)(moodleVersion);
                return strategy.extractFromDocument(doc, url);
            }
            case 'course': {
                const strategy = new (self.MoodleCourseStrategy || window.MoodleCourseStrategy)(moodleVersion);
                return strategy.extractFromDocument(doc, url);
            }
            case 'assignment': {
                const strategy = new (self.MoodleAssignmentStrategy || window.MoodleAssignmentStrategy)(moodleVersion);
                return strategy.extractFromDocument(doc, url);
            }
            case 'grades': {
                const strategy = new (self.MoodleGradesStrategy || window.MoodleGradesStrategy)(moodleVersion);
                return strategy.extractFromDocument(doc, url);
            }
            default:
                throw new Error(`Unknown page type: ${pageType}`);
        }
    }

    /**
     * كشف إصدار Moodle من HTML
     */
    _detectVersionFromHTML(doc) {
        const meta = doc.querySelector('meta[name="generator"]');
        if (meta) {
            const match = (meta.getAttribute('content') || '').match(/Moodle\s+([\d.]+)/i);
            if (match) return match[1];
        }

        // Check for Moodle 4.x indicators
        if (doc.querySelector('[data-region="drawer"]')) return '4.x';
        if (doc.querySelector('#nav-drawer')) return '3.x';

        return null;
    }

    /**
     * Phase 7: جلب عدة صفحات بالتوازي (محدود)
     */
    async fetchBatch(urlsWithTypes) {
        const results = [];
        const batchSize = this.maxConcurrent;

        for (let i = 0; i < urlsWithTypes.length; i += batchSize) {
            const batch = urlsWithTypes.slice(i, i + batchSize);

            const batchResults = await Promise.all(
                batch.map(({ url, type }) => this._fetchAndParse(url, type))
            );

            results.push(...batchResults);

            // Delay between batches
            if (i + batchSize < urlsWithTypes.length) {
                await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));
            }
        }

        return results;
    }

    /**
     * Phase 7 (Optional): محاولة استخدام Moodle AJAX API
     * بعض إصدارات Moodle توفر Web Services endpoints
     */
    async tryMoodleWebService(functionName, params = {}) {
        try {
            // Get sesskey and wstoken
            const wsToken = await this._getWSToken();
            if (!wsToken) return { success: false, error: 'No WS token available' };

            const url = `${this.baseURL}/lib/ajax/service.php?sesskey=${wsToken}`;
            
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([{
                    index: 0,
                    methodname: functionName,
                    args: params
                }])
            });

            if (!response.ok) return { success: false, error: `HTTP ${response.status}` };

            const data = await response.json();
            if (data[0]?.error) {
                return { success: false, error: data[0].error };
            }

            return { success: true, data: data[0]?.data };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * محاولة الحصول على WS token من الصفحة
     */
    async _getWSToken() {
        try {
            const html = await this._fetchPage(`${this.baseURL}/my/`);
            if (!html) return null;

            const match = html.match(/sesskey["']?\s*[:=]\s*["']([a-zA-Z0-9]+)/);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    }
}

// Export
if (typeof self !== 'undefined') {
    self.MoodleCrawler = MoodleCrawler;
}
if (typeof window !== 'undefined') {
    window.MoodleCrawler = MoodleCrawler;
}
