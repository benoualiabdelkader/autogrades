/**
 * Enhanced Popup Controller v3.0
 * Complete English rewrite with:
 *   - Universal scraping (any website/platform)
 *   - Platform auto-detection via SiteDetector
 *   - Multi-page crawling with progress tracking
 *   - Stealth mode integration
 *   - Login detection alerts
 *   - Tab navigation, toast system, history, exports
 *   - Robust error handling, settings persistence, retry logic
 */

class EnhancedPopupController {
    constructor() {
        this.autoGraderIntegration = new AutoGraderIntegration();
        this.selectedElements = [];
        this.extractedData = null;
        this.isExtracting = false;
        this.isCrawling = false;
        this.extractionHistory = [];
        this.siteInfo = null;
        this.settings = {
            maxRetries: 3,
            extractionTimeout: 30,
            autoSave: true,
            notifications: true,
            stealthMode: true,
            canvasNoise: true,
            sessionPersist: true,
        };

        this.init();
    }

    // ─── Initialization ────────────────────────────────────────────

    async init() {
        await this.loadSettings();
        this.setupTabNavigation();
        this.setupEventListeners();
        await this.loadSavedElements();
        await this.loadHistory();
        await this.checkConnection();
        this.updateFooterCount();
        await this.detectPlatform();
        await this.checkLoginStatus();
    }

    // ─── Platform Detection ────────────────────────────────────────

