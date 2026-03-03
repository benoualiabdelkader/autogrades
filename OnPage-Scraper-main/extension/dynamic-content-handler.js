/**
 * Dynamic Content Handler
 * معالج المحتوى الديناميكي - للتعامل مع المواقع التي تحمل المحتوى بـ JavaScript
 */

class DynamicContentHandler {
    constructor() {
        this.observerInstances = [];
        this.scrollHandlers = [];
        this.ajaxInterceptors = [];
        this.loadedContent = new Set();
    }

    /**
     * انتظار تحميل المحتوى الديناميكي
     */
    async waitForDynamicContent(options = {}) {
        const {
            timeout = 30000,
            checkInterval = 500,
            selector = null,
            scrollToBottom = false,
            waitForAjax = true,
            minLoadTime = 1000
        } = options;

        const startTime = Date.now();
        
        // إذا كان هناك selector محدد، انتظر حتى يظهر
        if (selector) {
            await this.waitForSelector(selector, timeout);
        }

        // انتظار تحميل AJAX
        if (waitForAjax) {
            await this.waitForAjaxRequests(timeout);
        }

        // التمرير إلى الأسفل لتحميل المحتوى الكسول (Lazy Loading)
        if (scrollToBottom) {
            await this.scrollAndWaitForContent(timeout);
        }

        // انتظار الحد الأدنى من الوقت
        const elapsed = Date.now() - startTime;
        if (elapsed < minLoadTime) {
            await this.sleep(minLoadTime - elapsed);
        }

        return {
            success: true,
            loadTime: Date.now() - startTime
        };
    }

