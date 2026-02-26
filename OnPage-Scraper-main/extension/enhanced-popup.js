/**
 * Enhanced Popup Controller v2.1
 * Improved with: tab navigation, toast system, history, CSV export,
 * robust error handling, settings persistence, and retry logic.
 */

class EnhancedPopupController {
    constructor() {
        this.autoGraderIntegration = new AutoGraderIntegration();
        this.selectedElements = [];
        this.extractedData = null;
        this.isExtracting = false;
        this.extractionHistory = [];
        this.settings = {
            maxRetries: 3,
            extractionTimeout: 30,
            autoSave: true,
            notifications: true
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
    }

    // ─── Tab Navigation ────────────────────────────────────────────

    setupTabNavigation() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const panelId = 'panel' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1);

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
        this._on('selectElementsBtn', 'click', () => this.handleManualSelection());
        this._on('autoSelectBtn', 'click', () => this.handleAutoExtraction());
        this._on('clearElementsBtn', 'click', () => this.clearElements());
        this._on('extractAndSendBtn', 'click', () => this.handleExtractAndSend());
        this._on('previewBtn', 'click', () => this.showPreview());
        this._on('exportJsonBtn', 'click', () => this.exportJSON());
        this._on('exportCsvBtn', 'click', () => this.exportCSV());
        this._on('testConnectionBtn', 'click', () => this.testConnection());
        this._on('clearHistoryBtn', 'click', () => this.clearHistory());

        this._on('autoGraderUrl', 'change', (e) => this.saveAutoGraderUrl(e.target.value));

        // Advanced settings
        this._on('maxRetries', 'change', () => this.saveAdvancedSettings());
        this._on('extractionTimeout', 'change', () => this.saveAdvancedSettings());
        this._on('autoSaveOption', 'change', () => this.saveAdvancedSettings());
        this._on('notificationsOption', 'change', () => this.saveAdvancedSettings());

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
            if (!tab) { this.showToast('لم يتم العثور على تبويب نشط', 'error'); return; }

            await chrome.storage.local.set({ 'onpage_selection_mode': true });

            // content.js is already injected via manifest, but re-inject to ensure readiness
            try {
                await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
            } catch (_) { /* already injected */ }

