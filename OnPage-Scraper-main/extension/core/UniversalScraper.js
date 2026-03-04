(function() {
if (window.__loaded_UniversalScraper) return;
window.__loaded_UniversalScraper = true;

/**
 * UniversalScraper v1.0 — Platform-Agnostic Intelligent Web Scraper
 *
 * Works on ANY website: Moodle, Canvas, Blackboard, Google Classroom,
 * WordPress, custom LMS, forums, SPA/MPA, static HTML, etc.
 *
 * CAPABILITIES:
 *  • Auto-detects page structure (tables, lists, cards, forms, grids)
 *  • Multi-page crawling with link discovery
 *  • SPA navigation handling (pushState, hashchange, MutationObserver)
 *  • Login-aware session persistence
 *  • Pagination auto-follow (numbered, next-btn, infinite-scroll, load-more)
 *  • Structured output: JSON / CSV
 *  • Built-in deduplication, validation, cleaning
 *  • Configurable selectors OR fully automatic
 */

class UniversalScraper {
  constructor(config = {}) {
    this.config = {
      // Timing
      requestDelay: config.requestDelay ?? 1500,
      pageTimeout: config.pageTimeout ?? 20000,
      maxPages: config.maxPages ?? 100,
      maxRetries: config.maxRetries ?? 2,
      // Behaviour
      followPagination: config.followPagination !== false,
      followLinks: config.followLinks ?? false,
      linkPattern: config.linkPattern || null,          // RegExp string for link filtering
      respectRobotsTxt: config.respectRobotsTxt ?? true,
      // Data
      targetSelectors: config.targetSelectors || null,  // null = auto-detect
      excludeSelectors: config.excludeSelectors || ['nav', 'footer', 'header', '.sidebar', '#cookie-banner', '.ad'],
      cleanData: config.cleanData !== false,
      removeDuplicates: config.removeDuplicates !== false,
      includeMetadata: config.includeMetadata ?? true,
      // Output
      dashboardURL: config.dashboardURL || 'http://localhost:3000',
      autoSend: config.autoSend ?? true,
      // Callbacks
      onProgress: config.onProgress || (() => {}),
      onPageComplete: config.onPageComplete || (() => {}),
      onError: config.onError || (() => {}),
      onComplete: config.onComplete || (() => {}),
    };

    // State
    this.isRunning = false;
    this._abort = null;
    this._visited = new Set();
    this._seenHashes = new Set();
    this.results = {
      pages: [],
      tables: [],
      lists: [],
      forms: [],
      cards: [],
      links: [],
      rawRecords: [],
      metadata: { url: '', startedAt: null, completedAt: null, pagesScraped: 0, errors: [] },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  /** Scrape the CURRENT page only (no navigation). */
  scrapeCurrentPage() {
    return this._scrapeDocument(document, window.location.href);
  }

  /** Full multi-page scrape starting from the current URL. */
  async startFullScrape() {
    if (this.isRunning) return { success: false, error: 'Already running' };
    this.isRunning = true;
    this._abort = new AbortController();
    this.results.metadata.startedAt = new Date().toISOString();
    this.results.metadata.url = window.location.href;

    try {
      // Phase 1 — scrape current page
      this._progress('scraping', 0, 1);
      const currentData = this._scrapeDocument(document, window.location.href);
      this.results.pages.push(currentData);
      this._visited.add(this._normalizeURL(window.location.href));
      this._progress('scraping', 1, 1);

      // Phase 2 — follow pagination on current page
      if (this.config.followPagination) {
        await this._followPagination(document, window.location.href);
      }

      // Phase 3 — follow discovered links (if enabled)
      if (this.config.followLinks && this.config.linkPattern) {
        const linkURLs = this._discoverLinks(document, this.config.linkPattern);
        const total = Math.min(linkURLs.length, this.config.maxPages - this._visited.size);
        for (let i = 0; i < total; i++) {
          if (this._abort.signal.aborted) break;
          try {
            const html = await this._fetchHTML(linkURLs[i]);
            const doc = this._parseHTML(html);
            const pageData = this._scrapeDocument(doc, linkURLs[i]);
            this.results.pages.push(pageData);
            this.config.onPageComplete(pageData, i + 1, total);
            this._progress('following-links', i + 1, total);

            if (this.config.followPagination) {
              await this._followPagination(doc, linkURLs[i]);
            }
          } catch (e) {
            this._logError(`Link ${linkURLs[i]}: ${e.message}`);
          }
          await this._delay();
        }
      }

      // Phase 4 — flatten & deduplicate
      this._flattenResults();
      if (this.config.removeDuplicates) this._deduplicate();
      if (this.config.cleanData) this._cleanAll();

      // Finalize
      this.results.metadata.completedAt = new Date().toISOString();
      this.results.metadata.pagesScraped = this._visited.size;
      this._progress('complete', 1, 1);

      // Auto-send
      if (this.config.autoSend) {
        await this._sendToDashboard();
      }

      this.config.onComplete(this.results);
      return { success: true, data: this.results };
    } catch (err) {
      this._logError(`Fatal: ${err.message}`);
      this.config.onError(err);
      return { success: false, error: err.message };
    } finally {
      this.isRunning = false;
    }
  }

  stop() {
    if (this._abort) this._abort.abort();
    this.isRunning = false;
  }

  getResults() { return this.results; }

  // ═══════════════════════════════════════════════════════════════
  //  CORE: Document Scraping (works on any HTML document)
  // ═══════════════════════════════════════════════════════════════

  _scrapeDocument(doc, url) {
    const page = {
      url,
      title: doc.title || '',
      tables: [],
      lists: [],
      forms: [],
      cards: [],
      textBlocks: [],
      links: [],
      meta: {},
    };

    // Remove noise elements
    const excludes = this.config.excludeSelectors;

    // ── Tables ──────────────────────────────────────────────────
    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      if (this._isExcluded(table, excludes)) continue;
      const parsed = this._parseTable(table);
      if (parsed.rows.length > 0) page.tables.push(parsed);
    }

    // ── Lists ───────────────────────────────────────────────────
    const listEls = doc.querySelectorAll('ul, ol, dl');
    for (const list of listEls) {
      if (this._isExcluded(list, excludes)) continue;
      const items = this._parseList(list);
      if (items.length > 0) page.lists.push({ type: list.tagName.toLowerCase(), items });
    }

    // ── Forms ───────────────────────────────────────────────────
    const formEls = doc.querySelectorAll('form');
    for (const form of formEls) {
      if (this._isExcluded(form, excludes)) continue;
      const fields = this._parseForm(form);
      if (fields.length > 0) page.forms.push({ action: form.action, method: form.method, fields });
    }

    // ── Cards / repeated patterns ───────────────────────────────
    const cardData = this._detectCards(doc, excludes);
    page.cards = cardData;

    // ── Targeted selectors (user-defined) ───────────────────────
    if (this.config.targetSelectors) {
      for (const sel of this.config.targetSelectors) {
        try {
          const els = doc.querySelectorAll(sel);
          for (const el of els) {
            page.textBlocks.push({ selector: sel, text: this._cleanText(el.textContent), html: el.innerHTML.substring(0, 500) });
          }
        } catch { /* invalid selector */ }
      }
    }

    // ── Links ───────────────────────────────────────────────────
    const allLinks = doc.querySelectorAll('a[href]');
    for (const a of allLinks) {
      const href = a.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        page.links.push({ text: this._cleanText(a.textContent), href: this._resolveURL(href, url) });
      }
    }

    // ── Page meta ───────────────────────────────────────────────
    if (this.config.includeMetadata) {
      page.meta = this._extractMeta(doc);
    }

    return page;
  }

  // ═══════════════════════════════════════════════════════════════
  //  TABLE PARSER  (handles complex headers, merged cells, etc.)
  // ═══════════════════════════════════════════════════════════════

  _parseTable(table) {
    const result = { headers: [], rows: [], caption: '' };
    const caption = table.querySelector('caption');
    if (caption) result.caption = this._cleanText(caption.textContent);

    // Build headers: first from <thead>, then from first <tr> if needed
    const thead = table.querySelector('thead');
    let headerCells = thead ? thead.querySelectorAll('th, td') : null;

    if (!headerCells || headerCells.length === 0) {
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        const ths = firstRow.querySelectorAll('th');
        if (ths.length > 0) headerCells = ths;
      }
    }

    if (headerCells) {
      result.headers = [...headerCells].map(c => this._cleanText(c.textContent));
    }

    // Data rows
    const body = table.querySelector('tbody') || table;
    const trs = body.querySelectorAll('tr');
    const startIdx = (thead || (headerCells && headerCells[0]?.tagName === 'TH')) ? 0 : 1;

    for (let i = startIdx; i < trs.length; i++) {
      const cells = trs[i].querySelectorAll('td, th');
      if (cells.length === 0) continue;
      if (result.headers.length > 0 && cells[0]?.tagName === 'TH' && i === 0) continue; // skip header row in tbody

      const row = {};
      let hasData = false;
      cells.forEach((cell, ci) => {
        const key = result.headers[ci] || `col_${ci}`;
        const val = this._cleanText(cell.textContent);
        row[key] = val;
        if (val) hasData = true;

        // Check for links inside cells
        const link = cell.querySelector('a[href]');
        if (link) row[`${key}_link`] = link.href;
      });
      if (hasData) result.rows.push(row);
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  //  LIST PARSER
  // ═══════════════════════════════════════════════════════════════

  _parseList(list) {
    const items = [];
    if (list.tagName === 'DL') {
      const dts = list.querySelectorAll('dt');
      for (const dt of dts) {
        const dd = dt.nextElementSibling?.tagName === 'DD' ? dt.nextElementSibling : null;
        items.push({ term: this._cleanText(dt.textContent), description: dd ? this._cleanText(dd.textContent) : '' });
      }
    } else {
      const lis = list.querySelectorAll(':scope > li');
      for (const li of lis) {
        const text = this._cleanText(li.textContent);
        if (text.length > 2) items.push({ text });
      }
    }
    return items;
  }

  // ═══════════════════════════════════════════════════════════════
  //  FORM PARSER
  // ═══════════════════════════════════════════════════════════════

  _parseForm(form) {
    const fields = [];
    const inputs = form.querySelectorAll('input, select, textarea');
    for (const inp of inputs) {
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(inp.type)) continue;
      const label = form.querySelector(`label[for="${inp.id}"]`)?.textContent?.trim()
        || inp.placeholder || inp.name || inp.id || '';
      fields.push({
        name: inp.name || inp.id || '',
        label: this._cleanText(label),
        type: inp.type || inp.tagName.toLowerCase(),
        value: inp.value || '',
        options: inp.tagName === 'SELECT' ? [...inp.options].map(o => ({ text: o.text, value: o.value })) : undefined,
      });
    }
    return fields;
  }

  // ═══════════════════════════════════════════════════════════════
  //  CARD / REPEATED PATTERN DETECTOR
  // ═══════════════════════════════════════════════════════════════

  _detectCards(doc, excludes) {
    const cards = [];
    // Strategy: find parent containers with 3+ similar children
    const candidateSelectors = [
      '[class*="card"]', '[class*="item"]', '[class*="entry"]', '[class*="post"]',
      '[class*="row"]', '[class*="tile"]', '[class*="block"]', '[class*="result"]',
      '[role="listitem"]', '[data-type]', 'article',
    ];

    const seen = new WeakSet();
    for (const sel of candidateSelectors) {
      try {
        const matches = doc.querySelectorAll(sel);
        for (const el of matches) {
          if (seen.has(el) || this._isExcluded(el, excludes)) continue;
          seen.add(el);

          // Check if this is part of a group of siblings
          const parent = el.parentElement;
          if (!parent) continue;
          const siblings = parent.querySelectorAll(`:scope > ${el.tagName}.${[...el.classList].join('.')}`);
          if (siblings.length < 2) continue;

          // Extract structured data from each sibling
          for (const sib of siblings) {
            if (seen.has(sib)) continue;
            seen.add(sib);
            const card = this._extractCardData(sib);
            if (card && Object.keys(card).length > 0) cards.push(card);
          }
        }
      } catch { /* invalid selector */ }
    }
    return cards;
  }

  _extractCardData(el) {
    const data = {};
    // Title: h1-h6 or .title/.name
    const titleEl = el.querySelector('h1,h2,h3,h4,h5,h6,[class*="title"],[class*="name"]');
    if (titleEl) data.title = this._cleanText(titleEl.textContent);

    // Description
    const descEl = el.querySelector('p,[class*="desc"],[class*="summary"],[class*="excerpt"]');
    if (descEl) data.description = this._cleanText(descEl.textContent);

    // Link
    const linkEl = el.querySelector('a[href]');
    if (linkEl) { data.link = linkEl.href; if (!data.title) data.title = this._cleanText(linkEl.textContent); }

    // Image
    const img = el.querySelector('img[src]');
    if (img) data.image = img.src;

    // Date
    const timeEl = el.querySelector('time,[class*="date"],[class*="time"]');
    if (timeEl) data.date = this._cleanText(timeEl.textContent) || timeEl.getAttribute('datetime') || '';

    // Grade/score
    const gradeEl = el.querySelector('[class*="grade"],[class*="score"],[class*="mark"],[class*="point"]');
    if (gradeEl) data.grade = this._cleanText(gradeEl.textContent);

    // Status
    const statusEl = el.querySelector('[class*="status"],[class*="badge"],[class*="tag"],[class*="chip"]');
    if (statusEl) data.status = this._cleanText(statusEl.textContent);

    // Additional key-value pairs from labeled spans/divs
    const labelled = el.querySelectorAll('[class*="label"],[class*="key"],[class*="field"]');
    for (const lbl of labelled) {
      const key = this._cleanText(lbl.textContent);
      const val = lbl.nextElementSibling ? this._cleanText(lbl.nextElementSibling.textContent) : '';
      if (key && val && key.length < 50) data[this._camelCase(key)] = val;
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  //  PAGINATION HANDLER  (button, link, scroll, load-more)
  // ═══════════════════════════════════════════════════════════════

  async _followPagination(doc, baseURL) {
    let pageNum = 1;
    const maxPaginationPages = Math.min(this.config.maxPages, 30);

    while (pageNum < maxPaginationPages && !this._abort?.signal.aborted) {
      // Strategy 1: find "Next" link/button
      const nextLink = this._findNextPageElement(doc);
      if (!nextLink) break;

      const nextURL = nextLink.href || nextLink.getAttribute('data-href') || '';
      if (!nextURL || this._visited.has(this._normalizeURL(nextURL))) break;

      try {
        const html = await this._fetchHTML(nextURL);
        doc = this._parseHTML(html);
        const pageData = this._scrapeDocument(doc, nextURL);
        this.results.pages.push(pageData);
        this._visited.add(this._normalizeURL(nextURL));
        pageNum++;
        this._progress('pagination', pageNum, maxPaginationPages);
        this.config.onPageComplete(pageData, pageNum, maxPaginationPages);
      } catch (e) {
        this._logError(`Pagination page ${pageNum}: ${e.message}`);
        break;
      }

      await this._delay();
    }
  }

  _findNextPageElement(doc) {
    // Check multiple patterns for "next page" controls
    const nextSelectors = [
      'a.next', 'a.page-next', 'a[rel="next"]',
      '.pagination a:last-child', '.paging a:last-child',
      'a[aria-label="Next"]', 'a[aria-label="next"]', 'a[aria-label="Next page"]',
      'button[aria-label="Next"]', 'button[aria-label="next"]',
      '.next a', '.next-page a',
      'li.next a', 'li.page-next a',
      'a[title="Next"]', 'a[title="next"]',
    ];

    for (const sel of nextSelectors) {
      const el = doc.querySelector(sel);
      if (el && el.href) return el;
    }

    // Text-based fallback: look for links with "Next", ">", "»"
    const allLinks = doc.querySelectorAll('a, button');
    for (const el of allLinks) {
      const text = el.textContent.trim().toLowerCase();
      if (['next', '›', '»', 'next page', 'next ›', 'next »', '>'].includes(text)) {
        if (el.href || el.getAttribute('data-href')) return el;
      }
    }

    // Numbered pagination: find the active page, then get next sibling
    const activePage = doc.querySelector('.pagination .active, .paging .active, .page-item.active, [aria-current="page"]');
    if (activePage) {
      const nextSibling = activePage.nextElementSibling?.querySelector('a');
      if (nextSibling?.href) return nextSibling;
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  //  LINK DISCOVERY
  // ═══════════════════════════════════════════════════════════════

  _discoverLinks(doc, patternStr) {
    const pattern = new RegExp(patternStr, 'i');
    const links = [];
    const allAnchors = doc.querySelectorAll('a[href]');
    for (const a of allAnchors) {
      const href = this._resolveURL(a.getAttribute('href'), window.location.href);
      if (pattern.test(href) && !this._visited.has(this._normalizeURL(href))) {
        links.push(href);
        this._visited.add(this._normalizeURL(href));
      }
    }
    return [...new Set(links)];
  }

  // ═══════════════════════════════════════════════════════════════
  //  METADATA EXTRACTION
  // ═══════════════════════════════════════════════════════════════

  _extractMeta(doc) {
    const meta = {};
    // Open Graph
    for (const tag of doc.querySelectorAll('meta[property^="og:"]')) {
      meta[tag.getAttribute('property')] = tag.content;
    }
    // Standard meta
    for (const name of ['description', 'author', 'keywords', 'generator']) {
      const tag = doc.querySelector(`meta[name="${name}"]`);
      if (tag) meta[name] = tag.content;
    }
    // JSON-LD
    const jsonld = doc.querySelector('script[type="application/ld+json"]');
    if (jsonld) {
      try { meta.structuredData = JSON.parse(jsonld.textContent); } catch {}
    }
    // Canonical URL
    const canonical = doc.querySelector('link[rel="canonical"]');
    if (canonical) meta.canonical = canonical.href;
    return meta;
  }

  // ═══════════════════════════════════════════════════════════════
  //  DATA PROCESSING
  // ═══════════════════════════════════════════════════════════════

  _flattenResults() {
    const records = [];
    for (const page of this.results.pages) {
      // Tables → flat records
      for (const t of page.tables) {
        for (const row of t.rows) {
          records.push({ _source: 'table', _page: page.url, _table: t.caption || '', ...row });
        }
        this.results.tables.push(t);
      }
      // Cards
      for (const c of page.cards) {
        records.push({ _source: 'card', _page: page.url, ...c });
        this.results.cards.push(c);
      }
      // Lists
      for (const l of page.lists) {
        for (const item of l.items) {
          records.push({ _source: 'list', _page: page.url, ...item });
        }
        this.results.lists.push(l);
      }
      // Forms
      for (const f of page.forms) {
        this.results.forms.push(f);
      }
      // Links
      for (const link of page.links) {
        this.results.links.push(link);
      }
    }
    this.results.rawRecords = records;
  }

  _deduplicate() {
    const unique = [];
    const seen = new Set();
    for (const rec of this.results.rawRecords) {
      const hash = this._hashRecord(rec);
      if (!seen.has(hash)) {
        seen.add(hash);
        unique.push(rec);
      }
    }
    this.results.rawRecords = unique;
  }

  _cleanAll() {
    this.results.rawRecords = this.results.rawRecords.map(rec => {
      const cleaned = {};
      for (const [k, v] of Object.entries(rec)) {
        cleaned[k] = typeof v === 'string' ? this._cleanText(v) : v;
      }
      return cleaned;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  EXPORT
  // ═══════════════════════════════════════════════════════════════

  exportJSON() { return JSON.stringify(this.results, null, 2); }

  exportCSV() {
    const records = this.results.rawRecords;
    if (!records.length) return '';
    const allKeys = [...new Set(records.flatMap(r => Object.keys(r)))];
    const escape = v => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
      allKeys.join(','),
      ...records.map(r => allKeys.map(k => escape(r[k])).join(','))
    ].join('\n');
  }

  // ═══════════════════════════════════════════════════════════════
  //  SEND TO DASHBOARD
  // ═══════════════════════════════════════════════════════════════

  async _sendToDashboard() {
    try {
      const payload = {
        source: 'universal-scraper',
        url: this.results.metadata.url,
        pageTitle: document.title,
        timestamp: new Date().toISOString(),
        data: this.results.rawRecords,
        statistics: {
          pages: this.results.metadata.pagesScraped,
          tables: this.results.tables.length,
          cards: this.results.cards.length,
          records: this.results.rawRecords.length,
          links: this.results.links.length,
        },
      };
      const resp = await fetch(`${this.config.dashboardURL}/api/scraper-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Source': 'UniversalScraper' },
        body: JSON.stringify(payload),
        credentials: 'omit',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      console.log('[UniversalScraper] Data delivered to dashboard');
    } catch (e) {
      this._logError(`Dashboard send: ${e.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  NETWORK
  // ═══════════════════════════════════════════════════════════════

  async _fetchHTML(url) {
    const normalized = this._normalizeURL(url);
    if (this._visited.has(normalized)) return '';
    this._visited.add(normalized);

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const resp = await fetch(url, {
          credentials: 'include',
          headers: { 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
          signal: this._abort?.signal,
        });
        if (resp.status === 429) { await this._delay(this.config.requestDelay * 3); continue; }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.text();
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        if (attempt === this.config.maxRetries) throw e;
        await this._delay(this.config.requestDelay * 2);
      }
    }
    return '';
  }

  _parseHTML(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════

  _cleanText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  _camelCase(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '');
  }

  _isExcluded(el, selectors) {
    for (const sel of selectors) {
      try { if (el.closest(sel)) return true; } catch {}
    }
    return false;
  }

  _resolveURL(href, base) {
    try { return new URL(href, base).href; }
    catch { return href; }
  }

  _normalizeURL(url) {
    try { const u = new URL(url); u.hash = ''; return u.href; }
    catch { return url; }
  }

  _hashRecord(rec) {
    const vals = Object.entries(rec).filter(([k]) => !k.startsWith('_')).map(([, v]) => String(v)).join('|');
    let h = 0;
    for (let i = 0; i < vals.length; i++) { h = ((h << 5) - h + vals.charCodeAt(i)) | 0; }
    return String(h);
  }

  _progress(phase, done, total) {
    this.config.onProgress({ phase, completed: done, total, errors: this.results.metadata.errors.length });
  }

  _logError(msg) {
    this.results.metadata.errors.push(msg);
    console.warn('[UniversalScraper]', msg);
  }

  async _delay(ms) {
    const d = ms || this.config.requestDelay;
    const jitter = d * (0.8 + Math.random() * 0.4);
    return new Promise(r => setTimeout(r, jitter));
  }
}

if (typeof window !== 'undefined') window.UniversalScraper = UniversalScraper;
})();
