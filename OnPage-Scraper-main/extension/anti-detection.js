/**
 * User-Agent Manager & Anti-Detection System
 * نظام إدارة الهويات ومكافحة الكشف
 */

class UserAgentManager {
    constructor() {
        this.userAgents = {
            chrome: [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ],
            firefox: [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2; rv:121.0) Gecko/20100101 Firefox/121.0',
                'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
            ],
            safari: [
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
            ],
            edge: [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
            ]
        };

        this.allUserAgents = [
            ...this.userAgents.chrome,
            ...this.userAgents.firefox,
            ...this.userAgents.safari,
            ...this.userAgents.edge
        ];

        this.currentIndex = 0;
        this.requestCount = 0;
    }

    /**
     * الحصول على User-Agent عشوائي
     */
    getRandomUserAgent(browser = null) {
        if (browser && this.userAgents[browser]) {
            const agents = this.userAgents[browser];
            return agents[Math.floor(Math.random() * agents.length)];
        }

        return this.allUserAgents[Math.floor(Math.random() * this.allUserAgents.length)];
    }

    /**
     * تدوير User-Agent بالتسلسل
     */
    rotateUserAgent() {
        const userAgent = this.allUserAgents[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.allUserAgents.length;
        return userAgent;
    }

    /**
     * الحصول على User-Agent بناءً على عدد الطلبات
     */
    getUserAgentByRequestCount(rotationInterval = 10) {
        this.requestCount++;
        
        if (this.requestCount % rotationInterval === 0) {
            return this.rotateUserAgent();
        }

        return this.allUserAgents[this.currentIndex];
    }

    /**
     * إضافة User-Agent مخصص
     */
    addCustomUserAgent(userAgent, category = 'custom') {
        if (!this.userAgents[category]) {
            this.userAgents[category] = [];
        }
        
        this.userAgents[category].push(userAgent);
        this.allUserAgents.push(userAgent);
    }

    /**
     * إعادة تعيين العداد
     */
    resetRequestCount() {
        this.requestCount = 0;
    }

    /**
     * الحصول على معلومات Browser من User-Agent
     */
    parseUserAgent(userAgent) {
        const ua = userAgent.toLowerCase();
        
        const info = {
            browser: 'unknown',
            version: 'unknown',
            os: 'unknown',
            isMobile: false
        };

        // Detect browser
        if (ua.includes('firefox')) {
            info.browser = 'Firefox';
            const match = ua.match(/firefox\/(\d+)/);
            info.version = match ? match[1] : 'unknown';
        } else if (ua.includes('edg')) {
            info.browser = 'Edge';
            const match = ua.match(/edg\/(\d+)/);
            info.version = match ? match[1] : 'unknown';
        } else if (ua.includes('safari') && !ua.includes('chrome')) {
            info.browser = 'Safari';
            const match = ua.match(/version\/(\d+)/);
            info.version = match ? match[1] : 'unknown';
        } else if (ua.includes('chrome')) {
            info.browser = 'Chrome';
            const match = ua.match(/chrome\/(\d+)/);
            info.version = match ? match[1] : 'unknown';
        }

        // Detect OS
        if (ua.includes('windows')) {
            info.os = 'Windows';
        } else if (ua.includes('mac os')) {
            info.os = 'macOS';
        } else if (ua.includes('linux')) {
            info.os = 'Linux';
        } else if (ua.includes('iphone') || ua.includes('ipad')) {
            info.os = 'iOS';
            info.isMobile = true;
        } else if (ua.includes('android')) {
            info.os = 'Android';
            info.isMobile = true;
        }

        return info;
    }
}

/**
 * Anti-Detection System
 * نظام مكافحة الكشف
 */
class AntiDetectionSystem {
    constructor() {
        this.userAgentManager = new UserAgentManager();
    }

    /**
     * إضافة تأخير عشوائي (محاكاة السلوك البشري)
     */
    async randomDelay(min = 1000, max = 3000) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * محاكاة حركة الماوس
     */
    async simulateMouseMovement() {
        const moveCount = Math.floor(Math.random() * 5) + 3;
        
        for (let i = 0; i < moveCount; i++) {
            const x = Math.floor(Math.random() * window.innerWidth);
            const y = Math.floor(Math.random() * window.innerHeight);
            
            const event = new MouseEvent('mousemove', {
                clientX: x,
                clientY: y,
                bubbles: true
            });
            
            document.dispatchEvent(event);
            await this.randomDelay(100, 300);
        }
    }

