/**
 * Session Manager - إدارة الجلسات والكوكيز
 * Advanced session management with cookies, localStorage, and login state
 */

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.cookieStore = new Map();
    }

    /**
     * حفظ جلسة كاملة
     */
    async saveSession(sessionName, options = {}) {
        const session = {
            name: sessionName,
            timestamp: Date.now(),
            url: options.url || '',
            cookies: await this.getCookies(options.url),
            localStorage: await this.getLocalStorage(),
            sessionStorage: await this.getSessionStorage(),
            authState: options.authState || null,
            customData: options.customData || {}
        };

        // Store in Chrome storage
        const sessions = await this.getAllSessions();
        sessions[sessionName] = session;
        
        await chrome.storage.local.set({ 
            'onpage_sessions': sessions 
        });

        this.sessions.set(sessionName, session);
        
        return { success: true, session };
    }

    /**
     * استرجاع جلسة محفوظة
     */
    async restoreSession(sessionName) {
        const sessions = await this.getAllSessions();
        const session = sessions[sessionName];

        if (!session) {
            return { success: false, error: 'Session not found' };
        }

        try {
            // Restore cookies
            if (session.cookies && session.cookies.length > 0) {
                await this.setCookies(session.cookies);
            }

            // Note: localStorage and sessionStorage need to be restored via content script
            // Send message to content script to restore storage
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'restoreStorage',
                    localStorage: session.localStorage,
                    sessionStorage: session.sessionStorage
                });
            }

            return { 
                success: true, 
                session,
                message: 'Session restored successfully'
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    /**
     * الحصول على جميع الجلسات المحفوظة
     */
    async getAllSessions() {
        const result = await chrome.storage.local.get(['onpage_sessions']);
        return result.onpage_sessions || {};
    }

    /**
     * حذف جلسة
     */
    async deleteSession(sessionName) {
        const sessions = await this.getAllSessions();
        delete sessions[sessionName];
        
        await chrome.storage.local.set({ 
            'onpage_sessions': sessions 
        });

        this.sessions.delete(sessionName);
        
        return { success: true };
    }

    /**
     * الحصول على الكوكيز
     */
    async getCookies(url) {
        try {
            const cookies = await chrome.cookies.getAll(url ? { url } : {});
            return cookies;
        } catch (error) {
            console.error('Error getting cookies:', error);
            return [];
        }
    }

    /**
     * تعيين الكوكيز
     */
    async setCookies(cookies) {
        const results = [];
        
        for (const cookie of cookies) {
            try {
                await chrome.cookies.set({
                    url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    sameSite: cookie.sameSite || 'no_restriction',
                    expirationDate: cookie.expirationDate
                });
                results.push({ success: true, cookie: cookie.name });
            } catch (error) {
                results.push({ success: false, cookie: cookie.name, error: error.message });
            }
        }
        
        return results;
    }

    /**
     * الحصول على localStorage (عبر content script)
     */
    async getLocalStorage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) return {};

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getLocalStorage'
            });

            return response?.data || {};
        } catch (error) {
            return {};
        }
    }

    /**
     * الحصول على sessionStorage (عبر content script)
     */
    async getSessionStorage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) return {};

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getSessionStorage'
            });

            return response?.data || {};
        } catch (error) {
            return {};
        }
    }

    /**
     * مسح جميع الكوكيز لنطاق محدد
     */
    async clearCookies(url) {
        const cookies = await this.getCookies(url);
        
        for (const cookie of cookies) {
            await chrome.cookies.remove({
                url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                name: cookie.name
            });
        }
        
        return { success: true, removed: cookies.length };
    }

    /**
     * التحقق من حالة تسجيل الدخول
     */
    async checkLoginState(indicators = []) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) return { loggedIn: false };

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'checkLoginState',
                indicators
            });

            return response || { loggedIn: false };
        } catch (error) {
            return { loggedIn: false, error: error.message };
        }
    }

    /**
     * حفظ بيانات تسجيل الدخول (مشفرة)
     */
    async saveLoginCredentials(site, credentials) {
        const encrypted = await this.encryptData(credentials);
        
        const logins = await this.getAllLogins();
        logins[site] = {
            encrypted,
            timestamp: Date.now()
        };

        await chrome.storage.local.set({
            'onpage_logins': logins
        });

        return { success: true };
    }

    /**
     * الحصول على بيانات تسجيل الدخول
     */
    async getLoginCredentials(site) {
        const logins = await this.getAllLogins();
        const login = logins[site];

        if (!login) {
            return { success: false, error: 'No credentials found' };
        }

        const decrypted = await this.decryptData(login.encrypted);
        
        return { success: true, credentials: decrypted };
    }

    async getAllLogins() {
        const result = await chrome.storage.local.get(['onpage_logins']);
        return result.onpage_logins || {};
    }

    /**
     * تشفير بسيط (في الإنتاج، استخدم Web Crypto API)
     */
    async encryptData(data) {
        // Simple base64 encoding (for demo - use proper encryption in production)
        return btoa(JSON.stringify(data));
    }

    async decryptData(encrypted) {
        try {
            return JSON.parse(atob(encrypted));
        } catch (e) {
            return null;
        }
    }

    /**
     * تصدير جميع الجلسات
     */
    async exportSessions() {
        const sessions = await this.getAllSessions();
        const blob = new Blob([JSON.stringify(sessions, null, 2)], {
            type: 'application/json'
        });
        
        return {
            success: true,
            data: sessions,
            blob
        };
    }

    /**
     * استيراد جلسات
     */
    async importSessions(sessionsData) {
        try {
            const sessions = typeof sessionsData === 'string' 
                ? JSON.parse(sessionsData) 
                : sessionsData;

            await chrome.storage.local.set({
                'onpage_sessions': sessions
            });

            return { success: true, count: Object.keys(sessions).length };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionManager;
}
