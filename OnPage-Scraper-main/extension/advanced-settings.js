/**
 * Advanced Settings Manager for OnPage Scraper
 * إدارة الإعدادات المتقدمة للأداة
 */

class AdvancedSettings {
    constructor() {
        this.defaultSettings = {
            // Data Types Support
            dataTypes: {
                text: true,
                images: true,
                links: true,
                tables: true,
                files: true
            },
            
            // Rate Limiting
            rateLimiting: {
                enabled: true,
                requestsPerSecond: 2,
                delayBetweenRequests: 500, // ms
                maxConcurrent: 3
            },
            
            // Session Management
            sessionManagement: {
                saveSessions: true,
                saveLoginState: true,
                sessionTimeout: 3600000 // 1 hour in ms
            },
            
            // User-Agent Rotation
            userAgentRotation: {
                enabled: false,
                rotationInterval: 10, // requests
                customUserAgents: []
            },
            
            // Proxy Settings
            proxy: {
                enabled: false,
                type: 'http', // http, https, socks4, socks5
                host: '',
                port: '',
                username: '',
                password: ''
            },
            
            // Anti-Detection
            antiDetection: {
                randomizeTimings: true,
                simulateHumanBehavior: true,
                respectRobotsTxt: true,
                avoidCaptcha: true
            },
            
            // Export Settings
            export: {
                format: 'json', // json, csv, excel, pdf
                includeMetadata: true,
                compression: false,
                autoSave: true
            },
            
            // Performance
            performance: {
                multiThreading: true,
                maxWorkers: 4,
                cacheEnabled: true,
                cacheSize: 100 // MB
            },
            
            // Legal & Ethical
            legal: {
                respectTermsOfService: true,
                checkRobotsTxt: true,
                warnOnRestrictedSites: true,
                maxPagesPerSite: 1000
            }
        };
        
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0'
        ];
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(['advancedSettings']);
            return result.advancedSettings || this.defaultSettings;
        } catch (error) {
            console.error('[Settings] Failed to load:', error);
            return this.defaultSettings;
        }
    }
    
    async saveSettings(settings) {
        try {
            await chrome.storage.local.set({ advancedSettings: settings });
            return { success: true };
        } catch (error) {
            console.error('[Settings] Failed to save:', error);
            return { success: false, error: error.message };
        }
    }
    
    async resetSettings() {
        return this.saveSettings(this.defaultSettings);
    }
    
    getRandomUserAgent() {
        const index = Math.floor(Math.random() * this.userAgents.length);
        return this.userAgents[index];
    }
    
    async checkRateLimit(settings) {
        const lastRequest = await this.getLastRequestTime();
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequest;
        
        if (settings.rateLimiting.enabled) {
            const minDelay = settings.rateLimiting.delayBetweenRequests;
            if (timeSinceLastRequest < minDelay) {
                const waitTime = minDelay - timeSinceLastRequest;
                await this.sleep(waitTime);
            }
        }
        
        await this.setLastRequestTime(now);
    }
    
    async getLastRequestTime() {
        const result = await chrome.storage.local.get(['lastRequestTime']);
        return result.lastRequestTime || 0;
    }
    
    async setLastRequestTime(time) {
        await chrome.storage.local.set({ lastRequestTime: time });
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async checkSiteRestrictions(url) {
        const settings = await this.loadSettings();
        
        if (!settings.legal.respectTermsOfService) {
            return { allowed: true };
        }
        
        // Check against common restricted patterns
        const restrictedPatterns = [
            /facebook\.com/i,
            /twitter\.com/i,
            /instagram\.com/i,
            /linkedin\.com/i,
            /banking/i,
            /payment/i,
            /auth/i,
            /login/i
        ];
        
        for (const pattern of restrictedPatterns) {
            if (pattern.test(url)) {
                return {
                    allowed: false,
                    reason: 'This site may have terms of service restrictions on scraping'
                };
            }
        }
        
        return { allowed: true };
    }
    
    async checkRobotsTxt(url) {
        const settings = await this.loadSettings();
        
        if (!settings.legal.checkRobotsTxt) {
            return { allowed: true };
        }
        
        try {
            const urlObj = new URL(url);
            const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
            
            const response = await fetch(robotsUrl);
            if (!response.ok) {
                return { allowed: true }; // No robots.txt found
            }
            
            const robotsTxt = await response.text();
            
            // Simple check for Disallow directives
            if (robotsTxt.includes('Disallow: /')) {
                return {
                    allowed: false,
                    reason: 'robots.txt contains global disallow directive'
                };
            }
            
            return { allowed: true };
        } catch (error) {
            // If we can't fetch robots.txt, allow by default
            return { allowed: true };
        }
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedSettings;
}
