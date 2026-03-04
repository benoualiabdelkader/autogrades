(function() {
if (window.__loaded_StealthEngine) return;
window.__loaded_StealthEngine = true;

/**
 * StealthEngine v1.0 — Anti-Detection & Session Management
 *
 * Prevents scraping detection by mimicking real human browser behavior.
 * Also handles login session persistence and cookie management.
 *
 * FEATURES:
 *  • Browser fingerprint masking (navigator, webdriver, plugins)
 *  • Human-like timing (random delays, mouse jitter simulation)
 *  • Session cookie preservation across scraping runs
 *  • Login form detection and auto-fill from saved credentials
 *  • Rate limiting with adaptive backoff
 *  • Referrer chain simulation
 *  • Request header randomization
 */

class StealthEngine {
  constructor() {
    this._applied = false;
    this._requestCount = 0;
    this._requestTimes = [];
    this._rateLimit = { maxPerMinute: 30, backoffMs: 2000 };
  }

  // ═══════════════════════════════════════════════════════════════
  //  ANTI-DETECTION: Apply stealth patches to the page
  // ═══════════════════════════════════════════════════════════════

  applyStealthPatches() {
    if (this._applied) return;
    this._applied = true;

    try {
      // 1. Hide webdriver flag
      Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true });

      // 2. Chrome runtime check — make it look like a normal Chrome
      if (!window.chrome) {
        window.chrome = { runtime: {} };
      }

      // 3. Override plugins to look like a real browser
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', description: '', filename: 'internal-nacl-plugin' },
        ],
        configurable: true,
      });

      // 4. Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true,
      });

      // 5. Override permissions API to avoid detection
      if (navigator.permissions) {
        const originalQuery = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = (params) => {
          if (params.name === 'notifications') {
            return Promise.resolve({ state: 'prompt', onchange: null });
          }
          return originalQuery(params);
        };
      }

      // 6. Canvas fingerprint randomization (subtle noise)
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, attrs) {
        const ctx = origGetContext.call(this, type, attrs);
        if (type === '2d' && ctx) {
          const origGetImageData = ctx.getImageData.bind(ctx);
          ctx.getImageData = function(x, y, w, h) {
            const data = origGetImageData(x, y, w, h);
            // Add tiny noise to a few pixels
            for (let i = 0; i < Math.min(10, data.data.length); i += 4) {
              data.data[i] = (data.data[i] + (Math.random() > 0.5 ? 1 : -1)) & 0xFF;
            }
            return data;
          };
        }
        return ctx;
      };

      // 7. WebGL renderer masking
      const getParameterProto = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(param) {
        // UNMASKED_VENDOR_WEBGL / UNMASKED_RENDERER_WEBGL
        if (param === 0x9245) return 'Intel Inc.';
        if (param === 0x9246) return 'Intel Iris OpenGL Engine';
        return getParameterProto.call(this, param);
      };

      // 8. Connection type spoofing
      if (navigator.connection) {
        Object.defineProperty(navigator.connection, 'rtt', { get: () => 50 + Math.floor(Math.random() * 50), configurable: true });
      }

      console.log('[Stealth] Anti-detection patches applied');
    } catch (e) {
      console.warn('[Stealth] Partial patch failure:', e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  HUMAN-LIKE BEHAVIOR SIMULATION
  // ═══════════════════════════════════════════════════════════════

  /** Random delay that mimics human page reading time */
  async humanDelay(minMs = 800, maxMs = 3000) {
    const base = minMs + Math.random() * (maxMs - minMs);
    // Add micro-pauses for realism
    const jitter = Math.random() * 200 - 100;
    await new Promise(r => setTimeout(r, Math.max(100, base + jitter)));
  }

  /** Simulate mouse movement to avoid inactivity detection */
  simulateMouseMovement() {
    const events = ['mousemove', 'pointermove'];
    const x = 100 + Math.random() * (window.innerWidth - 200);
    const y = 100 + Math.random() * (window.innerHeight - 200);
    for (const type of events) {
      document.dispatchEvent(new MouseEvent(type, {
        clientX: x, clientY: y, bubbles: true, cancelable: true,
      }));
    }
  }

  /** Simulate a subtle scroll to mimic human reading */
  simulateScroll() {
    const amount = 50 + Math.random() * 200;
    window.scrollBy({ top: amount, behavior: 'smooth' });
  }

  /** Full human behavior simulation cycle */
  async simulateHumanActivity() {
    this.simulateMouseMovement();
    await this.humanDelay(300, 800);
    this.simulateScroll();
    await this.humanDelay(500, 1500);
  }

  // ═══════════════════════════════════════════════════════════════
  //  RATE LIMITING
  // ═══════════════════════════════════════════════════════════════

  /** Check if we should wait before next request */
  async enforceRateLimit() {
    const now = Date.now();
    this._requestTimes = this._requestTimes.filter(t => now - t < 60000);

    if (this._requestTimes.length >= this._rateLimit.maxPerMinute) {
      const waitTime = this._rateLimit.backoffMs * (1 + Math.random());
      console.log(`[Stealth] Rate limit: waiting ${Math.round(waitTime)}ms`);
      await new Promise(r => setTimeout(r, waitTime));
      // Increase backoff for repeated limits
      this._rateLimit.backoffMs = Math.min(this._rateLimit.backoffMs * 1.5, 15000);
    } else {
      // Reset backoff when under limit
      this._rateLimit.backoffMs = 2000;
    }

    this._requestTimes.push(now);
    this._requestCount++;
  }

  setRateLimit(maxPerMinute) {
    this._rateLimit.maxPerMinute = Math.max(1, maxPerMinute);
  }

  // ═══════════════════════════════════════════════════════════════
  //  SESSION & LOGIN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /** Detect if the current page has a login form */
  detectLoginForm() {
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const passwordInput = form.querySelector('input[type="password"]');
      if (!passwordInput) continue;

      const usernameInput = form.querySelector(
        'input[type="text"], input[type="email"], input[name*="user"], input[name*="email"], input[name*="login"], input[id*="user"], input[id*="email"]'
      );

      if (usernameInput) {
        return {
          form,
          usernameInput,
          passwordInput,
          submitButton: form.querySelector('button[type="submit"], input[type="submit"], button:not([type])'),
          action: form.action,
          method: form.method,
        };
      }
    }
    return null;
  }

  /** Check if user is currently logged in (heuristic) */
  isLoggedIn() {
    // Check for common logged-in indicators
    const indicators = [
      // Logout links
      'a[href*="logout"]', 'a[href*="signout"]', 'a[href*="log_out"]',
      'button[id*="logout"]', '[data-action="logout"]',
      // User menus
      '.user-menu', '.usermenu', '#user-menu', '.dropdown-user',
      '.avatar', '.user-avatar', '.profile-pic',
      // Dashboard indicators
      '[class*="dashboard"]', '[class*="my-courses"]',
      // Common logged-in classes
      '.logged-in', 'body.loggedin', 'body[class*="loggedin"]',
    ];

    for (const sel of indicators) {
      try { if (document.querySelector(sel)) return true; } catch {}
    }

    // Check body class
    const bodyClass = document.body?.className || '';
    if (/logged.?in|authenticated|signed.?in/i.test(bodyClass)) return true;

    // Check cookies
    if (document.cookie.includes('session') || document.cookie.includes('token') || document.cookie.includes('auth')) {
      return true;
    }

    return false;
  }

  /** Save session cookies for persistence */
  async saveSession(siteKey) {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    const cookies = document.cookie;
    const sessionData = {
      cookies,
      url: window.location.origin,
      timestamp: Date.now(),
      isLoggedIn: this.isLoggedIn(),
    };
    await chrome.storage.local.set({ [`session_${siteKey}`]: sessionData });
    console.log(`[Stealth] Session saved for ${siteKey}`);
  }

  /** Load a previously saved session */
  async loadSession(siteKey) {
    if (typeof chrome === 'undefined' || !chrome.storage) return null;
    return new Promise(resolve => {
      chrome.storage.local.get([`session_${siteKey}`], result => {
        resolve(result[`session_${siteKey}`] || null);
      });
    });
  }

  /** Get a site key from the current URL */
  getSiteKey() {
    try { return new URL(window.location.href).hostname.replace(/\./g, '_'); }
    catch { return 'unknown'; }
  }

  // ═══════════════════════════════════════════════════════════════
  //  REQUEST HEADER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /** Generate realistic request headers */
  getHeaders() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    ];
    return {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    };
  }
}

if (typeof window !== 'undefined') window.StealthEngine = StealthEngine;
if (typeof self !== 'undefined') self.StealthEngine = StealthEngine;
})();
