/**
 * Moodle Assignment Strategy
 * استخراج بيانات صفحات المهام: حالة التسليم، الدرجة، التعليقات
 * 
 * Phase 1: Dedicated strategy for assignment pages
 * Phase 3: Multi-selector, aria labels, data attributes
 */

class MoodleAssignmentStrategy {
    constructor(moodleVersion) {
        this.version = moodleVersion;
        this.selectors = this._getSelectors();
    }

    _getSelectors() {
        return {
            // Assignment title
            title: [
                'h2',
                '.page-header-headings h1',
                '#region-main h2',
                '[role="main"] h2',
                '.assign-header h2'
            ],
            // Due date
            dueDate: [
                'tr:has(td:contains("Due date")) td:last-child',
                '.submissionstatustable tr:nth-child(1) td.cell.c1',
                '[data-region="duedate"]',
                'th:contains("Due") + td',
                '.assign-duedate'
            ],
            // Submission status table
            statusTable: [
                '.submissionstatustable',
                '.generaltable',
                '[data-region="submission-status"]',
                '#region-main table.generaltable'
            ],
            // Grading status
            gradingStatus: [
                '.gradingstatus',
                '.submissionstatustable .gradingstatusNotgraded',
                '.submissionstatustable .gradingstatusGraded',
                '[data-region="grading-status"]'
            ],
            // Grade
            grade: [
                '.grade',
                '.gradevalue',
                '.submissionstatustable .grade',
                '[data-region="grade-value"]',
                'td.cell.c1.lastcol .grade'
            ],
            // Feedback
            feedback: [
                '.feedback',
                '.feedbacktext',
                '.comment-area',
                '[data-region="feedback"]',
                '.submissionfeedback'
            ],
            // Submission info
            submissionStatus: [
                '.submissionstatussubmitted',
                '.submissionstatusnotsubmitted',
                '.submission-status',
                '[data-region="submission-status-value"]'
            ],
            // File submissions
            submittedFiles: [
                '.fileuploadsubmission a',
                '.submission-files a',
                '.assignsubmission_file a',
                '[data-region="submitted-files"] a'
            ],
            // Grading table (teacher view)
            gradingTable: [
                '.gradingtable',
                '#grading-table',
                '[data-region="grading-table"]',
                '.flexible.generaltable'
            ],
            // Quiz specific
            quizAttempts: [
                '.quizattemptsummary',
                'table.generaltable.quizattemptsummary',
                '[data-region="quiz-attempts"]'
            ],
            quizGrade: [
                '.quizgradefraction',
                '.bestgrade',
                '[data-region="quiz-grade"]'
            ]
        };
    }

    async extract() {
        return this.extractFromDocument(document, window.location.href);
    }

    async extractFromDocument(doc, url) {
        const isQuiz = url.includes('/mod/quiz/');
        const isWorkshop = url.includes('/mod/workshop/');
        const isAssign = url.includes('/mod/assign/');

        const result = {
            type: 'assignment',
            subtype: isQuiz ? 'quiz' : isWorkshop ? 'workshop' : 'assign',
            url: url,
            assignment_id: this._extractId(url),
            course_id: this._extractCourseId(doc, url),
            title: this._extractTitle(doc),
            due_date: this._extractDueDate(doc),
            status: this._extractSubmissionStatus(doc),
            grade: isQuiz ? this._extractQuizGrade(doc) : this._extractGrade(doc),
            feedback: this._extractFeedback(doc),
            submitted_files: this._extractSubmittedFiles(doc),
            extractedAt: new Date().toISOString()
        };

        // If teacher view, extract grading table
        if (this._isTeacherView(doc)) {
            result.is_teacher_view = true;
            result.students = this._extractGradingTable(doc);
        }

        return result;
    }

    _extractTitle(doc) {
        for (const sel of this.selectors.title) {
            const el = doc.querySelector(sel);
            if (el) {
                const text = el.textContent.trim();
                if (text) return text;
            }
        }
        return doc.title?.trim() || 'Unknown Assignment';
    }

    _extractId(url) {
        if (!url) return null;
        const match = url.match(/[?&]id=(\d+)/);
        return match ? match[1] : null;
    }

    _extractCourseId(doc, url) {
        // From breadcrumb
        const breadcrumb = doc.querySelector('.breadcrumb a[href*="course/view.php"]');
        if (breadcrumb) {
            const match = breadcrumb.href.match(/[?&]id=(\d+)/);
            if (match) return match[1];
        }

        // From URL params
        const courseParam = url.match(/[?&]course=(\d+)/);
        if (courseParam) return courseParam[1];

        // From hidden inputs
        const courseInput = doc.querySelector('input[name="course"], input[name="courseid"]');
        if (courseInput) return courseInput.value;

        return null;
    }

    _extractDueDate(doc) {
        // Method 1: Look in status table rows
        const tables = doc.querySelectorAll('table');
        for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            for (const row of rows) {
                const cells = row.querySelectorAll('td, th');
                for (let i = 0; i < cells.length - 1; i++) {
                    const label = cells[i].textContent.toLowerCase().trim();
                    if (label.includes('due date') || label.includes('تاريخ الاستحقاق') ||
                        label.includes('close') || label.includes('deadline')) {
                        const value = cells[i + 1]?.textContent?.trim();
                        if (value) return this._parseDate(value);
                    }
                }
            }
        }

        // Method 2: data-region or aria
        const dueDateEl = doc.querySelector('[data-region="duedate"], time[datetime]');
        if (dueDateEl) {
            return dueDateEl.getAttribute('datetime') || dueDateEl.textContent.trim();
        }

