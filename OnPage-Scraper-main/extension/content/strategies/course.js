/**
 * Moodle Course Strategy
 * استخراج بيانات صفحة الدورة: الأنشطة، المهام، الأقسام
 * 
 * Phase 1: Dedicated strategy for course pages
 * Phase 3: Multi-selector fallback, aria labels, data attributes
 */

class MoodleCourseStrategy {
    constructor(moodleVersion) {
        this.version = moodleVersion;
        this.selectors = this._getSelectors();
    }

    _getSelectors() {
        return {
            // Course title
            courseTitle: [
                'h1.h2',
                '.page-header-headings h1',
                'h1',
                '#page-header h1',
                '.course-header h1',
                '[data-region="title-content"]'
            ],
            // Course sections
            sections: [
                '.course-content .section',
                'li.section',
                '[data-region="main-course-content"] .section',
                '.topics .section',
                '.weeks .section',
                '#region-main .section'
            ],
            sectionTitle: [
                '.sectionname',
                '.section-title',
                'h3.sectionname',
                '.sectionname span',
                '[data-region="section-title"]'
            ],
            // Activities within sections
            activities: [
                '.activity',
                'li.activity',
                '.section .activity',
                '[data-type="activity"]',
                '.course-content .activity'
            ],
            activityLink: [
                '.activityname a',
                '.activity-name-text',
                '.activity-instance a',
                '.aalink',
                'a[href*="/mod/"]'
            ],
            activityIcon: [
                '.activityiconcontainer img',
                '.activityicon',
                '.activity-icon img',
                'img.activityicon',
                '.icon.activityicon'
            ],
            // Assignment specific
            assignments: [
                '.activity.assign',
                '.activity[data-type="assign"]',
                'li.activity.modtype_assign',
                '[class*="modtype_assign"]'
            ],
            quizzes: [
                '.activity.quiz',
                '.activity[data-type="quiz"]',
                'li.activity.modtype_quiz',
                '[class*="modtype_quiz"]'
            ],
            // Participants
            participants: [
                'a[href*="user/index.php"]',
                '[data-action="participants"]'
            ],
            // Completion indicators
            completionStatus: [
                '[data-region="completionrequirements"]',
                '.completion-info',
                '.completion_complete',
                '.completion_incomplete',
                'span.autocompletion img[title]'
            ]
        };
    }

    /**
     * استخراج من الصفحة الحالية
     */
    async extract() {
        return this.extractFromDocument(document, window.location.href);
    }

    /**
     * استخراج من document
     */
    async extractFromDocument(doc, url) {
        const courseId = this._extractCourseId(url);

        return {
            type: 'course',
            url: url,
            course_id: courseId,
            title: this._extractTitle(doc),
            sections: this._extractSections(doc),
            assignments: this._extractAssignments(doc),
            quizzes: this._extractQuizzes(doc),
            activities: this._extractAllActivities(doc),
            extractedAt: new Date().toISOString()
        };
    }

    _extractTitle(doc) {
        for (const sel of this.selectors.courseTitle) {
            const el = doc.querySelector(sel);
            if (el) return el.textContent.trim();
        }
        return doc.title?.replace(' | ', ' - ')?.trim() || 'Unknown Course';
    }

    _extractCourseId(url) {
        if (!url) return null;
        const match = url.match(/[?&]id=(\d+)/);
        return match ? match[1] : null;
    }

    _extractSections(doc) {
        const sections = [];

        let sectionEls = [];
        for (const sel of this.selectors.sections) {
            sectionEls = doc.querySelectorAll(sel);
            if (sectionEls.length > 0) break;
        }

        sectionEls.forEach((section, index) => {
            // Get section title
            let title = null;
            for (const sel of this.selectors.sectionTitle) {
                const titleEl = section.querySelector(sel);
                if (titleEl) { title = titleEl.textContent.trim(); break; }
            }

            // Get activities in this section
            const activities = this._extractActivitiesFromContainer(section);

            // Section ID from data attribute
            const sectionId = section.getAttribute('data-sectionid') ||
                section.getAttribute('id')?.replace('section-', '') ||
                String(index);

            sections.push({
                section_id: sectionId,
                title: title || `Section ${index}`,
                activities: activities
            });
        });

        return sections;
    }

