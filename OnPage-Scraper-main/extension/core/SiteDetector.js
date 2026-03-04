(function() {
if (window.__loaded_SiteDetector) return;
window.__loaded_SiteDetector = true;

/**
 * SiteDetector v1.0 — Automatic Platform & Page Type Recognition
 *
 * Detects what kind of website/platform the user is on and what
 * page type they're viewing. This determines the optimal scraping
 * strategy.
 *
 * SUPPORTED PLATFORMS:
 *  • Moodle, Canvas, Blackboard, Google Classroom, Schoology
 *  • WordPress, Drupal, Joomla, Shopify, Wix
 *  • Custom/unknown sites (generic strategy)
 *
 * PAGE TYPES:
 *  • Dashboard, Course, Assignment, Grades, Forum
 *  • Product list, Article, Profile, Search results
 *  • Table page, Form page, Card grid
 */

class SiteDetector {
  constructor() {
    this._cache = null;
  }

  /**
   * Detect the current platform and page type.
   * Returns { platform, pageType, confidence, features }
   */
  detect() {
    if (this._cache) return this._cache;

    const result = {
      platform: 'unknown',
      pageType: 'generic',
      confidence: 0,
      features: {},
      url: window.location.href,
      domain: window.location.hostname,
    };

    // Try each platform detector
    const detectors = [
      this._detectMoodle,
      this._detectCanvas,
      this._detectBlackboard,
      this._detectGoogleClassroom,
      this._detectSchoology,
      this._detectWordPress,
      this._detectShopify,
      this._detectGeneric,
    ];

    for (const detector of detectors) {
      const match = detector.call(this);
      if (match && match.confidence > result.confidence) {
        Object.assign(result, match);
      }
    }

    // Always detect page structural features
    result.features = this._detectFeatures();

    this._cache = result;
    console.log(`[SiteDetector] ${result.platform} / ${result.pageType} (${result.confidence}% confidence)`);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  //  PLATFORM DETECTORS
  // ═══════════════════════════════════════════════════════════════

  _detectMoodle() {
    let score = 0;
    const body = document.body;
    const bodyId = body?.id || '';
    const bodyClass = body?.className || '';

    if (bodyId.startsWith('page-')) score += 30;
    if (bodyClass.includes('path-')) score += 20;
    if (bodyClass.includes('pagelayout-')) score += 20;
    if (document.querySelector('meta[name="generator"][content*="Moodle"]')) score += 40;
    try { if (typeof M !== 'undefined' && M.cfg) score += 40; } catch {}
    if (document.querySelector('script[src*="moodle"]')) score += 15;
    if (document.querySelector('.usermenu')) score += 10;

    if (score < 30) return null;

    // Detect page type
    const url = window.location.pathname;
    let pageType = 'generic';
    if (url.includes('/my/') || url === '/') pageType = 'dashboard';
    else if (url.includes('/course/view.php')) pageType = 'course';
    else if (url.includes('/mod/assign/')) pageType = 'assignment';
    else if (url.includes('/mod/quiz/')) pageType = 'quiz';
    else if (url.includes('/grade/')) pageType = 'grades';
    else if (url.includes('/mod/forum/')) pageType = 'forum';
    else if (url.includes('/user/')) pageType = 'profile';

    return { platform: 'moodle', pageType, confidence: Math.min(score, 100) };
  }

  _detectCanvas() {
    let score = 0;
    if (document.querySelector('#application, #content.ic-Layout-contentMain')) score += 30;
    if (document.querySelector('link[href*="instructure"]')) score += 30;
    if (window.location.hostname.includes('instructure.com')) score += 40;
    if (document.querySelector('.ic-app')) score += 25;

    if (score < 30) return null;

    const url = window.location.pathname;
    let pageType = 'generic';
    if (url.includes('/dashboard')) pageType = 'dashboard';
    else if (url.match(/\/courses\/\d+$/)) pageType = 'course';
    else if (url.includes('/assignments')) pageType = 'assignment';
    else if (url.includes('/grades')) pageType = 'grades';
    else if (url.includes('/quizzes')) pageType = 'quiz';

    return { platform: 'canvas', pageType, confidence: Math.min(score, 100) };
  }

  _detectBlackboard() {
    let score = 0;
    if (document.querySelector('#Learn_BBLEARN')) score += 40;
    if (document.querySelector('meta[name="author"][content*="Blackboard"]')) score += 40;
    if (window.location.hostname.includes('blackboard')) score += 30;
    if (document.querySelector('.portletList, .stream, #module')) score += 20;

    if (score < 30) return null;

    let pageType = 'generic';
    const url = window.location.pathname;
    if (url.includes('/webapps/portal')) pageType = 'dashboard';
    else if (url.includes('/listContent')) pageType = 'course';
    else if (url.includes('/assignment')) pageType = 'assignment';
    else if (url.includes('/gradebook')) pageType = 'grades';

    return { platform: 'blackboard', pageType, confidence: Math.min(score, 100) };
  }

  _detectGoogleClassroom() {
    let score = 0;
    if (window.location.hostname === 'classroom.google.com') score += 80;
    if (document.querySelector('[data-course-id]')) score += 30;

    if (score < 30) return null;

    const url = window.location.pathname;
    let pageType = 'generic';
    if (url === '/' || url === '/u/0/h') pageType = 'dashboard';
    else if (url.match(/\/c\/\w+$/)) pageType = 'course';
    else if (url.includes('/a/')) pageType = 'assignment';

    return { platform: 'google-classroom', pageType, confidence: Math.min(score, 100) };
  }

  _detectSchoology() {
    let score = 0;
    if (window.location.hostname.includes('schoology')) score += 50;
    if (document.querySelector('.sgy-header')) score += 30;
    if (document.querySelector('[class*="schoology"]')) score += 20;

    if (score < 30) return null;
    return { platform: 'schoology', pageType: 'generic', confidence: Math.min(score, 100) };
  }

  _detectWordPress() {
    let score = 0;
    if (document.querySelector('meta[name="generator"][content*="WordPress"]')) score += 50;
    if (document.querySelector('link[href*="wp-content"]')) score += 30;
    if (document.body?.className.includes('wp-')) score += 20;

    if (score < 30) return null;

    let pageType = 'generic';
    if (document.querySelector('.blog, .archive, .home')) pageType = 'blog';
    else if (document.querySelector('.single-post, article.post')) pageType = 'article';
    else if (document.querySelector('.woocommerce')) pageType = 'shop';

    return { platform: 'wordpress', pageType, confidence: Math.min(score, 100) };
  }

  _detectShopify() {
    let score = 0;
    if (window.Shopify) score += 60;
    if (document.querySelector('meta[name="shopify-checkout-api-token"]')) score += 40;
    if (document.querySelector('link[href*="cdn.shopify"]')) score += 30;

    if (score < 30) return null;

    let pageType = 'generic';
    if (window.location.pathname.includes('/collections')) pageType = 'product-list';
    else if (window.location.pathname.includes('/products/')) pageType = 'product';
    else if (window.location.pathname === '/') pageType = 'homepage';

    return { platform: 'shopify', pageType, confidence: Math.min(score, 100) };
  }

  _detectGeneric() {
    // Always matches with low confidence
    const url = window.location.pathname.toLowerCase();
    let pageType = 'generic';

    if (url.match(/\/(search|results|find)/)) pageType = 'search-results';
    else if (url.match(/\/(login|signin|sign-in)/)) pageType = 'login';
    else if (url.match(/\/(profile|account|settings)/)) pageType = 'profile';
    else if (url.match(/\/(dashboard|home|overview)/)) pageType = 'dashboard';
    else if (document.querySelectorAll('table').length > 0) pageType = 'table-page';
    else if (document.querySelectorAll('form').length > 0) pageType = 'form-page';

    return { platform: 'generic', pageType, confidence: 10 };
  }

  // ═══════════════════════════════════════════════════════════════
  //  STRUCTURAL FEATURE DETECTION
  // ═══════════════════════════════════════════════════════════════

  _detectFeatures() {
    return {
      hasTables: document.querySelectorAll('table').length,
      hasForms: document.querySelectorAll('form').length,
      hasCards: document.querySelectorAll('[class*="card"],[class*="item"],[class*="tile"],article').length,
      hasLists: document.querySelectorAll('ul li, ol li').length,
      hasPagination: !!document.querySelector('.pagination, .paging, [class*="pagina"], a[rel="next"]'),
      hasInfiniteScroll: !!document.querySelector('[data-infinite-scroll], [class*="infinite"], [class*="load-more"]'),
      hasLoginForm: !!document.querySelector('input[type="password"]'),
      isSPA: !!document.querySelector('[id="app"], [id="root"], [data-reactroot], [ng-app], [data-v-]'),
      hasIframes: document.querySelectorAll('iframe').length,
      totalLinks: document.querySelectorAll('a[href]').length,
      totalImages: document.querySelectorAll('img').length,
    };
  }
}

if (typeof window !== 'undefined') window.SiteDetector = SiteDetector;
})();