        return null;
    }

    _extractSubmissionStatus(doc) {
        // Direct status elements
        for (const sel of this.selectors.submissionStatus) {
            const el = doc.querySelector(sel);
            if (el) {
                const text = el.textContent.toLowerCase().trim();
                if (text.includes('submitted') || text.includes('مُقدَّم')) return 'submitted';
                if (text.includes('not submitted') || text.includes('لم يُقدَّم')) return 'not_submitted';
                if (text.includes('draft')) return 'draft';
                return text;
            }
        }

        // Check table cells
        const tables = doc.querySelectorAll('.submissionstatustable, .generaltable');
        for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            for (const row of rows) {
                const label = row.querySelector('td:first-child, th');
                const value = row.querySelector('td:last-child');
                if (label && value) {
                    const labelText = label.textContent.toLowerCase();
                    if (labelText.includes('submission status') || labelText.includes('حالة التسليم')) {
                        const valueText = value.textContent.trim().toLowerCase();
                        if (valueText.includes('submitted')) return 'submitted';
                        if (valueText.includes('not submitted')) return 'not_submitted';
                        return valueText;
                    }
                }
            }
        }

        return 'unknown';
    }

    _extractGrade(doc) {
        // Look in grading status area
        for (const sel of this.selectors.grade) {
            const el = doc.querySelector(sel);
            if (el) {
                const text = el.textContent.trim();
                const parsed = this._parseGrade(text);
                if (parsed) return parsed;
            }
        }

        // Look in table rows
        const tables = doc.querySelectorAll('table');
        for (const table of tables) {
            const rows = table.querySelectorAll('tr');
            for (const row of rows) {
                const cells = row.querySelectorAll('td, th');
                for (let i = 0; i < cells.length - 1; i++) {
                    const label = cells[i].textContent.toLowerCase().trim();
                    if (label.includes('grade') || label.includes('الدرجة') || label.includes('mark')) {
                        const text = cells[i + 1]?.textContent?.trim();
                        const parsed = this._parseGrade(text);
                        if (parsed) return parsed;
                    }
                }
            }
        }

        return null;
    }

    _extractQuizGrade(doc) {
        // Quiz-specific grade extraction
        for (const sel of this.selectors.quizGrade) {
            const el = doc.querySelector(sel);
            if (el) {
                const parsed = this._parseGrade(el.textContent.trim());
                if (parsed) return parsed;
            }
        }

        // Fallback to regular grade extraction
        return this._extractGrade(doc);
    }

    _parseGrade(text) {
        if (!text) return null;

        // Pattern: "18/20" or "18 / 20" or "18 out of 20"
        let match = text.match(/([\d.]+)\s*[/]\s*([\d.]+)/);
        if (match) {
            return { value: parseFloat(match[1]), max: parseFloat(match[2]) };
        }

        // Pattern: "90%" 
        match = text.match(/([\d.]+)\s*%/);
        if (match) {
            return { value: parseFloat(match[1]), max: 100 };
        }

        // Pattern: "18.5"
        match = text.match(/^([\d.]+)$/);
        if (match) {
            return { value: parseFloat(match[1]), max: null };
        }

        // No grade yet
        if (text.includes('-') || text.includes('Not graded') || text.includes('لم يُقيَّم')) {
            return null;
        }

        return null;
    }

    _parseDate(text) {
        if (!text) return null;
        try {
            const date = new Date(text);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch (e) { /* ignore */ }
        return text; // Return raw text if parsing fails
    }

    _extractFeedback(doc) {
        for (const sel of this.selectors.feedback) {
            const el = doc.querySelector(sel);
            if (el) {
                return el.textContent.trim() || null;
            }
        }
        return null;
    }

    _extractSubmittedFiles(doc) {
        const files = [];
        for (const sel of this.selectors.submittedFiles) {
            const links = doc.querySelectorAll(sel);
            links.forEach(link => {
                files.push({
                    name: link.textContent.trim(),
                    url: link.href
                });
            });
            if (files.length > 0) break;
        }
        return files;
    }

    _isTeacherView(doc) {
        // Check for grading table or teacher-only elements
        for (const sel of this.selectors.gradingTable) {
            if (doc.querySelector(sel)) return true;
        }
        // Check for grade action buttons
        if (doc.querySelector('[data-action="grade"]') ||
            doc.querySelector('.gradingtable')) {
            return true;
        }
        return false;
    }

    _extractGradingTable(doc) {
        const students = [];
        let table = null;

        for (const sel of this.selectors.gradingTable) {
            table = doc.querySelector(sel);
            if (table) break;
        }
        if (!table) return students;

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 3) return;

            // Try to extract student info
            const nameLink = row.querySelector('a[href*="user/view.php"], a[href*="user/profile.php"]');
            const statusCell = row.querySelector('.submissionstatussubmitted, .submissionstatusnotsubmitted, .c4, .c5');
            const gradeInput = row.querySelector('input[name*="grade"], .grade');

            if (nameLink) {
                const studentId = this._extractId(nameLink.href);
                students.push({
                    student_id: studentId,
                    name: nameLink.textContent.trim(),
                    status: statusCell?.textContent?.trim() || 'unknown',
                    grade: gradeInput?.value || gradeInput?.textContent?.trim() || null
                });
            }
        });

        return students;
    }
}

// Export
window.MoodleAssignmentStrategy = MoodleAssignmentStrategy;
