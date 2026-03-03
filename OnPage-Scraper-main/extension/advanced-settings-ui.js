/**
 * Advanced Settings UI Controller
 * التحكم في واجهة الإعدادات المتقدمة
 */

let currentSettings = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    initializeTabs();
    initializeToggles();
    initializeInputs();
    initializeButtons();
    await loadStats();
});

/**
 * تحميل الإعدادات
 */
async function loadSettings() {
    try {
        const result = await chrome.storage.local.get(['advancedSettings']);
        currentSettings = result.advancedSettings || getDefaultSettings();
        applySettingsToUI(currentSettings);
    } catch (error) {
        console.error('Failed to load settings:', error);
        showToast('فشل تحميل الإعدادات', 'error');
    }
}

/**
 * تطبيق الإعدادات على الواجهة
 */
function applySettingsToUI(settings) {
    // Apply toggles
    document.querySelectorAll('.toggle').forEach(toggle => {
        const path = toggle.dataset.setting;
        const value = getNestedValue(settings, path);
        if (value !== undefined) {
            toggle.classList.toggle('active', value);
        }
    });

    // Apply inputs
    document.querySelectorAll('input, select').forEach(input => {
        const path = input.dataset.setting;
        if (path) {
            const value = getNestedValue(settings, path);
            if (value !== undefined) {
                input.value = value;
            }
        }
    });
}

/**
 * تهيئة التبويبات
 */
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add active class to clicked tab
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            document.getElementById(`${tabName}-tab`).classList.add('active');

            // Load stats if stats tab
            if (tabName === 'stats') {
                loadStats();
            }
        });
    });
}

/**
 * تهيئة أزرار التبديل
 */
function initializeToggles() {
    document.querySelectorAll('.toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            updateSetting(toggle.dataset.setting, toggle.classList.contains('active'));
        });
    });
}

/**
 * تهيئة حقول الإدخال
 */
function initializeInputs() {
    document.querySelectorAll('input, select').forEach(input => {
        if (input.dataset.setting) {
            input.addEventListener('change', (e) => {
                let value = e.target.value;
                
                // Convert to number if input type is number
                if (e.target.type === 'number') {
                    value = parseInt(value) || 0;
                }

                updateSetting(e.target.dataset.setting, value);
            });
        }
    });
}

/**
 * تهيئة الأزرار
 */
function initializeButtons() {
    // Save button
    document.getElementById('save-btn').addEventListener('click', async () => {
        await saveSettings();
    });

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', async () => {
        if (confirm('هل أنت متأكد من إعادة تعيين جميع الإعدادات للقيم الافتراضية؟')) {
            currentSettings = getDefaultSettings();
            await chrome.storage.local.set({ advancedSettings: currentSettings });
            applySettingsToUI(currentSettings);
            showToast('تم إعادة تعيين الإعدادات بنجاح', 'success');
        }
    });

    // Export settings button
    document.getElementById('export-settings-btn').addEventListener('click', () => {
        exportSettings();
    });

    // Stats buttons
    document.getElementById('refresh-stats')?.addEventListener('click', async () => {
        await loadStats();
        showToast('تم تحديث الإحصائيات', 'success');
    });

    document.getElementById('clear-stats')?.addEventListener('click', async () => {
        if (confirm('هل أنت متأكد من مسح جميع الإحصائيات؟')) {
            // Send message to content script to clear stats
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { action: 'clearStats' });
                    await loadStats();
                    showToast('تم مسح الإحصائيات', 'success');
                } catch (error) {
                    showToast('فشل مسح الإحصائيات', 'error');
                }
            }
        }
    });
}

/**
 * تحديث إعداد معين
 */
function updateSetting(path, value) {
    setNestedValue(currentSettings, path, value);
}

/**
 * حفظ الإعدادات
 */
async function saveSettings() {
    try {
        await chrome.storage.local.set({ advancedSettings: currentSettings });
        showToast('✅ تم حفظ الإعدادات بنجاح', 'success');
    } catch (error) {
        console.error('Failed to save settings:', error);
        showToast('❌ فشل حفظ الإعدادات', 'error');
    }
}

/**
 * تصدير الإعدادات
 */
function exportSettings() {
    const dataStr = JSON.stringify(currentSettings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `scraper-settings-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('تم تصدير الإعدادات', 'success');
}

/**
 * تحميل الإحصائيات
 */
async function loadStats() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        // Get performance stats
        try {
            const perfResponse = await chrome.tabs.sendMessage(tab.id, {
                action: 'getPerformanceStats'
            });

            if (perfResponse?.success && perfResponse.stats) {
                updatePerformanceStats(perfResponse.stats);
            }
        } catch (error) {
            console.log('Content script not ready:', error);
        }

        // Get cache stats
        try {
            const cacheResponse = await chrome.tabs.sendMessage(tab.id, {
                action: 'getCacheStats'
            });

            if (cacheResponse?.success && cacheResponse.stats) {
                updateCacheStats(cacheResponse.stats);
            }
        } catch (error) {
            console.log('Cache stats not available');
        }

    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

/**
 * تحديث إحصائيات الأداء
 */
function updatePerformanceStats(stats) {
    document.getElementById('total-requests').textContent = stats.totalRequests || 0;
    document.getElementById('avg-response').textContent = 
        (stats.averageRequestTime ? Math.round(stats.averageRequestTime) + ' ms' : '0 ms');
    document.getElementById('total-errors').textContent = stats.totalErrors || 0;

    // Update memory if available
    if (stats.memory) {
        document.getElementById('memory-used').textContent = stats.memory.used || '0 MB';
        document.getElementById('memory-total').textContent = stats.memory.total || '0 MB';
    }
}

/**
 * تحديث إحصائيات Cache
 */
function updateCacheStats(stats) {
    document.getElementById('cache-hit-rate').textContent = stats.hitRate || '0%';
}

/**
 * الحصول على قيمة متداخلة من كائن
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * تعيين قيمة متداخلة في كائن
 */
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        if (!current[key]) current[key] = {};
        return current[key];
    }, obj);
    target[lastKey] = value;
}

/**
 * عرض رسالة Toast
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'success' ? '#28a745' : 
                            type === 'error' ? '#dc3545' : '#ffc107';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * الإعدادات الافتراضية
 */
function getDefaultSettings() {
    return {
        dataTypes: {
            text: true,
            images: true,
            links: true,
            tables: true,
            files: true
        },
        rateLimiting: {
            enabled: true,
            requestsPerSecond: 2,
            delayBetweenRequests: 500,
            maxConcurrent: 3
        },
        sessionManagement: {
            saveSessions: true,
            saveLoginState: true,
            sessionTimeout: 3600000
        },
        userAgentRotation: {
            enabled: false,
            rotationInterval: 10,
            customUserAgents: []
        },
        proxy: {
            enabled: false,
            type: 'http',
            host: '',
            port: '',
            username: '',
            password: ''
        },
        antiDetection: {
            randomizeTimings: true,
            simulateHumanBehavior: true,
            respectRobotsTxt: true,
            avoidCaptcha: true
        },
        export: {
            format: 'json',
            includeMetadata: true,
            compression: false,
            autoSave: true
        },
        performance: {
            multiThreading: true,
            maxWorkers: 4,
            cacheEnabled: true,
            cacheSize: 100
        },
        legal: {
            respectTermsOfService: true,
            checkRobotsTxt: true,
            warnOnRestrictedSites: true,
            maxPagesPerSite: 1000
        }
    };
}