    async detectPlatform() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            // Inject SiteDetector and run detection
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['core/SiteDetector.js']
                });
            } catch (_) { /* already present */ }

            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    try {
                        const d = new SiteDetector();
                        return JSON.parse(JSON.stringify(d.detect()));
                    } catch (e) {
                        return { platform: 'unknown', pageType: 'generic', confidence: 0, features: {} };
                    }
                }
            });

            if (result?.[0]?.result) {
                this.siteInfo = result[0].result;
                this.updatePlatformBar(this.siteInfo);
            }
        } catch (err) {
            console.warn('Platform detection failed:', err);
        }
    }

    updatePlatformBar(info) {
        const icons = {
            'moodle': '🎓', 'canvas': '🎨', 'blackboard': '📋',
            'google-classroom': '📚', 'schoology': '🏫', 'wordpress': '📝',
            'shopify': '🛒', 'generic': '🌐', 'unknown': '🌐'
        };

        const iconEl = document.getElementById('platformIcon');
        const nameEl = document.getElementById('platformName');
        const typeEl = document.getElementById('platformType');

        if (iconEl) iconEl.textContent = icons[info.platform] || '🌐';
        if (nameEl) {
            const name = info.platform === 'unknown' ? info.domain : info.platform.charAt(0).toUpperCase() + info.platform.slice(1);
            nameEl.textContent = name;
        }
        if (typeEl) {
            typeEl.textContent = info.pageType.replace(/-/g, ' ');
            typeEl.className = 'platform-type-badge badge-' + info.platform;
        }
    }

    // ─── Login Detection ───────────────────────────────────────────

    async checkLoginStatus() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['core/StealthEngine.js']
                });
            } catch (_) {}

            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    try {
                        const se = new StealthEngine();
                        const loginForm = se.detectLoginForm();
                        const loggedIn = se.isLoggedIn();
                        return { hasLoginForm: !!loginForm, isLoggedIn: loggedIn, formFields: loginForm };
                    } catch (e) {
                        return { hasLoginForm: false, isLoggedIn: true };
                    }
                }
            });

            const status = result?.[0]?.result;
            const alert = document.getElementById('loginAlert');

            if (status?.hasLoginForm && !status?.isLoggedIn && alert) {
                alert.style.display = 'flex';
                const title = document.getElementById('loginAlertTitle');
                const desc = document.getElementById('loginAlertDesc');
                if (title) title.textContent = 'Login Required';
                if (desc) desc.textContent = 'A login form was detected. Sign in first for full data access.';
            } else if (alert) {
                alert.style.display = 'none';
            }
        } catch (err) {
            console.warn('Login check failed:', err);
        }
    }

    // ─── Tab Navigation ────────────────────────────────────────────

    setupTabNavigation() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                const panelId = 'panel' + tabName.charAt(0).toUpperCase() + tabName.slice(1);

                // Deactivate all
                tabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

                // Activate clicked
                tab.classList.add('active');
                const panel = document.getElementById(panelId);
                if (panel) panel.classList.add('active');
            });
        });
    }

    // ─── Event Listeners ───────────────────────────────────────────

    setupEventListeners() {
        // Extract tab
        this._on('selectElementsBtn', 'click', () => this.handleManualSelection());
        this._on('autoSelectBtn', 'click', () => this.handleAutoExtraction());
        this._on('clearElementsBtn', 'click', () => this.clearElements());
        this._on('extractAndSendBtn', 'click', () => this.handleExtractAndSend());
        this._on('previewBtn', 'click', () => this.showPreview());
        this._on('exportJsonBtn', 'click', () => this.exportJSON());
        this._on('exportCsvBtn', 'click', () => this.exportCSV());

        // Multi-page tab
        this._on('startCrawlBtn', 'click', () => this.startMultiPageCrawl());
        this._on('stopCrawlBtn', 'click', () => this.stopMultiPageCrawl());
        this._on('crawlMode', 'change', () => this.onCrawlModeChange());

        // Settings tab
        this._on('testConnectionBtn', 'click', () => this.testConnection());
        this._on('clearHistoryBtn', 'click', () => this.clearHistory());
        this._on('autoGraderUrl', 'change', (e) => this.saveAutoGraderUrl(e.target.value));

        // Advanced settings
        this._on('maxRetries', 'change', () => this.saveAdvancedSettings());
        this._on('extractionTimeout', 'change', () => this.saveAdvancedSettings());
        this._on('autoSaveOption', 'change', () => this.saveAdvancedSettings());
        this._on('notificationsOption', 'change', () => this.saveAdvancedSettings());
        this._on('globalStealthOption', 'change', () => this.saveAdvancedSettings());
        this._on('canvasNoiseOption', 'change', () => this.saveAdvancedSettings());
        this._on('sessionPersistOption', 'change', () => this.saveAdvancedSettings());

        // Modal controls
        this._on('closePreviewBtn', 'click', () => this.closePreview());
        this._on('cancelPreviewBtn', 'click', () => this.closePreview());
        this._on('confirmSendBtn', 'click', () => this.confirmAndSend());

        // Close modal on backdrop click
        document.getElementById('previewModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'previewModal') this.closePreview();
        });

        // Keyboard: Escape closes modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closePreview();
        });
    }

    /** Shorthand for safe event binding */
    _on(id, event, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    }

    // ─── Manual Element Selection ──────────────────────────────────

    async handleManualSelection() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) { this.showToast('No active tab found', 'error'); return; }

            await chrome.storage.local.set({ 'onpage_selection_mode': true });

            try {
                await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
            } catch (_) { /* already injected */ }

            await chrome.tabs.sendMessage(tab.id, { action: 'startElementSelection' });
            window.close();

        } catch (error) {
            console.error('Manual selection error:', error);
            this.showToast('Failed to start manual selection: ' + error.message, 'error');
        }
    }

    // ─── Smart Auto Extraction ────────────────────────────────────

    async handleAutoExtraction() {
        if (this.isExtracting) return;
        this.isExtracting = true;

        const autoBtn = document.getElementById('autoSelectBtn');
        if (autoBtn) { autoBtn.disabled = true; }

        try {
            this.showProgress('Running semantic & structural analysis...', 15);

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                this.showToast('No active tab found', 'error');
                return;
            }

            // Inject all engines
            const scripts = [
                'core/SiteDetector.js', 'core/StealthEngine.js', 'core/UniversalScraper.js',
                'resilience-engine.js', 'telemetry-profiler.js', 'semantic-analyzer.js', 'smart-extractor.js'
            ];
            try {
                await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: scripts });
            } catch (_) { /* already present */ }

            this.showProgress('Analyzing page structure...', 40);

            // Get extraction options from UI
            const options = this._getExtractionOptions();

            const result = await this._withTimeout(
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: (opts) => {
                        try {
                            // Try UniversalScraper first (new engine)
                            if (typeof UniversalScraper !== 'undefined') {
                                const scraper = new UniversalScraper({
                                    cleanData: opts.cleanData,
                                    removeDuplicates: opts.removeDuplicates,
                                    includeMetadata: opts.includeMetadata,
                                });
                                const data = scraper.scrapeCurrentPage();
                                return JSON.parse(JSON.stringify(data));
                            }
                            // Fallback to SmartExtractor
                            const extractor = new SmartExtractor();
                            const raw = extractor.autoExtract({
                                includeInputs: true,
                                includeText: true,
                                includeLinks: false,
                                includeImages: false,
                                useSemanticAnalysis: true
                            });
                            return JSON.parse(JSON.stringify(raw));
                        } catch (e) {
                            return { __error: e.message, __stack: String(e.stack || '') };
                        }
                    },
                    args: [options]
                }),
                this.settings.extractionTimeout * 1000
            );

            this.showProgress('Processing data...', 75);

            if (result?.[0]?.result?.__error) {
                throw new Error(result[0].result.__error);
            }

            if (result?.[0]?.result) {
                this.extractedData = result[0].result;

                // Build summary from UniversalScraper format if missing
                if (!this.extractedData.summary) {
                    const d = this.extractedData;
                    const tableRows = (d.tables || []).reduce((a, t) => a + (t.rows?.length || 0), 0);
                    this.extractedData.summary = {
                        totalFields: tableRows + (d.textBlocks || []).length,
                        totalEntities: (d.lists || []).reduce((a, l) => a + (l.items?.length || 0), 0) + (d.cards || []).length,
                        totalForms: (d.forms || []).length,
                        totalTables: (d.tables || []).length,
                        tables: (d.tables || []).length,
                        lists: (d.lists || []).length,
                        forms: (d.forms || []).length,
                        links: (d.links || []).length,
                    };
                }

                this.showProgress('Extraction complete!', 100);

                setTimeout(() => {
                    this.hideProgress();
                    const s = this.extractedData.summary || {};
                    this.updateExtractionStats(s);
                    this.enableActionButtons();

                    const fieldCount = s.totalFields || s.totalTables || 0;
                    const entityCount = s.totalEntities || s.lists || 0;
                    this.showToast(
                        `Smart extraction complete! ${fieldCount} fields, ${entityCount} entities`,
                        'success'
                    );

                    if (this.settings.autoSave) {
                        this.autoGraderIntegration.saveLocally(this.extractedData);
                    }

                    this.addHistoryEntry({
                        url: this.extractedData.url || tab.url,
                        title: this.extractedData.title || tab.title,
                        summary: s,
                        status: 'extracted'
                    });
                }, 800);
            } else {
                this.hideProgress();
                this.showToast('No data found on this page', 'error');
            }

        } catch (error) {
            console.error('Auto extraction error:', error);
            this.hideProgress();
            this.showToast('Extraction failed: ' + error.message, 'error');
        } finally {
            this.isExtracting = false;
            if (autoBtn) autoBtn.disabled = false;
        }
    }

    /** Read current extraction options from checkboxes */
    _getExtractionOptions() {
        return {
            cleanData: document.getElementById('cleanDataOption')?.checked ?? true,
            removeDuplicates: document.getElementById('removeDuplicatesOption')?.checked ?? true,
            validateData: document.getElementById('validateDataOption')?.checked ?? true,
            includeMetadata: document.getElementById('includeMetadataOption')?.checked ?? false,
        };
    }

    // ─── Extract & Send ───────────────────────────────────────────

    async handleExtractAndSend() {
        if (this.isExtracting) {
            this.showToast('An extraction is already in progress', 'info');
            return;
        }

        this.isExtracting = true;
        const btn = document.getElementById('extractAndSendBtn');
        if (btn) { btn.disabled = true; }

        try {
            if (!this.extractedData && this.selectedElements.length > 0) {
                this.showProgress('Extracting data from selected elements...', 20);
                await this.extractFromSelectedElements();
            }

            if (!this.extractedData) {
                this.showToast('No data to send. Run an extraction first.', 'error');
                return;
            }

            this.showProgress('Sending to AutoGrader...', 55);

            const result = await this.sendWithRetry(this.extractedData);

            this.showProgress('Done!', 100);

            setTimeout(() => {
                this.hideProgress();
                if (result.success) {
                    this.showToast('Data sent successfully to AutoGrader Dashboard', 'success');
                    this.addHistoryEntry({
                        url: this.extractedData.url,
                        title: this.extractedData.title,
                        summary: this.extractedData.summary,
                        status: 'sent'
                    });
                } else {
                    this.showToast('Send failed: ' + result.message, 'error');
                    this.addHistoryEntry({
                        url: this.extractedData?.url,
                        title: this.extractedData?.title,
                        summary: this.extractedData?.summary,
                        status: 'failed'
                    });
                }
            }, 600);

        } catch (error) {
            console.error('Extract & send error:', error);
            this.hideProgress();
            this.showToast('Unexpected error: ' + error.message, 'error');
        } finally {
            this.isExtracting = false;
            this.enableActionButtons();
        }
    }

    /** Send with automatic retry on failure */
    async sendWithRetry(data, attempt = 1) {
        const result = await this.autoGraderIntegration.sendToAutoGrader(data);
        if (!result.success && attempt < this.settings.maxRetries) {
            await this._sleep(1000 * attempt);
            this.showProgress(`Retrying (attempt ${attempt + 1})...`, 55 + attempt * 10);
            return this.sendWithRetry(data, attempt + 1);
        }
        return result;
    }

    // ─── Extract from selected elements ───────────────────────────

    async extractFromSelectedElements() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('No active tab');

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: (elements) => {
                try {
                    const extractor = new SmartExtractor();
                    return extractor.extractFromElements(elements);
                } catch (e) {
                    return { __error: e.message };
                }
            },
            args: [this.selectedElements]
        });

        if (result?.[0]?.result?.__error) throw new Error(result[0].result.__error);
        if (result?.[0]?.result) this.extractedData = result[0].result;
    }

    // ─── Multi-Page Crawling ──────────────────────────────────────

    onCrawlModeChange() {
        const mode = document.getElementById('crawlMode')?.value;
        const patternGroup = document.getElementById('linkPatternGroup');
        if (patternGroup) {
            patternGroup.style.display = (mode === 'links') ? 'block' : 'none';
        }
    }

    async startMultiPageCrawl() {
        if (this.isCrawling) return;
        this.isCrawling = true;

        const startBtn = document.getElementById('startCrawlBtn');
        const stopBtn = document.getElementById('stopCrawlBtn');
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-flex';

        const multiProgress = document.getElementById('multiProgress');
        if (multiProgress) multiProgress.style.display = 'block';

        const crawlMode = document.getElementById('crawlMode')?.value || 'pagination';
        const maxPages = parseInt(document.getElementById('maxPages')?.value || '10');
        const requestDelay = parseInt(document.getElementById('requestDelay')?.value || '1500');
        const linkPattern = document.getElementById('linkPattern')?.value || '';
        const stealth = document.getElementById('stealthModeOption')?.checked ?? true;
        const humanSim = document.getElementById('humanSimOption')?.checked ?? true;

        this.updateCrawlProgress('Starting multi-page scrape...', 0, maxPages);
        this.addCrawlLog('Initializing crawl engine...');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) { this.showToast('No active tab found', 'error'); return; }

            // Inject all engines
            const scripts = [
                'core/SiteDetector.js', 'core/StealthEngine.js', 'core/UniversalScraper.js',
                'resilience-engine.js', 'semantic-analyzer.js', 'smart-extractor.js'
            ];
            try {
                await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: scripts });
            } catch (_) {}

            this.addCrawlLog('Engines loaded. Starting page 1...');

            // Execute the multi-page crawl
            const result = await this._withTimeout(
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: (config) => {
                        try {
                            const scraper = new UniversalScraper({
                                maxPages: config.maxPages,
                                requestDelay: config.requestDelay,
                                followPagination: config.crawlMode === 'pagination' || config.crawlMode === 'sitemap',
                                followLinks: config.crawlMode === 'links' || config.crawlMode === 'sitemap',
                                linkPattern: config.linkPattern || '',
                                cleanData: true,
                                removeDuplicates: true,
                                includeMetadata: true,
                            });

                            if (config.stealth && typeof StealthEngine !== 'undefined') {
                                const se = new StealthEngine();
                                se.applyStealthPatches();
                            }

                            return JSON.parse(JSON.stringify(scraper.scrapeCurrentPage()));
                        } catch (e) {
                            return { __error: e.message };
                        }
                    },
                    args: [{ crawlMode, maxPages, requestDelay, linkPattern, stealth, humanSim }]
                }),
                maxPages * (requestDelay + 10000) // generous timeout
            );

            if (result?.[0]?.result?.__error) {
                throw new Error(result[0].result.__error);
            }

            if (result?.[0]?.result) {
                this.extractedData = result[0].result;

                // Build summary from UniversalScraper format if missing
                if (!this.extractedData.summary) {
                    const d = this.extractedData;
                    const tableRows = (d.tables || []).reduce((a, t) => a + (t.rows?.length || 0), 0);
                    this.extractedData.summary = {
                        totalFields: tableRows + (d.textBlocks || []).length,
                        totalEntities: (d.lists || []).reduce((a, l) => a + (l.items?.length || 0), 0) + (d.cards || []).length,
                        totalForms: (d.forms || []).length,
                        totalTables: (d.tables || []).length,
                        tables: (d.tables || []).length,
                        lists: (d.lists || []).length,
                        forms: (d.forms || []).length,
                        links: (d.links || []).length,
                    };
                }

                const s = this.extractedData.summary || {};
                const pagesScraped = this.extractedData.pages?.length || 1;

                this.updateCrawlProgress('Crawl complete!', pagesScraped, maxPages);
                this.addCrawlLog(`Done! Scraped ${pagesScraped} page(s), ${s.tables || 0} tables, ${s.lists || 0} lists found.`);

                this.enableActionButtons();
                this.showToast(`Multi-page scrape complete: ${pagesScraped} pages processed`, 'success');

                this.addHistoryEntry({
                    url: this.extractedData.url || tab.url,
                    title: `[Multi-page] ${this.extractedData.title || tab.title}`,
                    summary: s,
                    status: 'extracted'
                });
            }

        } catch (error) {
            console.error('Multi-page crawl error:', error);
            this.addCrawlLog('ERROR: ' + error.message);
            this.showToast('Crawl failed: ' + error.message, 'error');
        } finally {
            this.isCrawling = false;
            if (startBtn) startBtn.style.display = 'inline-flex';
            if (stopBtn) stopBtn.style.display = 'none';
        }
    }

    stopMultiPageCrawl() {
        this.isCrawling = false;
        this.addCrawlLog('Crawl stopped by user.');
        this.showToast('Multi-page crawl stopped', 'info');

        const startBtn = document.getElementById('startCrawlBtn');
        const stopBtn = document.getElementById('stopCrawlBtn');
        if (startBtn) startBtn.style.display = 'inline-flex';
        if (stopBtn) stopBtn.style.display = 'none';
    }

    updateCrawlProgress(label, current, total) {
        const labelEl = document.getElementById('multiProgressLabel');
        const countEl = document.getElementById('multiProgressCount');
        const fill = document.getElementById('multiProgressFill');

        if (labelEl) labelEl.textContent = label;
        if (countEl) countEl.textContent = `${current} / ${total} pages`;
        if (fill) fill.style.width = `${total > 0 ? (current / total) * 100 : 0}%`;
    }

    addCrawlLog(message) {
        const log = document.getElementById('crawlLog');
        if (!log) return;
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const entry = document.createElement('div');
        entry.className = 'crawl-log-entry';
        entry.textContent = `[${time}] ${message}`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    // ─── Preview Modal ─────────────────────────────────────────────

    showPreview() {
        if (!this.extractedData) {
            this.showToast('No data to preview', 'error');
            return;
        }

        const preview = this.autoGraderIntegration.previewData(this.extractedData);

        // Stats grid
        const statsEl = document.getElementById('previewStats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="preview-stat-cell">
                    <div class="preview-stat-num">${preview.summary?.totalItems ?? 0}</div>
                    <div class="preview-stat-lbl">Total Items</div>
                </div>
                <div class="preview-stat-cell">
                    <div class="preview-stat-num">${preview.summary?.totalFields ?? 0}</div>
                    <div class="preview-stat-lbl">Total Fields</div>
                </div>
            `;
        }

        const dataEl = document.getElementById('previewData');
        if (dataEl) dataEl.textContent = JSON.stringify(preview, null, 2);

        const modal = document.getElementById('previewModal');
        if (modal) modal.style.display = 'flex';
    }

    closePreview() {
        const modal = document.getElementById('previewModal');
        if (modal) modal.style.display = 'none';
    }

    async confirmAndSend() {
        this.closePreview();

        if (!this.extractedData) {
            this.showToast('No data to send', 'error');
            return;
        }

        this.showProgress('Sending...', 30);
        this.isExtracting = true;

        try {
            const result = await this.sendWithRetry(this.extractedData);
            this.hideProgress();
            if (result.success) {
                this.showToast('Sent successfully to AutoGrader', 'success');
                this.addHistoryEntry({
                    url: this.extractedData.url,
                    title: this.extractedData.title,
                    summary: this.extractedData.summary,
                    status: 'sent'
                });
            } else {
                this.showToast('Send failed: ' + result.message, 'error');
            }
        } finally {
            this.isExtracting = false;
            this.enableActionButtons();
        }
    }

    // ─── Exports ──────────────────────────────────────────────────

    exportJSON() {
        if (!this.extractedData) { this.showToast('No data to export', 'error'); return; }
        const res = this.autoGraderIntegration.exportAsJSON(this.extractedData);
        if (res.success) this.showToast('Data exported as JSON', 'success');
    }

    exportCSV() {
        if (!this.extractedData) { this.showToast('No data to export', 'error'); return; }

        const res = this.autoGraderIntegration.exportAsCSV(this.extractedData);
        if (res.success) {
            this.showToast('Data exported as CSV', 'success');
        } else {
            this.showToast(res.message, 'error');
        }
    }

    // ─── Connection ────────────────────────────────────────────────

    async checkConnection() {
        const dot = document.getElementById('statusDot');
        const text = document.getElementById('statusText');
        if (dot) dot.className = 'status-dot checking';
        if (text) text.textContent = 'Checking...';

        const connected = await this.autoGraderIntegration.checkConnection();
        this.updateConnectionStatus(connected);
    }

    async testConnection() {
        const btn = document.getElementById('testConnectionBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'Testing...'; }

        const connected = await this.autoGraderIntegration.checkConnection();
        this.updateConnectionStatus(connected);

        if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H9v-2h2v2zm0-4H9V5h2v6z"/></svg> Test'; }

        if (connected) {
            this.showToast('Connected to AutoGrader successfully', 'success');
        } else {
            this.showToast('Connection failed. Make sure AutoGrader is running at ' + this.autoGraderIntegration.autoGraderURL, 'error');
        }
    }

    updateConnectionStatus(connected) {
        const dot = document.getElementById('statusDot');
        const text = document.getElementById('statusText');
        if (!dot || !text) return;

        dot.className = 'status-dot ' + (connected ? 'connected' : 'disconnected');
        text.textContent = connected ? 'Connected' : 'Disconnected';
    }

    // ─── Elements Management ───────────────────────────────────────

    async loadSavedElements() {
        try {
            const result = await chrome.storage.local.get(['onpage_selected_elements']);
            if (Array.isArray(result.onpage_selected_elements) && result.onpage_selected_elements.length > 0) {
                this.selectedElements = result.onpage_selected_elements;
                this.updateElementsList();
                this.enableActionButtons();
            }
        } catch (error) {
            console.error('Error loading saved elements:', error);
        }
    }

    updateElementsList() {
        const list = document.getElementById('elementsList');
        const container = document.getElementById('selectedElementsList');
        const count = document.getElementById('elementsCount');

        if (!list || !container) return;

        if (this.selectedElements.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        if (count) count.textContent = this.selectedElements.length;

        list.innerHTML = this.selectedElements.map((el, index) => `
            <li class="element-item">
                <div>
                    <div class="element-name">${this._escape(el.name)}</div>
                    <div class="element-selector">${this._escape(el.selector)}</div>
                </div>
                <button class="element-remove" onclick="popupController.removeElement(${index})" title="Remove">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M4 4l8 8M12 4l-8 8"/>
                    </svg>
                </button>
            </li>
        `).join('');
    }

    removeElement(index) {
        this.selectedElements.splice(index, 1);
        this.updateElementsList();
        this.saveElements();
        if (this.selectedElements.length === 0) this.disableActionButtons();
        this.showToast('Element removed', 'info');
    }

    clearElements() {
        this.selectedElements = [];
        this.extractedData = null;
        this.updateElementsList();
        this.saveElements();
        this.disableActionButtons();
        this.hideExtractionStats();
        this.showToast('All elements cleared', 'info');
    }

    async saveElements() {
        await chrome.storage.local.set({ 'onpage_selected_elements': this.selectedElements });
    }

    // ─── History ───────────────────────────────────────────────────

    async loadHistory() {
        try {
            const result = await chrome.storage.local.get(['autograder_history']);
            this.extractionHistory = result.autograder_history || [];
            this.renderHistory();
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    addHistoryEntry(entry) {
        const newEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...entry
        };
        this.extractionHistory.unshift(newEntry);
        if (this.extractionHistory.length > 50) {
            this.extractionHistory = this.extractionHistory.slice(0, 50);
        }
        this.saveHistory();
        this.renderHistory();
        this.updateFooterCount();
    }

    async saveHistory() {
        await chrome.storage.local.set({ 'autograder_history': this.extractionHistory });
    }

    renderHistory() {
        const container = document.getElementById('historyList');
        if (!container) return;

        if (!this.extractionHistory.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                    </svg>
                    <p>No extraction history yet</p>
                </div>`;
            return;
        }

        container.innerHTML = this.extractionHistory.map(entry => {
            const time = new Date(entry.timestamp);
            const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const dateStr = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const statusClass = entry.status === 'sent' ? 'success' : entry.status === 'failed' ? 'failed' : '';
            const statusLabel = entry.status === 'sent' ? 'Sent' : entry.status === 'failed' ? 'Failed' : 'Extracted';

            return `
                <div class="history-item">
                    <div class="history-item-header">
                        <span class="history-item-title" title="${this._escape(entry.url || '')}">
                            ${this._escape(entry.title || entry.url || 'Unknown page')}
                        </span>
                        <span class="history-item-time">${dateStr} ${timeStr}</span>
                    </div>
                    <div class="history-item-meta">
                        <span class="history-chip ${statusClass}">${statusLabel}</span>
                        ${entry.summary?.totalFields ? `<span class="history-chip">${entry.summary.totalFields} fields</span>` : ''}
                        ${entry.summary?.totalEntities ? `<span class="history-chip">${entry.summary.totalEntities} entities</span>` : ''}
                    </div>
                </div>`;
        }).join('');
    }

    clearHistory() {
        this.extractionHistory = [];
        this.saveHistory();
        this.renderHistory();
        this.updateFooterCount();
        this.showToast('Extraction history cleared', 'info');
    }

    updateFooterCount() {
        const el = document.getElementById('footerExtractionCount');
        if (el) el.textContent = `${this.extractionHistory.length} extraction${this.extractionHistory.length !== 1 ? 's' : ''}`;
    }

    // ─── UI State ──────────────────────────────────────────────────

    enableActionButtons() {
        ['extractAndSendBtn', 'previewBtn', 'exportJsonBtn', 'exportCsvBtn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
        });
    }

    disableActionButtons() {
        ['extractAndSendBtn', 'previewBtn', 'exportJsonBtn', 'exportCsvBtn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = true;
        });
    }

    showProgress(text, percent) {
        const container = document.getElementById('progressContainer');
        const fill = document.getElementById('progressFill');
        const textEl = document.getElementById('progressText');
        const percentEl = document.getElementById('progressPercent');

        if (container) container.style.display = 'block';
        if (fill) fill.style.width = `${percent}%`;
        if (textEl) textEl.textContent = text;
        if (percentEl) percentEl.textContent = `${percent}%`;
    }

    hideProgress() {
        const container = document.getElementById('progressContainer');
        if (container) {
            container.style.opacity = '0';
            setTimeout(() => {
                container.style.display = 'none';
                container.style.opacity = '1';
            }, 300);
        }
    }

    updateExtractionStats(summary = {}) {
        const statsRow = document.getElementById('extractionStats');
        if (!statsRow) return;

        statsRow.style.display = 'flex';

        const update = (id, value) => {
            const chip = document.getElementById(id);
            if (chip) {
                const valEl = chip.querySelector('.stat-value');
                if (valEl) valEl.textContent = value ?? 0;
            }
        };

        update('statFields', summary.totalFields || summary.tables || 0);
        update('statEntities', summary.totalEntities || summary.lists || 0);
        update('statForms', summary.totalForms || summary.forms || 0);
        update('statTables', summary.totalTables || summary.tables || 0);
    }

    hideExtractionStats() {
        const statsRow = document.getElementById('extractionStats');
        if (statsRow) statsRow.style.display = 'none';
    }

    // ─── Toast Notifications ───────────────────────────────────────

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.71 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 111.42-1.42L8 12.59l7.29-7.3a1 1 0 011.42 0z"/>
                      </svg>`,
            error: `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 7v4a1 1 0 002 0V7a1 1 0 00-2 0zm0 6a1 1 0 102 0 1 1 0 00-2 0z"/>
                      </svg>`,
            info: `<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h.01a1 1 0 000-2H10v-3a1 1 0 00-1-1z"/>
                      </svg>`
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `${icons[type] || ''}<span>${message}</span>`;
        container.appendChild(toast);

        const duration = type === 'error' ? 6000 : 4000;
        setTimeout(() => {
            toast.classList.add('toast-hide');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ─── Settings Persistence ──────────────────────────────────────

    async loadSettings() {
        try {
            await this.autoGraderIntegration.loadSettings();
            const urlEl = document.getElementById('autoGraderUrl');
            if (urlEl) urlEl.value = this.autoGraderIntegration.autoGraderURL;

            const result = await chrome.storage.local.get(['autograder_advanced_settings']);
            const saved = result.autograder_advanced_settings || {};

            this.settings = { ...this.settings, ...saved };

            // Apply to UI
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) {
                    if (el.type === 'checkbox') el.checked = val;
                    else el.value = val;
                }
            };
            setVal('maxRetries', this.settings.maxRetries);
            setVal('extractionTimeout', this.settings.extractionTimeout);
            setVal('autoSaveOption', this.settings.autoSave);
            setVal('notificationsOption', this.settings.notifications);
            setVal('globalStealthOption', this.settings.stealthMode);
            setVal('canvasNoiseOption', this.settings.canvasNoise);
            setVal('sessionPersistOption', this.settings.sessionPersist);

        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveAdvancedSettings() {
        const getVal = (id) => {
            const el = document.getElementById(id);
            if (!el) return null;
            return el.type === 'checkbox' ? el.checked : (isNaN(el.value) ? el.value : Number(el.value));
        };

        this.settings = {
            maxRetries: getVal('maxRetries') ?? 3,
            extractionTimeout: getVal('extractionTimeout') ?? 30,
            autoSave: getVal('autoSaveOption') ?? true,
            notifications: getVal('notificationsOption') ?? true,
            stealthMode: getVal('globalStealthOption') ?? true,
            canvasNoise: getVal('canvasNoiseOption') ?? true,
            sessionPersist: getVal('sessionPersistOption') ?? true,
        };

        // Sync timeout to integration class
        this.autoGraderIntegration.setRequestTimeout(this.settings.extractionTimeout * 1000);

        await chrome.storage.local.set({ 'autograder_advanced_settings': this.settings });
    }

    async saveAutoGraderUrl(url) {
        const trimmed = (url || '').trim();
        if (!trimmed.startsWith('http')) {
            this.showToast('Invalid URL. Must start with http or https', 'error');
            return;
        }
        this.autoGraderIntegration.setAutoGraderURL(trimmed);
        await this.checkConnection();
    }

    // ─── Utilities ────────────────────────────────────────────────

    _escape(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    _withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Extraction timed out')), ms))
        ]);
    }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

let popupController;

document.addEventListener('DOMContentLoaded', () => {
    popupController = new EnhancedPopupController();
});

// Listen for messages from background / content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!popupController) return;

    if (message.action === 'elementSelectionComplete') {
        popupController.selectedElements = message.elements || [];
        popupController.updateElementsList();
        popupController.saveElements();
        popupController.enableActionButtons();
        popupController.showToast(`${message.elements?.length || 0} elements selected`, 'success');
    }

    if (message.action === 'crawlProgress') {
        popupController.updateCrawlProgress(
            message.label || 'Crawling...',
            message.current || 0,
            message.total || 0
        );
        if (message.log) popupController.addCrawlLog(message.log);
    }
});