    /**
     * انتظار ظهور عنصر محدد
     */
    waitForSelector(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            // Check if already exists
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            this.observerInstances.push(observer);

            // Timeout
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for selector: ${selector}`));
            }, timeout);
        });
    }

    /**
     * انتظار انتهاء طلبات AJAX
     */
    async waitForAjaxRequests(timeout = 10000) {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const checkAjax = () => {
                // Check if jQuery is available
                if (typeof jQuery !== 'undefined' && jQuery.active > 0) {
                    if (Date.now() - startTime < timeout) {
                        setTimeout(checkAjax, 100);
                    } else {
                        resolve();
                    }
                } else {
                    resolve();
                }
            };

            checkAjax();
        });
    }

    /**
     * التمرير التلقائي وانتظار تحميل المحتوى
     */
    async scrollAndWaitForContent(timeout = 30000) {
        const startTime = Date.now();
        let lastHeight = document.body.scrollHeight;
        let scrollAttempts = 0;
        const maxScrollAttempts = 20;

        while (scrollAttempts < maxScrollAttempts && Date.now() - startTime < timeout) {
            // Scroll to bottom
            window.scrollTo(0, document.body.scrollHeight);
            
            // Wait for content to load
            await this.sleep(1000);

            // Check if new content loaded
            const newHeight = document.body.scrollHeight;
            
            if (newHeight === lastHeight) {
                scrollAttempts++;
            } else {
                scrollAttempts = 0; // Reset if new content found
                lastHeight = newHeight;
            }
        }

        // Scroll back to top
        window.scrollTo(0, 0);

        return {
            success: true,
            scrolls: maxScrollAttempts - scrollAttempts,
            finalHeight: lastHeight
        };
    }

    /**
     * مراقبة التغييرات في DOM
     */
    observeDOMChanges(callback, options = {}) {
        const {
            target = document.body,
            childList = true,
            subtree = true,
            attributes = false,
            characterData = false
        } = options;

        const observer = new MutationObserver((mutations) => {
            callback(mutations);
        });

        observer.observe(target, {
            childList,
            subtree,
            attributes,
            characterData
        });

        this.observerInstances.push(observer);

        return observer;
    }

    /**
     * اعتراض طلبات Fetch
     */
    interceptFetch() {
        const originalFetch = window.fetch;
        const interceptedRequests = [];

        window.fetch = async (...args) => {
            const request = {
                url: args[0],
                options: args[1],
                timestamp: Date.now()
            };

            interceptedRequests.push(request);

            const response = await originalFetch(...args);
            
            request.status = response.status;
            request.completed = Date.now();

            return response;
        };

        return {
            restore: () => {
                window.fetch = originalFetch;
            },
            getRequests: () => interceptedRequests
        };
    }

    /**
     * اعتراض طلبات XMLHttpRequest
     */
    interceptXHR() {
        const originalXHR = window.XMLHttpRequest;
        const interceptedRequests = [];

        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const request = {
                method: '',
                url: '',
                timestamp: Date.now()
            };

            // Override open
            const originalOpen = xhr.open;
            xhr.open = function(method, url, ...args) {
                request.method = method;
                request.url = url;
                interceptedRequests.push(request);
                return originalOpen.apply(xhr, [method, url, ...args]);
            };

            // Track completion
            xhr.addEventListener('loadend', () => {
                request.status = xhr.status;
                request.completed = Date.now();
            });

            return xhr;
        };

        return {
            restore: () => {
                window.XMLHttpRequest = originalXHR;
            },
            getRequests: () => interceptedRequests
        };
    }

    /**
     * التعامل مع Infinite Scroll
     */
    async handleInfiniteScroll(options = {}) {
        const {
            maxScrolls = 10,
            scrollDelay = 2000,
            containerSelector = null,
            itemSelector = null
        } = options;

        const items = new Set();
        let scrollCount = 0;
        let lastItemCount = 0;

        while (scrollCount < maxScrolls) {
            // Get current items
            if (itemSelector) {
                const currentItems = document.querySelectorAll(itemSelector);
                currentItems.forEach(item => {
                    items.add(item);
                });

                if (items.size === lastItemCount) {
                    // No new items, stop scrolling
                    break;
                }

                lastItemCount = items.size;
            }

            // Scroll
            if (containerSelector) {
                const container = document.querySelector(containerSelector);
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            } else {
                window.scrollTo(0, document.body.scrollHeight);
            }

            // Wait
            await this.sleep(scrollDelay);
            scrollCount++;
        }

        return {
            success: true,
            itemsFound: items.size,
            scrollsPerformed: scrollCount
        };
    }

    /**
     * انتظار تحميل الصور
     */
    async waitForImages(timeout = 10000) {
        const images = Array.from(document.querySelectorAll('img'));
        const startTime = Date.now();

        const promises = images.map(img => {
            return new Promise((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.addEventListener('load', resolve);
                    img.addEventListener('error', resolve);
                    
                    // Timeout for individual image
                    setTimeout(resolve, timeout);
                }
            });
        });

        await Promise.all(promises);

        return {
            success: true,
            imagesCount: images.length,
            loadTime: Date.now() - startTime
        };
    }

    /**
     * تنفيذ JavaScript مخصص
     */
    async executeScript(scriptCode) {
        try {
            const result = eval(scriptCode);
            return {
                success: true,
                result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * الحصول على بيانات من API
     */
    async fetchAPIData(url, options = {}) {
        try {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers: options.headers || {},
                body: options.body || null
            });

            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            return {
                success: true,
                status: response.status,
                data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * مراقبة تحميل محتوى جديد
     */
    watchForNewContent(callback, options = {}) {
        const {
            selector = '*',
            debounce = 500
        } = options;

        let timeout;

        const observer = this.observeDOMChanges((mutations) => {
            clearTimeout(timeout);
            
            timeout = setTimeout(() => {
                const newElements = [];
                
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            if (node.matches(selector)) {
                                newElements.push(node);
                            }
                            // Check children
                            const children = node.querySelectorAll(selector);
                            newElements.push(...children);
                        }
                    });
                });

                if (newElements.length > 0) {
                    callback(newElements);
                }
            }, debounce);
        });

        return observer;
    }

    /**
     * تنظيف جميع المراقبين
     */
    cleanup() {
        this.observerInstances.forEach(observer => {
            observer.disconnect();
        });
        this.observerInstances = [];
    }

    /**
     * دالة مساعدة للانتظار
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * التحقق من اكتمال تحميل الصفحة
     */
    async waitForPageLoad() {
        if (document.readyState === 'complete') {
            return { success: true };
        }

        return new Promise((resolve) => {
            window.addEventListener('load', () => {
                resolve({ success: true });
            });
        });
    }

    /**
     * تحميل محتوى lazy loading
     */
    async triggerLazyLoad() {
        const lazyElements = document.querySelectorAll('[loading="lazy"], [data-src]');
        
        lazyElements.forEach(element => {
            // Scroll element into view to trigger loading
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        // Wait for lazy loading to complete
        await this.sleep(1000);

        return {
            success: true,
            elementsTriggered: lazyElements.length
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicContentHandler;
}