    /**
     * محاكاة التمرير الطبيعي
     */
    async simulateNaturalScroll(targetY) {
        const startY = window.scrollY;
        const distance = targetY - startY;
        const duration = Math.abs(distance) / 2; // Slower scroll
        const steps = 20;
        
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const easing = this.easeInOutQuad(progress);
            const scrollY = startY + (distance * easing);
            
            window.scrollTo(0, scrollY);
            await this.randomDelay(duration / steps, duration / steps + 50);
        }
    }

    /**
     * دالة التسريع/التباطؤ
     */
    easeInOutQuad(t) {
        return t < 0.5 
            ? 2 * t * t 
            : -1 + (4 - 2 * t) * t;
    }

    /**
     * إخفاء WebDriver
     */
    hideWebDriver() {
        // Override navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false
        });

        // Override chrome.runtime
        if (window.chrome && window.chrome.runtime) {
            Object.defineProperty(window.chrome, 'runtime', {
                get: () => undefined
            });
        }
    }

    /**
     * تعديل خصائص Navigator
     */
    modifyNavigatorProperties(userAgent) {
        const info = this.userAgentManager.parseUserAgent(userAgent);
        
        // Override user agent
        Object.defineProperty(navigator, 'userAgent', {
            get: () => userAgent
        });

        // Override platform
        const platforms = {
            'Windows': 'Win32',
            'macOS': 'MacIntel',
            'Linux': 'Linux x86_64',
            'iOS': 'iPhone',
            'Android': 'Linux armv81'
        };

        Object.defineProperty(navigator, 'platform', {
            get: () => platforms[info.os] || 'Win32'
        });

        // Override plugins length (avoid headless detection)
        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                return [
                    { name: 'Chrome PDF Plugin' },
                    { name: 'Chrome PDF Viewer' },
                    { name: 'Native Client' }
                ];
            }
        });

        // Override languages
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en', 'ar']
        });
    }

    /**
     * إضافة Referer عشوائي
     */
    getRandomReferer(currentUrl) {
        const referers = [
            'https://www.google.com/search?q=',
            'https://www.bing.com/search?q=',
            'https://duckduckgo.com/?q=',
            currentUrl,
            ''
        ];

        return referers[Math.floor(Math.random() * referers.length)];
    }

    /**
     * توليد بصمة متصفح واقعية
     */
    generateBrowserFingerprint() {
        const fingerprint = {
            userAgent: this.userAgentManager.getRandomUserAgent(),
            screenResolution: this.getRandomScreenResolution(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            colorDepth: screen.colorDepth,
            pixelRatio: window.devicePixelRatio,
            hardwareConcurrency: navigator.hardwareConcurrency,
            cookiesEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack || 'unspecified'
        };

        return fingerprint;
    }

    /**
     * دقة شاشة عشوائية واقعية
     */
    getRandomScreenResolution() {
        const resolutions = [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1440, height: 900 },
            { width: 1536, height: 864 },
            { width: 2560, height: 1440 },
            { width: 1280, height: 720 }
        ];

        return resolutions[Math.floor(Math.random() * resolutions.length)];
    }

    /**
     * فحص إذا كان الموقع يستخدم Anti-Scraping
     */
    detectAntiScraping() {
        const indicators = {
            hasRecaptcha: !!document.querySelector('.g-recaptcha, [data-sitekey]'),
            hasCloudflare: !!document.querySelector('[data-cf-beacon]') || 
                          document.title.toLowerCase().includes('cloudflare'),
            hasRateLimiting: false, // Would need to test with multiple requests
            hasObfuscation: this.checkForObfuscation(),
            hasFingerprinting: this.checkForFingerprinting()
        };

        return indicators;
    }

    /**
     * فحص التشفير في الكود
     */
    checkForObfuscation() {
        const scripts = Array.from(document.querySelectorAll('script'));
        
        for (const script of scripts) {
            const content = script.textContent;
            // Check for common obfuscation patterns
            if (content.match(/eval\(|atob\(|\\x[0-9a-f]{2}/i)) {
                return true;
            }
        }

        return false;
    }

    /**
     * فحص بصمة المتصفح
     */
    checkForFingerprinting() {
        const scripts = Array.from(document.querySelectorAll('script'));
        const fingerprintingKeywords = [
            'canvas.toDataURL',
            'getClientRects',
            'getBoundingClientRect',
            'AudioContext',
            'webgl'
        ];

        for (const script of scripts) {
            const content = script.textContent.toLowerCase();
            if (fingerprintingKeywords.some(keyword => content.includes(keyword.toLowerCase()))) {
                return true;
            }
        }

        return false;
    }

    /**
     * تطبيق جميع تقنيات مكافحة الكشف
     */
    applyAntiDetection(options = {}) {
        const {
            hideWebDriver = true,
            modifyNavigator = true,
            userAgent = null
        } = options;

        if (hideWebDriver) {
            this.hideWebDriver();
        }

        if (modifyNavigator) {
            const ua = userAgent || this.userAgentManager.getRandomUserAgent();
            this.modifyNavigatorProperties(ua);
        }

        return {
            success: true,
            userAgent: navigator.userAgent,
            fingerprint: this.generateBrowserFingerprint()
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserAgentManager, AntiDetectionSystem };
}
