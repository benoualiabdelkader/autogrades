/**
 * MoodleScraperController - Background Service Worker Coordinator
 * يتحكم في عملية الاستخراج المتعدد الصفحات من الخلفية
 * 
 * Controls multi-page scraping via chrome.scripting API from background.
 * Coordinates with content scripts and manages scraping sessions.
 */

class MoodleScraperController {
    constructor() {
        this.isRunning = false;
        this.currentSession = null;
        this.progress = { phase: 'idle', completed: 0, total: 0, errors: 0 };
    }

    /**
     * Start full auto-scrape by injecting the scraper into the active Moodle tab.
     * Called from the popup or via message.
     */
    async startAutoScrape(tabId, config = {}) {
        if (this.isRunning) {
            return { success: false, error: 'Scrape already in progress' };
        }

        this.isRunning = true;
        this.progress = { phase: 'starting', completed: 0, total: 0, errors: 0 };

        try {
            // Inject the auto-scraper if not already loaded
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content/moodle-auto-scraper.js']
            });

            // Start the scraper in the content script
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                func: (scraperConfig) => {
                    return new Promise((resolve) => {
                        const scraper = new window.MoodleAutoScraper({
                            ...scraperConfig,
                            onProgress: (p) => {
                                // Send progress updates to background
                                chrome.runtime.sendMessage({
                                    action: 'moodle_scrapeProgress',
                                    progress: p
                                });
                            },
                            onComplete: (data) => {
                                // Store the scraped data
                                chrome.storage.local.set({
                                    'moodle_auto_scrape_result': {
                                        data,
                                        timestamp: new Date().toISOString(),
                                    }
                                });
                                resolve({ success: true, data });
                            },
                            onError: (err) => {
                                resolve({ success: false, error: err.message });
                            }
                        });

                        // Expose for stop/status commands
                        window._activeAutoScraper = scraper;
                        scraper.startFullScrape().then(resolve);
                    });
                },
                args: [config]
            });

            const result = results?.[0]?.result;
            this.isRunning = false;
            this.progress.phase = result?.success ? 'complete' : 'error';

            // Merge into normalized store
            if (result?.success && result?.data) {
                await this._mergeAutoScrapeData(result.data);
            }

            return result || { success: false, error: 'No result from content script' };
        } catch (error) {
            this.isRunning = false;
            this.progress.phase = 'error';
            console.error('[ScraperController] Auto-scrape failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Stop the auto-scraper from the background.
     */
    async stopAutoScrape(tabId) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    if (window._activeAutoScraper) {
                        window._activeAutoScraper.stop();
                        return { success: true };
                    }
                    return { success: false, error: 'No active scraper' };
                }
            });
            this.isRunning = false;
            this.progress.phase = 'stopped';
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get status of the current scraping session.
     */
    async getStatus(tabId) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    if (window._activeAutoScraper) {
                        return {
                            isRunning: window._activeAutoScraper.isRunning,
                            progress: window._activeAutoScraper.getProgress(),
                        };
                    }
                    return { isRunning: false, progress: null };
                }
            });
            return results?.[0]?.result || { isRunning: false };
        } catch {
            return { isRunning: false };
        }
    }

    /**
     * Get the last auto-scrape result from storage.
     */
    async getLastResult() {
        return new Promise(resolve => {
            chrome.storage.local.get(['moodle_auto_scrape_result'], result => {
                resolve(result.moodle_auto_scrape_result || null);
            });
        });
    }

    /**
     * Export last data as CSV.
     */
    async exportCSV(tabId) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    if (window._activeAutoScraper) {
                        return window._activeAutoScraper.exportCSV();
                    }
                    return null;
                }
            });
            return results?.[0]?.result || null;
        } catch {
            return null;
        }
    }

    /**
     * Merge auto-scrape data into the existing normalized Moodle data store.
     */
    async _mergeAutoScrapeData(scrapeData) {
        return new Promise(resolve => {
            chrome.storage.local.get(['moodle_normalized_data'], (result) => {
                const existing = result.moodle_normalized_data || {
                    user_id: null,
                    courses: [],
                    assignments: [],
                    grades: [],
                    students: [],
                    synced_at: null,
                };

                // Merge courses
                if (scrapeData.courses) {
                    for (const course of scrapeData.courses) {
                        const idx = existing.courses.findIndex(c =>
                            c.course_id === course.id || c.id === course.id
                        );
                        const normalized = {
                            course_id: course.id,
                            name: course.name,
                            shortname: course.shortname || '',
                            url: course.url,
                            source: 'auto-scrape',
                        };
                        if (idx >= 0) {
                            existing.courses[idx] = { ...existing.courses[idx], ...normalized };
                        } else {
                            existing.courses.push(normalized);
                        }
                    }
                }

                // Merge assignments
                if (scrapeData.assignments) {
                    for (const a of scrapeData.assignments) {
                        const idx = existing.assignments.findIndex(x =>
                            x.assignment_id === a.id || x.id === a.id
                        );
                        const normalized = {
                            assignment_id: a.id,
                            course_id: a.courseId,
                            title: a.name,
                            type: a.type,
                            url: a.url,
                            source: 'auto-scrape',
                        };
                        if (idx >= 0) {
                            existing.assignments[idx] = { ...existing.assignments[idx], ...normalized };
                        } else {
                            existing.assignments.push(normalized);
                        }
                    }
                }

                // Merge grades
                if (scrapeData.grades) {
                    for (const g of scrapeData.grades) {
                        const idx = existing.grades.findIndex(x =>
                            x.student_id === g.studentId &&
                            x.assignment_id === g.assignmentId
                        );
                        const normalized = {
                            student_id: g.studentId,
                            student_name: g.studentName,
                            assignment_id: g.assignmentId,
                            assignment_name: g.assignmentName,
                            course_id: g.courseId,
                            course_name: g.courseName,
                            grade: g.grade,
                            max_grade: g.maxGrade,
                            percentage: g.percentage,
                            status: g.status,
                            source: 'auto-scrape',
                        };
                        if (idx >= 0) {
                            existing.grades[idx] = { ...existing.grades[idx], ...normalized };
                        } else {
                            existing.grades.push(normalized);
                        }
                    }
                }

                // Merge students
                if (scrapeData.students) {
                    if (!existing.students) existing.students = [];
                    for (const s of scrapeData.students) {
                        const idx = existing.students.findIndex(x =>
                            x.id === s.id || x.name === s.name
                        );
                        if (idx >= 0) {
                            existing.students[idx] = { ...existing.students[idx], ...s, source: 'auto-scrape' };
                        } else {
                            existing.students.push({ ...s, source: 'auto-scrape' });
                        }
                    }
                }

                existing.synced_at = new Date().toISOString();
                existing.last_auto_scrape = {
                    timestamp: scrapeData.metadata?.scrapedAt,
                    duration: scrapeData.metadata?.duration,
                    pagesScraped: scrapeData.metadata?.pagesScraped,
                    errors: scrapeData.metadata?.errors?.length || 0,
                };

                chrome.storage.local.set({ 'moodle_normalized_data': existing }, resolve);
            });
        });
    }
}

// Make globally available in the service worker
if (typeof self !== 'undefined') {
    self.MoodleScraperController = MoodleScraperController;
}
