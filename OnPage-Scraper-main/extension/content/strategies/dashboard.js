/**
 * Moodle Dashboard Strategy
 * استخراج بيانات لوحة التحكم: الدورات، الأحداث القادمة، المهام
 * 
 * Phase 1: Dedicated strategy for dashboard page
 * Phase 3: Multiple selectors with fallback, version-aware
 */

class MoodleDashboardStrategy {
    constructor(moodleVersion) {
        this.version = moodleVersion;
        this.selectors = this._getSelectors();
    }

    /**
     * إعداد الـ selectors بناءً على إصدار Moodle
     */
    _getSelectors() {
        const base = {
            // Course cards / course list
            courseCards: [
                '[data-region="course-content"] .coursebox',
                '.course-card',
                '.card.dashboard-card',
                '[data-region="myoverview"] .course-listitem',
                '.courses .coursebox',
                '.block_myoverview .course-info-container',
                'div[role="listitem"][data-course-id]',
                '.mycourses .courses-view-course-item'
            ],
            courseLink: [
                'a[href*="course/view.php"]',
                '.coursename a',
                '.course-card a.aalink',
                'h3.coursename a',
                '.multiline .coursename a',
                '[data-action="view-course"]'
            ],
            courseName: [
                '.coursename',
                '.course-card .multiline span',
                '.card-title',
                'h3.coursename',
                '[data-region="course-content"] .course-title',
                '.aalink .multiline span:first-child'
            ],
            courseTeacher: [
                '.teachers',
                '.course-contacts',
                '.course-teacher',
                '[data-region="course-teachers"]'
            ],
            // Timeline / upcoming events
            timeline: [
                '[data-region="timeline"]',
                '.block_timeline',
                '.block_recentlyaccesseditems',
                '#block-timeline'
            ],
            timelineItem: [
                '[data-region="event-list-item"]',
                '.event-list-item',
                '.timeline-event-list-item',
                '[data-region="event-list-content"] li'
            ],
            // User info
            userMenu: [
                '#user-menu-toggle',
                '.userbutton',
                '.usermenu',
                '[data-region="usermenu"]'
            ],
            userName: [
                '.usertext',
                '.userbutton .usertext',
                '.usermenu .login span',
                '#user-menu-toggle span'
            ]
        };

        return base;
    }

    /**
     * استخراج البيانات من الصفحة الحالية (content script)
     */
    async extract() {
        return this.extractFromDocument(document, window.location.href);
    }

    /**
     * استخراج البيانات من document (يعمل مع fetch أيضاً)
     */
    async extractFromDocument(doc, url) {
        const result = {
            type: 'dashboard',
            url: url,
            user: this._extractUser(doc),
            courses: this._extractCourses(doc),
            timeline: this._extractTimeline(doc),
            extractedAt: new Date().toISOString()
        };

        return result;
    }

    /**
     * استخراج معلومات المستخدم
     */
    _extractUser(doc) {
        const userName = this._queryFirst(doc, this.selectors.userName);
        return {
            name: userName?.textContent?.trim() || null,
            id: this._extractUserId(doc)
        };
    }