    _extractActivitiesFromContainer(container) {
        const activities = [];

        let activityEls = [];
        for (const sel of this.selectors.activities) {
            activityEls = container.querySelectorAll(sel);
            if (activityEls.length > 0) break;
        }

        activityEls.forEach(activity => {
            const data = this._parseActivityElement(activity);
            if (data) activities.push(data);
        });

        return activities;
    }

    _parseActivityElement(el) {
        // Get link and title
        let link = null;
        for (const sel of this.selectors.activityLink) {
            link = el.querySelector(sel);
            if (link) break;
        }

        if (!link) return null;

        // Detect activity type from class or URL
        const activityType = this._detectActivityType(el, link.href);

        // Activity ID
        const activityId = el.getAttribute('data-id') ||
            el.getAttribute('id')?.replace('module-', '') ||
            this._extractModId(link.href);

        // Completion status
        const completion = this._getCompletionStatus(el);

        return {
            activity_id: activityId,
            title: link.textContent.trim(),
            url: link.href,
            type: activityType,
            completion: completion
        };
    }

    _detectActivityType(el, url) {
        // From data attribute
        const dataType = el.getAttribute('data-type') || 
                         el.getAttribute('data-activityname');
        if (dataType) return dataType;

        // From class name
        const className = el.className || '';
        const typeMatch = className.match(/modtype_(\w+)/);
        if (typeMatch) return typeMatch[1];

        // From URL
        if (!url) return 'unknown';
        const urlMatch = url.match(/\/mod\/(\w+)\//);
        return urlMatch ? urlMatch[1] : 'unknown';
    }

    _extractModId(url) {
        if (!url) return null;
        const match = url.match(/[?&]id=(\d+)/);
        return match ? match[1] : null;
    }

    _getCompletionStatus(el) {
        // Check completion indicators
        for (const sel of this.selectors.completionStatus) {
            const completionEl = el.querySelector(sel);
            if (completionEl) {
                const title = completionEl.getAttribute('title') || '';
                const ariaLabel = completionEl.getAttribute('aria-label') || '';
                const text = completionEl.textContent?.trim() || '';
                const combined = `${title} ${ariaLabel} ${text}`.toLowerCase();

                if (combined.includes('complete') && !combined.includes('not complete') &&
                    !combined.includes('incomplete')) {
                    return 'completed';
                }
                if (combined.includes('not complete') || combined.includes('incomplete')) {
                    return 'incomplete';
                }
                return 'unknown';
            }
        }

        // Check for completion CSS classes
        if (el.classList.contains('completion_complete')) return 'completed';
        if (el.classList.contains('completion_incomplete')) return 'incomplete';

        return null;
    }

    _extractAssignments(doc) {
        const assignments = [];

        for (const sel of this.selectors.assignments) {
            const els = doc.querySelectorAll(sel);
            els.forEach(el => {
                const data = this._parseActivityElement(el);
                if (data) {
                    data.type = 'assign';
                    assignments.push(data);
                }
            });
            if (assignments.length > 0) break;
        }

        return assignments;
    }

    _extractQuizzes(doc) {
        const quizzes = [];

        for (const sel of this.selectors.quizzes) {
            const els = doc.querySelectorAll(sel);
            els.forEach(el => {
                const data = this._parseActivityElement(el);
                if (data) {
                    data.type = 'quiz';
                    quizzes.push(data);
                }
            });
            if (quizzes.length > 0) break;
        }

        return quizzes;
    }

    _extractAllActivities(doc) {
        const activities = [];
        const seenIds = new Set();

        let activityEls = [];
        for (const sel of this.selectors.activities) {
            activityEls = doc.querySelectorAll(sel);
            if (activityEls.length > 0) break;
        }

        activityEls.forEach(el => {
            const data = this._parseActivityElement(el);
            if (data && data.activity_id && !seenIds.has(data.activity_id)) {
                seenIds.add(data.activity_id);
                activities.push(data);
            }
        });

        return activities;
    }
}

// Export
window.MoodleCourseStrategy = MoodleCourseStrategy;