            await chrome.tabs.sendMessage(tab.id, { action: 'startElementSelection' });
            window.close();

        } catch (error) {
            console.error('Manual selection error:', error);
            this.showToast('فشل بدء التحديد اليدوي: ' + error.message, 'error');
        }
    }

    // ─── Auto Extraction ──────────────────────────────────────────

    async handleAutoExtraction() {
        if (this.isExtracting) return;
        this.isExtracting = true;

        const autoBtn = document.getElementById('autoSelectBtn');
        if (autoBtn) { autoBtn.disabled = true; }

        try {
            this.showProgress('جاري التحليل الدلالي والهيكلي...', 15);

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                this.showToast('لم يتم العثور على تبويب نشط', 'error');
                return;
            }

            // Inject content scripts (best-effort; they may already be present via manifest)
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['resilience-engine.js', 'telemetry-profiler.js', 'semantic-analyzer.js', 'smart-extractor.js']
                });
            } catch (_) { /* already present */ }

            this.showProgress('جاري تحليل بنية الصفحة...', 40);

            const result = await this._withTimeout(
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => {
                        try {
                            const extractor = new window.SmartExtractor();
                            return extractor.autoExtract({
                                includeInputs: true,
                                includeText: true,
                                includeLinks: false,
                                includeImages: false,
                                useSemanticAnalysis: true
                            });
                        } catch (e) {
                            return { __error: e.message };
                        }
                    }
                }),
                this.settings.extractionTimeout * 1000
            );

            this.showProgress('جاري معالجة البيانات...', 75);

            if (result?.[0]?.result?.__error) {
                throw new Error(result[0].result.__error);
            }

            if (result?.[0]?.result) {
                this.extractedData = result[0].result;
                this.showProgress('تم الاستخراج بنجاح!', 100);

                setTimeout(() => {
                    this.hideProgress();
                    const s = this.extractedData.summary || {};
                    this.updateExtractionStats(s);
                    this.enableActionButtons();
                    this.showToast(
                        `تم الاستخراج الذكي! ${s.totalFields || 0} حقل، ${s.totalEntities || 0} كيان`,
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
                this.showToast('لم يتم العثور على بيانات في الصفحة', 'error');
            }

        } catch (error) {
            console.error('Auto extraction error:', error);
            this.hideProgress();
            this.showToast('فشل الاستخراج: ' + error.message, 'error');
        } finally {
            this.isExtracting = false;
            if (autoBtn) autoBtn.disabled = false;
        }
    }

    // ─── Extract & Send ───────────────────────────────────────────

    async handleExtractAndSend() {
        if (this.isExtracting) {
            this.showToast('عملية استخراج جارية بالفعل', 'info');
            return;
        }

        this.isExtracting = true;
        const btn = document.getElementById('extractAndSendBtn');
        if (btn) { btn.disabled = true; }

        try {
            // Extract from selected elements if we don't have data yet
            if (!this.extractedData && this.selectedElements.length > 0) {
                this.showProgress('جاري استخراج البيانات...', 20);
                await this.extractFromSelectedElements();
            }

            if (!this.extractedData) {
                this.showToast('لا توجد بيانات للإرسال. قم بالاستخراج أولاً.', 'error');
                return;
            }

            this.showProgress('جاري الإرسال إلى AutoGrader...', 55);

            const result = await this.sendWithRetry(this.extractedData);

            this.showProgress('تم!', 100);

            setTimeout(() => {
                this.hideProgress();
                if (result.success) {
                    this.showToast('تم إرسال البيانات بنجاح إلى AutoGrader Dashboard ✓', 'success');
                    this.addHistoryEntry({
                        url: this.extractedData.url,
                        title: this.extractedData.title,
                        summary: this.extractedData.summary,
                        status: 'sent'
                    });
                } else {
                    this.showToast('فشل الإرسال: ' + result.message, 'error');
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
            this.showToast('خطأ غير متوقع: ' + error.message, 'error');
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
            this.showProgress(`جاري إعادة الإرسال (محاولة ${attempt + 1})...`, 55 + attempt * 10);
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

    // ─── Preview Modal ─────────────────────────────────────────────

    showPreview() {
        if (!this.extractedData) {
            this.showToast('لا توجد بيانات للمعاينة', 'error');
            return;
        }

        const preview = this.autoGraderIntegration.previewData(this.extractedData);

        // Stats grid
        const statsEl = document.getElementById('previewStats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="preview-stat-cell">
                    <div class="preview-stat-num">${preview.summary.totalItems ?? 0}</div>
                    <div class="preview-stat-lbl">إجمالي العناصر</div>
                </div>
                <div class="preview-stat-cell">
                    <div class="preview-stat-num">${preview.summary.totalFields ?? 0}</div>
                    <div class="preview-stat-lbl">عدد الحقول</div>
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

    /** Confirm in preview then send (don't double-trigger) */
    async confirmAndSend() {
        this.closePreview();

        if (!this.extractedData) {
            this.showToast('لا توجد بيانات للإرسال', 'error');
            return;
        }

        this.showProgress('جاري الإرسال...', 30);
        this.isExtracting = true; // prevent double

        try {
            const result = await this.sendWithRetry(this.extractedData);
            this.hideProgress();
            if (result.success) {
                this.showToast('تم الإرسال بنجاح إلى AutoGrader ✓', 'success');
                this.addHistoryEntry({
                    url: this.extractedData.url,
                    title: this.extractedData.title,
                    summary: this.extractedData.summary,
                    status: 'sent'
                });
            } else {
                this.showToast('فشل الإرسال: ' + result.message, 'error');
            }
        } finally {
            this.isExtracting = false;
            this.enableActionButtons();
        }
    }

    // ─── Exports ──────────────────────────────────────────────────

    exportJSON() {
        if (!this.extractedData) { this.showToast('لا توجد بيانات للتصدير', 'error'); return; }
        const res = this.autoGraderIntegration.exportAsJSON(this.extractedData);
        if (res.success) this.showToast('تم تصدير البيانات كـ JSON ✓', 'success');
    }

    exportCSV() {
        if (!this.extractedData) { this.showToast('لا توجد بيانات للتصدير', 'error'); return; }

        const res = this.autoGraderIntegration.exportAsCSV(this.extractedData);
        if (res.success) {
            this.showToast('تم تصدير البيانات كـ CSV ✓', 'success');
        } else {
            this.showToast(res.message, 'error');
        }
    }

    // ─── Connection ────────────────────────────────────────────────

    async checkConnection() {
        const dot = document.getElementById('statusDot');
        const text = document.getElementById('statusText');
        if (dot) dot.className = 'status-dot checking';
        if (text) text.textContent = 'جاري الفحص...';

        const connected = await this.autoGraderIntegration.checkConnection();
        this.updateConnectionStatus(connected);
    }

    async testConnection() {
        const btn = document.getElementById('testConnectionBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'جاري...'; }

        const connected = await this.autoGraderIntegration.checkConnection();
        this.updateConnectionStatus(connected);

        if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H9v-2h2v2zm0-4H9V5h2v6z"/></svg> اختبار'; }

        if (connected) {
            this.showToast('الاتصال بـ AutoGrader ناجح ✓', 'success');
        } else {
            this.showToast('فشل الاتصال. تأكد من تشغيل AutoGrader على ' + this.autoGraderIntegration.autoGraderURL, 'error');
        }
    }

    updateConnectionStatus(connected) {
        const dot = document.getElementById('statusDot');
        const text = document.getElementById('statusText');
        if (!dot || !text) return;

        dot.className = 'status-dot ' + (connected ? 'connected' : 'disconnected');
        text.textContent = connected ? 'متصل' : 'غير متصل';
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
                <button class="element-remove" onclick="popupController.removeElement(${index})" title="حذف">
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
        this.showToast('تم حذف العنصر', 'info');
    }

    clearElements() {
        this.selectedElements = [];
        this.extractedData = null;
        this.updateElementsList();
        this.saveElements();
        this.disableActionButtons();
        this.hideExtractionStats();
        this.showToast('تم مسح جميع العناصر', 'info');
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
        // Keep last 20 entries
        if (this.extractionHistory.length > 20) {
            this.extractionHistory = this.extractionHistory.slice(0, 20);
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
                    <p>لا يوجد سجل استخراجات بعد</p>
                </div>`;
            return;
        }

        container.innerHTML = this.extractionHistory.map(entry => {
            const time = new Date(entry.timestamp);
            const timeStr = time.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            const statusClass = entry.status === 'sent' ? 'success' : entry.status === 'failed' ? 'failed' : '';
            const statusLabel = entry.status === 'sent' ? 'تم الإرسال' : entry.status === 'failed' ? 'فشل' : 'مستخرج';

            return `
                <div class="history-item">
                    <div class="history-item-header">
                        <span class="history-item-title" title="${this._escape(entry.url || '')}">
                            ${this._escape(entry.title || entry.url || 'صفحة غير معروفة')}
                        </span>
                        <span class="history-item-time">${timeStr}</span>
                    </div>
                    <div class="history-item-meta">
                        <span class="history-chip ${statusClass}">${statusLabel}</span>
                        ${entry.summary?.totalFields ? `<span class="history-chip">${entry.summary.totalFields} حقل</span>` : ''}
                        ${entry.summary?.totalEntities ? `<span class="history-chip">${entry.summary.totalEntities} كيان</span>` : ''}
                    </div>
                </div>`;
        }).join('');
    }

    clearHistory() {
        this.extractionHistory = [];
        this.saveHistory();
        this.renderHistory();
        this.updateFooterCount();
        this.showToast('تم مسح سجل الاستخراجات', 'info');
    }

    updateFooterCount() {
        const el = document.getElementById('footerExtractionCount');
        if (el) el.textContent = `${this.extractionHistory.length} عملية استخراج`;
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

        update('statFields', summary.totalFields);
        update('statEntities', summary.totalEntities);
        update('statForms', summary.totalForms);
        update('statTables', summary.totalTables);
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
        };

        // Sync timeout to integration class so requests honour the new value
        this.autoGraderIntegration.setRequestTimeout(this.settings.extractionTimeout * 1000);

        await chrome.storage.local.set({ 'autograder_advanced_settings': this.settings });
    }

    async saveAutoGraderUrl(url) {
        const trimmed = (url || '').trim();
        if (!trimmed.startsWith('http')) {
            this.showToast('عنوان URL غير صالح. يجب أن يبدأ بـ http أو https', 'error');
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
            new Promise((_, reject) => setTimeout(() => reject(new Error('انتهت مهلة الاستخراج')), ms))
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
        popupController.showToast(`تم تحديد ${message.elements?.length || 0} عنصر`, 'success');
    }
});