    /**
     * استخراج معرف المستخدم
     */
    _extractUserId(doc) {
        // Method 1: من URL الملف الشخصي
        const profileLink = doc.querySelector('a[href*="user/profile.php"]');
        if (profileLink) {
            const match = profileLink.href.match(/id=(\d+)/);
            if (match) return match[1];
        }

        // Method 2: من M.cfg.userId
        try {
            const scripts = doc.querySelectorAll('script');
            for (const script of scripts) {
                const text = script.textContent || '';
                const match = text.match(/sesskey["']?\s*[:=]\s*["']([a-zA-Z0-9]+)/);
                if (match) {
                    // Try to find userId nearby
                    const userMatch = text.match(/userId["']?\s*[:=]\s*(\d+)/);
                    if (userMatch) return userMatch[1];
                }
            }
        } catch (e) { /* ignore */ }

        // Method 3: من data attributes
        const userElement = doc.querySelector('[data-userid], [data-user-id]');
        if (userElement) {
            return userElement.getAttribute('data-userid') || 
                   userElement.getAttribute('data-user-id');
        }

        return null;
    }

    /**
     * استخراج قائمة الدورات
     */
    _extractCourses(doc) {
        const courses = [];
        const seenIds = new Set();

        // Try each course card selector
        let courseElements = [];
        for (const selector of this.selectors.courseCards) {
            courseElements = doc.querySelectorAll(selector);
            if (courseElements.length > 0) break;
        }

        // Fallback: find all course links
        if (courseElements.length === 0) {
            const courseLinks = doc.querySelectorAll('a[href*="course/view.php"]');
            courseLinks.forEach(link => {
                const courseId = this._extractCourseIdFromURL(link.href);
                if (courseId && !seenIds.has(courseId)) {
                    seenIds.add(courseId);
                    courses.push({
                        course_id: courseId,
                        title: link.textContent.trim(),
                        url: link.href,
                        teachers: []
                    });
                }
            });
            return courses;
        }

        courseElements.forEach(card => {
            const course = this._extractCourseFromCard(card);
            if (course && course.course_id && !seenIds.has(course.course_id)) {
                seenIds.add(course.course_id);
                courses.push(course);
            }
        });

        return courses;
    }

    /**
     * استخراج بيانات دورة من بطاقة
     */
    _extractCourseFromCard(card) {
        // Get course link
        let link = null;
        for (const sel of this.selectors.courseLink) {
            link = card.querySelector(sel);
            if (link) break;
        }
        if (!link) link = card.querySelector('a[href*="course"]');

        // Get course name
        let name = null;
        for (const sel of this.selectors.courseName) {
            const nameEl = card.querySelector(sel);
            if (nameEl) { name = nameEl.textContent.trim(); break; }
        }
        if (!name && link) name = link.textContent.trim();

        // Get course ID
        const courseId = link ? this._extractCourseIdFromURL(link.href) :
            (card.getAttribute('data-course-id') || card.getAttribute('data-courseid'));

        // Get teachers
        const teachers = [];
        for (const sel of this.selectors.courseTeacher) {
            const teacherEls = card.querySelectorAll(sel);
            teacherEls.forEach(el => {
                const text = el.textContent.trim();
                if (text) teachers.push(text);
            });
            if (teachers.length > 0) break;
        }

        return {
            course_id: courseId || null,
            title: name || 'Unknown Course',
            url: link?.href || null,
            teachers
        };
    }

    /**
     * استخراج الجدول الزمني / الأحداث القادمة
     */
    _extractTimeline(doc) {
        const events = [];

        let items = [];
        for (const sel of this.selectors.timelineItem) {
            items = doc.querySelectorAll(sel);
            if (items.length > 0) break;
        }

        items.forEach(item => {
            const titleEl = item.querySelector('a, .event-name, [data-region="event-item-title"]');
            const dateEl = item.querySelector('time, .date, [data-region="event-date"]');
            const courseEl = item.querySelector('.course-name, .small, [data-region="course-name"]');

            events.push({
                title: titleEl?.textContent?.trim() || null,
                url: titleEl?.href || null,
                date: dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || null,
                course: courseEl?.textContent?.trim() || null
            });
        });

        return events;
    }

    /**
     * استخراج معرف الدورة من URL
     */
    _extractCourseIdFromURL(url) {
        if (!url) return null;
        const match = url.match(/[?&]id=(\d+)/);
        return match ? match[1] : null;
    }

    /**
     * مساعد: أول عنصر مطابق من قائمة selectors
     */
    _queryFirst(doc, selectors) {
        for (const sel of selectors) {
            try {
                const el = doc.querySelector(sel);
                if (el) return el;
            } catch (e) { /* invalid selector, skip */ }
        }
        return null;
    }
}

// Export
window.MoodleDashboardStrategy = MoodleDashboardStrategy;
