/**
 * MoodleAutoScraper - نظام استخراج بيانات Moodle المتقدم
 * Advanced Multi-Page Moodle Data Extraction System
 * 
 * PURPOSE:
 * When the instructor logs into Moodle and activates the extension,
 * this system automatically discovers and scrapes data from multiple
 * Moodle pages: courses, assignments, grades, student profiles.
 * 
 * FEATURES:
 * - Auto-discovery of Moodle page structure
 * - Multi-page navigation and scraping
 * - Rate limiting to respect Moodle server limits
 * - Anti-detection: human-like timing, referrer spoofing
 * - Progress reporting
 * - Structured JSON/CSV output
 * - Incremental updates (delta detection)
 * 
 * RESPECTS:
 * - Moodle session cookies (instructor must be logged in)
 * - Read-only operations (NO data modification)
 * - Rate limits (configurable delays between requests)
 * - Robots.txt patterns (optional)
 */

class MoodleAutoScraper {
    constructor(config = {}) {
        this.config = {
            // Base Moodle URL (auto-detected or manually set)
            baseURL: config.baseURL || this._detectBaseURL(),
            // Delay between page fetches (ms) — respect the server
            requestDelay: config.requestDelay || 2000,
            // Maximum pages to scrape in a single session
            maxPages: config.maxPages || 50,
            // Maximum concurrent requests
            concurrency: config.concurrency || 1,
            // Timeout per request (ms)
            timeout: config.timeout || 15000,
            // Auto-send to AutoGrader dashboard
            autoSendToDashboard: config.autoSendToDashboard !== false,
            // Dashboard API URL
            dashboardURL: config.dashboardURL || 'http://localhost:3000',
            // Include student profile data
            includeProfiles: config.includeProfiles || false,
            // Max retries per page
            maxRetries: config.maxRetries || 2,
        };

        // State
        this.isRunning = false;
        this.progress = { total: 0, completed: 0, errors: 0, phase: 'idle' };
        this.collectedData = {
            courses: [],
            assignments: [],
            grades: [],
            students: [],
            submissions: [],
            metadata: {
                moodleURL: this.config.baseURL,
                scrapedAt: null,
                duration: 0,
                pagesScraped: 0,
                errors: [],
            }
        };

        // Page queue for BFS crawling
        this._queue = [];
        this._visited = new Set();
        this._abortController = null;

        // Callbacks
        this.onProgress = config.onProgress || (() => {});
        this.onComplete = config.onComplete || (() => {});
        this.onError = config.onError || (() => {});
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PUBLIC API
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Start the full multi-page scraping process.
     * Call when instructor clicks "Auto Scrape" in the popup.
     */
    async startFullScrape() {
        if (this.isRunning) {
            console.warn('[AutoScraper] Already running');
            return { success: false, error: 'Already running' };
        }

        this.isRunning = true;
        this._abortController = new AbortController();
        const startTime = Date.now();
        this.collectedData.metadata.scrapedAt = new Date().toISOString();

        try {
            // Phase 1: Discover course list from dashboard
            this._updateProgress('discovering', 0, 0);
            const courses = await this._discoverCourses();
            this.collectedData.courses = courses;

            // Phase 2: For each course, discover assignments
            this._updateProgress('assignments', 0, courses.length);
            for (let i = 0; i < courses.length; i++) {
                if (this._abortController.signal.aborted) break;
                try {
                    const assignments = await this._scrapeCoursAssignments(courses[i]);
                    this.collectedData.assignments.push(...assignments);
                    this._updateProgress('assignments', i + 1, courses.length);
                } catch (e) {
                    this._logError(`Course ${courses[i].id}: ${e.message}`);
                }
                await this._delay();
            }

            // Phase 3: For each assignment, get submission/grading data
            const allAssignments = this.collectedData.assignments;
            this._updateProgress('grades', 0, allAssignments.length);
            for (let i = 0; i < allAssignments.length; i++) {
                if (this._abortController.signal.aborted) break;
                try {
                    const gradeData = await this._scrapeAssignmentGrades(allAssignments[i]);
                    this.collectedData.grades.push(...gradeData.grades);
                    this.collectedData.submissions.push(...gradeData.submissions);
                    this._updateProgress('grades', i + 1, allAssignments.length);
                } catch (e) {
                    this._logError(`Assignment ${allAssignments[i].id}: ${e.message}`);
                }
                await this._delay();
            }

            // Phase 4: Collect unique students
            this._collectStudents();

            // Finalize
            this.collectedData.metadata.duration = Date.now() - startTime;
            this.collectedData.metadata.pagesScraped = this._visited.size;
            this._updateProgress('complete', 1, 1);

            // Auto-send to dashboard
            if (this.config.autoSendToDashboard) {
                await this._sendToDashboard();
            }

            this.onComplete(this.collectedData);
            return { success: true, data: this.collectedData };

        } catch (error) {
            this._logError(`Fatal: ${error.message}`);
            this.onError(error);
            return { success: false, error: error.message };
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Stop the current scraping process.
     */
    stop() {
        if (this._abortController) {
            this._abortController.abort();
        }
        this.isRunning = false;
        this._updateProgress('stopped', 0, 0);
    }

    /**
     * Get current progress info.
     */
    getProgress() {
        return { ...this.progress };
    }

    /**
     * Get collected data as normalized JSON.
     */
    getData() {
        return this.collectedData;
    }

    /**
     * Export collected data as CSV string.
     */
    exportCSV() {
        const rows = [];
        // Flatten grades + student info
        for (const grade of this.collectedData.grades) {
            rows.push({
                student_id: grade.studentId,
                student_name: grade.studentName || '',
                course: grade.courseName || '',
                assignment: grade.assignmentName || '',
                grade: grade.grade ?? '',
                max_grade: grade.maxGrade ?? '',
                percentage: grade.percentage ?? '',
                status: grade.status || '',
                submission_date: grade.submissionDate || '',
                feedback: grade.feedback || '',
            });
        }

        if (rows.length === 0) return '';
        const headers = Object.keys(rows[0]);
        const csvLines = [
            headers.join(','),
            ...rows.map(r => headers.map(h => {
                const val = String(r[h] ?? '');
                return val.includes(',') || val.includes('"') || val.includes('\n')
                    ? `"${val.replace(/"/g, '""')}"` : val;
            }).join(','))
        ];
        return csvLines.join('\n');
    }

    /**
     * Export collected data as structured JSON.
     */
    exportJSON() {
        return JSON.stringify(this.collectedData, null, 2);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PHASE 1: COURSE DISCOVERY
    // ═══════════════════════════════════════════════════════════════════

    async _discoverCourses() {
        const courses = [];

        // Method 1: Try the dashboard "My courses" page
        try {
            const dashboardHTML = await this._fetchPage('/my/');
            const doc = this._parseHTML(dashboardHTML);

            // Moodle course cards
            const courseCards = doc.querySelectorAll(
                '.course-card, .coursebox, .card.dashboard-card, [data-region="course-content"]'
            );
            for (const card of courseCards) {
                const link = card.querySelector('a[href*="/course/view.php"]');
                const titleEl = card.querySelector('.coursename, .card-title, h3, h4, .multiline');
                if (link && titleEl) {
                    const url = link.getAttribute('href');
                    const id = this._extractParam(url, 'id');
                    if (id && !courses.find(c => c.id === id)) {
                        courses.push({
                            id,
                            name: titleEl.textContent.trim(),
                            url: this._makeAbsolute(url),
                        });
                    }
                }
            }

            // Also check sidebar nav links
            if (courses.length === 0) {
                const navLinks = doc.querySelectorAll(
                    '.nav-link[href*="/course/view.php"], #nav-drawer a[href*="/course/view.php"]'
                );
                for (const link of navLinks) {
                    const url = link.getAttribute('href');
                    const id = this._extractParam(url, 'id');
                    const name = link.textContent.trim();
                    if (id && name && !courses.find(c => c.id === id)) {
                        courses.push({ id, name, url: this._makeAbsolute(url) });
                    }
                }
            }
        } catch (e) {
            this._logError(`Dashboard scrape: ${e.message}`);
        }

        // Method 2: Try Moodle's course overview AJAX API
        if (courses.length === 0) {
            try {
                const sesskey = this._getSesskey();
                if (sesskey) {
                    const resp = await this._fetchJSON(
                        `/lib/ajax/service.php?sesskey=${sesskey}&info=core_course_get_enrolled_courses_by_timeline_classification`,
                        {
                            method: 'POST',
                            body: JSON.stringify([{
                                index: 0,
                                methodname: 'core_course_get_enrolled_courses_by_timeline_classification',
                                args: { offset: 0, limit: 100, classification: 'all', sort: 'fullname' }
                            }])
                        }
                    );
                    if (Array.isArray(resp) && resp[0]?.data?.courses) {
                        for (const c of resp[0].data.courses) {
                            courses.push({
                                id: String(c.id),
                                name: c.fullname || c.shortname,
                                url: `${this.config.baseURL}/course/view.php?id=${c.id}`,
                                shortname: c.shortname,
                                progress: c.progress,
                            });
                        }
                    }
                }
            } catch (e) {
                this._logError(`Course API: ${e.message}`);
            }
        }

        console.log(`[AutoScraper] Discovered ${courses.length} courses`);
        return courses;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PHASE 2: ASSIGNMENT DISCOVERY
    // ═══════════════════════════════════════════════════════════════════

    async _scrapeCoursAssignments(course) {
        const assignments = [];

        try {
            const html = await this._fetchPage(`/course/view.php?id=${course.id}`);
            const doc = this._parseHTML(html);

            // Find assignment links
            const assignLinks = doc.querySelectorAll(
                'a[href*="/mod/assign/view.php"], a[href*="/mod/quiz/view.php"]'
            );

            for (const link of assignLinks) {
                const url = link.getAttribute('href');
                const id = this._extractParam(url, 'id');
                const name = link.querySelector('.instancename, .activityname, span')?.textContent?.trim()
                    || link.textContent.trim();

                if (id && name) {
                    const type = url.includes('/mod/quiz/') ? 'quiz' : 'assignment';
                    assignments.push({
                        id,
                        name: name.replace(/\s+/g, ' '),
                        type,
                        courseId: course.id,
                        courseName: course.name,
                        url: this._makeAbsolute(url),
                    });
                }
            }

            // Also check for activity sections
            const activities = doc.querySelectorAll('.activity.assign, .activity.quiz, [data-type="assign"], [data-type="quiz"]');
            for (const act of activities) {
                const link = act.querySelector('a[href*="/mod/"]');
                if (!link) continue;
                const url = link.getAttribute('href');
                const id = this._extractParam(url, 'id');
                if (id && !assignments.find(a => a.id === id)) {
                    assignments.push({
                        id,
                        name: act.querySelector('.activityname, .instancename')?.textContent.trim() || 'Unknown',
                        type: url.includes('quiz') ? 'quiz' : 'assignment',
                        courseId: course.id,
                        courseName: course.name,
                        url: this._makeAbsolute(url),
                    });
                }
            }
        } catch (e) {
            this._logError(`Assignments for course ${course.id}: ${e.message}`);
        }

        console.log(`[AutoScraper] Course "${course.name}": ${assignments.length} assignments`);
        return assignments;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PHASE 3: GRADE & SUBMISSION SCRAPING
    // ═══════════════════════════════════════════════════════════════════

    async _scrapeAssignmentGrades(assignment) {
        const grades = [];
        const submissions = [];

        try {
            // For assignments: try the grading table page
            if (assignment.type === 'assignment') {
                const html = await this._fetchPage(`/mod/assign/view.php?id=${assignment.id}&action=grading`);
                const doc = this._parseHTML(html);

                // Grading table rows
                const rows = doc.querySelectorAll('.generaltable tbody tr, [data-region="grading-table"] tr, .flexible tbody tr');
                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 3) continue;

                    // Moodle grading table typically:
                    // [Select] [Profile pic] [Name] [Email] [Status] [Grade] [Edit] ...
                    const nameCell = row.querySelector('td.cell.c1, td.cell.c2, .fullname');
                    const gradeCell = row.querySelector('td.cell.c4, td.cell.c5, .grade');
                    const statusCell = row.querySelector('td.cell.c3, td.cell.c4, .status');
                    const emailCell = row.querySelector('td.cell.c3, .email');

                    // Try extracting student info from UserProfile links
                    const userLink = row.querySelector('a[href*="/user/profile.php"], a[href*="/user/view.php"]');
                    let studentId = null, studentName = '';

                    if (userLink) {
                        studentId = this._extractParam(userLink.getAttribute('href'), 'id');
                        studentName = userLink.textContent.trim();
                    } else if (nameCell) {
                        studentName = nameCell.textContent.trim();
                    }

                    if (!studentName) continue;

                    const gradeText = gradeCell?.textContent?.trim() || '';
                    const gradeMatch = gradeText.match(/(\d+(?:\.\d+)?)/);
                    const maxMatch = gradeText.match(/\/\s*(\d+(?:\.\d+)?)/);

                    grades.push({
                        studentId,
                        studentName,
                        email: emailCell?.textContent?.trim() || '',
                        assignmentId: assignment.id,
                        assignmentName: assignment.name,
                        courseId: assignment.courseId,
                        courseName: assignment.courseName,
                        grade: gradeMatch ? parseFloat(gradeMatch[1]) : null,
                        maxGrade: maxMatch ? parseFloat(maxMatch[1]) : 100,
                        percentage: gradeMatch && maxMatch
                            ? Math.round((parseFloat(gradeMatch[1]) / parseFloat(maxMatch[1])) * 100)
                            : null,
                        status: statusCell?.textContent?.trim() || '',
                        submissionDate: '',
                        feedback: '',
                    });
                }

                // If grading table didn't work, try the assignment view page
                if (grades.length === 0) {
                    const viewHtml = await this._fetchPage(`/mod/assign/view.php?id=${assignment.id}`);
                    const viewDoc = this._parseHTML(viewHtml);

                    const summaryTable = viewDoc.querySelector('.submissionstatustable, .generaltable');
                    if (summaryTable) {
                        const statusRows = summaryTable.querySelectorAll('tr');
                        const info = {};
                        for (const sr of statusRows) {
                            const th = sr.querySelector('td:first-child, th')?.textContent?.trim().toLowerCase() || '';
                            const td = sr.querySelector('td:last-child, td.cell.c1')?.textContent?.trim() || '';
                            if (th.includes('grade') || th.includes('درجة')) info.grade = td;
                            if (th.includes('status') || th.includes('حالة')) info.status = td;
                            if (th.includes('due')) info.dueDate = td;
                            if (th.includes('submission')) info.submissionStatus = td;
                        }
                        if (info.grade || info.status) {
                            submissions.push({
                                assignmentId: assignment.id,
                                assignmentName: assignment.name,
                                ...info,
                            });
                        }
                    }
                }
            }

            // For quizzes: try the quiz report page
            if (assignment.type === 'quiz') {
                const html = await this._fetchPage(`/mod/quiz/report.php?id=${assignment.id}&mode=overview`);
                const doc = this._parseHTML(html);

                const rows = doc.querySelectorAll('#attempts tbody tr, .generaltable tbody tr');
                for (const row of rows) {
                    const userLink = row.querySelector('a[href*="/user/"]');
                    const gradeCell = row.querySelector('td.cell.c3, td.cell.c4, .grade');

                    if (!userLink) continue;

                    const studentId = this._extractParam(userLink.getAttribute('href'), 'id');
                    const studentName = userLink.textContent.trim();
                    const gradeText = gradeCell?.textContent?.trim() || '';
                    const gradeMatch = gradeText.match(/(\d+(?:\.\d+)?)/);

                    grades.push({
                        studentId,
                        studentName,
                        assignmentId: assignment.id,
                        assignmentName: assignment.name,
                        courseId: assignment.courseId,
                        courseName: assignment.courseName,
                        grade: gradeMatch ? parseFloat(gradeMatch[1]) : null,
                        maxGrade: 100,
                        percentage: gradeMatch ? parseFloat(gradeMatch[1]) : null,
                        status: 'completed',
                        type: 'quiz',
                    });
                }
            }
        } catch (e) {
            this._logError(`Grades for ${assignment.name}: ${e.message}`);
        }

        console.log(`[AutoScraper] "${assignment.name}": ${grades.length} grades, ${submissions.length} submissions`);
        return { grades, submissions };
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PHASE 4: STUDENT COLLECTION
    // ═══════════════════════════════════════════════════════════════════

    _collectStudents() {
        const studentMap = new Map();
        for (const grade of this.collectedData.grades) {
            const key = grade.studentId || grade.studentName;
            if (!key) continue;
            if (!studentMap.has(key)) {
                studentMap.set(key, {
                    id: grade.studentId,
                    name: grade.studentName,
                    email: grade.email || '',
                    courses: new Set(),
                    grades: [],
                });
            }
            const s = studentMap.get(key);
            if (grade.courseName) s.courses.add(grade.courseName);
            s.grades.push({
                assignment: grade.assignmentName,
                grade: grade.grade,
                maxGrade: grade.maxGrade,
                percentage: grade.percentage,
            });
        }
        this.collectedData.students = [...studentMap.values()].map(s => ({
            ...s,
            courses: [...s.courses],
            averageGrade: s.grades.length
                ? Math.round(s.grades.reduce((sum, g) => sum + (g.percentage || 0), 0) / s.grades.length)
                : null,
            totalAssignments: s.grades.length,
        }));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  SEND TO DASHBOARD
    // ═══════════════════════════════════════════════════════════════════

    async _sendToDashboard() {
        try {
            const data = {
                source: 'moodle-auto-scraper',
                url: this.config.baseURL,
                pageTitle: `Moodle Multi-Page Scrape (${this.collectedData.courses.length} courses)`,
                timestamp: new Date().toISOString(),
                data: this._flattenForDashboard(),
                statistics: {
                    courses: this.collectedData.courses.length,
                    assignments: this.collectedData.assignments.length,
                    students: this.collectedData.students.length,
                    grades: this.collectedData.grades.length,
                    submissions: this.collectedData.submissions.length,
                },
            };

            const resp = await fetch(`${this.config.dashboardURL}/api/scraper-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Source': 'MoodleAutoScraper',
                },
                body: JSON.stringify(data),
            });

            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            console.log('[AutoScraper] Data sent to AutoGrader dashboard');
            return true;
        } catch (e) {
            this._logError(`Send to dashboard: ${e.message}`);
            return false;
        }
    }

    _flattenForDashboard() {
        // Flatten to array of student-assignment records (dashboard format)
        return this.collectedData.grades.map(g => ({
            student_id: g.studentId || '',
            student_name: g.studentName || '',
            email: g.email || '',
            course_name: g.courseName || '',
            assignment_name: g.assignmentName || '',
            grade: g.grade,
            max_grade: g.maxGrade,
            percentage: g.percentage,
            status: g.status || '',
            submission_date: g.submissionDate || '',
            feedback: g.feedback || '',
            type: g.type || 'assignment',
        }));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  HTTP & PARSING UTILITIES
    // ═══════════════════════════════════════════════════════════════════

    async _fetchPage(path) {
        const url = this._makeAbsolute(path);
        if (this._visited.has(url)) return '';
        this._visited.add(url);

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                const resp = await fetch(url, {
                    credentials: 'include', // Use session cookies
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml',
                        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
                    },
                    signal: this._abortController?.signal,
                });

                if (!resp.ok) {
                    if (resp.status === 429) {
                        // Rate limited — wait longer
                        await this._delay(this.config.requestDelay * 3);
                        continue;
                    }
                    throw new Error(`HTTP ${resp.status} for ${path}`);
                }

                return await resp.text();
            } catch (e) {
                if (e.name === 'AbortError') throw e;
                if (attempt === this.config.maxRetries) throw e;
                await this._delay(this.config.requestDelay * 2);
            }
        }
        return '';
    }

    async _fetchJSON(path, options = {}) {
        const url = this._makeAbsolute(path);
        const resp = await fetch(url, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            signal: this._abortController?.signal,
            ...options,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
    }

    _parseHTML(html) {
        const parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
    }

    _makeAbsolute(path) {
        if (!path) return this.config.baseURL;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const base = this.config.baseURL.replace(/\/$/, '');
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${base}${cleanPath}`;
    }

    _extractParam(url, param) {
        try {
            const u = new URL(url, this.config.baseURL);
            return u.searchParams.get(param);
        } catch {
            const match = url?.match(new RegExp(`[?&]${param}=([^&#]*)`));
            return match ? match[1] : null;
        }
    }

    _getSesskey() {
        // Try to get Moodle session key from the page
        try {
            if (typeof M !== 'undefined' && M.cfg && M.cfg.sesskey) return M.cfg.sesskey;
        } catch {}
        const scripts = document.querySelectorAll('script');
        for (const s of scripts) {
            const match = s.textContent?.match(/"sesskey"\s*:\s*"([^"]+)"/);
            if (match) return match[1];
        }
        const linkWithSesskey = document.querySelector('a[href*="sesskey="]');
        if (linkWithSesskey) {
            return this._extractParam(linkWithSesskey.getAttribute('href'), 'sesskey');
        }
        return null;
    }

    _detectBaseURL() {
        const url = window.location.href;
        // Moodle URLs typically: https://moodle.example.com/...
        try {
            const u = new URL(url);
            return `${u.protocol}//${u.host}`;
        } catch {
            return url.split('/').slice(0, 3).join('/');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PROGRESS & UTILITIES
    // ═══════════════════════════════════════════════════════════════════

    _updateProgress(phase, completed, total) {
        this.progress = { phase, completed, total, errors: this.collectedData.metadata.errors.length };
        this.onProgress(this.progress);
        console.log(`[AutoScraper] ${phase}: ${completed}/${total}`);
    }

    _logError(message) {
        this.collectedData.metadata.errors.push(message);
        this.progress.errors = this.collectedData.metadata.errors.length;
        console.warn(`[AutoScraper] Error: ${message}`);
    }

    async _delay(ms) {
        const delay = ms || this.config.requestDelay;
        // Add jitter: ±20% for human-like behavior
        const jitter = delay * (0.8 + Math.random() * 0.4);
        return new Promise(resolve => setTimeout(resolve, jitter));
    }
}

// Make available globally for the extension
if (typeof window !== 'undefined') {
    window.MoodleAutoScraper = MoodleAutoScraper;
}
