/**
 * Moodle Grades Strategy
 * استخراج بيانات صفحات الدرجات: جدول الدرجات، الملخص
 * 
 * Phase 1: Dedicated strategy for grade pages
 * Phase 3: Multi-selector fallback, version-aware
 */

class MoodleGradesStrategy {
    constructor(moodleVersion) {
        this.version = moodleVersion;
        this.selectors = this._getSelectors();
    }

    _getSelectors() {
        return {
            // Grade overview table
            gradeTable: [
                '.user-grade',
                'table.generaltable',
                '#user-grade',
                '[data-region="grade-table"]',
                '.grade-report-overview table',
                '.gradetreebox table',
                '#grade-report-overview table'
            ],
            // Individual grade items
            gradeRows: [
                '.user-grade tbody tr',
                'table.generaltable tbody tr',
                '.gradeitemheader',
                '[data-region="grade-item"]'
            ],
            // Course total
            courseTotal: [
                '.course-total',
                'tr.lastrow td.column-grade',
                '.course_total .grade',
                '[data-itemtype="course"]'
            ],
            // Category headers
            categoryHeaders: [
                '.category',
                'tr.category td',
                '[data-itemtype="category"]',
                '.categoryitem'
            ],
            // Grade item name
            itemName: [
                '.gradeitemheader a',
                'th.column-itemname a',
                'td.column-itemname a',
                '.gradeitemheader span',
                'th.column-itemname span'
            ],
            // Grade value
            gradeValue: [
                'td.column-grade',
                '.gradevalue',
                'td.grade',
                '[data-col="grade"]'
            ],
            // Percentage
            percentage: [
                'td.column-percentage',
                '.percentage',
                '[data-col="percentage"]'
            ],
            // Range
            range: [
                'td.column-range',
                '.range',
                '[data-col="range"]'
            ],
            // Feedback
            feedback: [
                'td.column-feedback',
                '.feedback',
                '[data-col="feedback"]'
            ],
            // Student name (for teacher view)
            studentName: [
                '.username a',
                'a[href*="user/view.php"]',
                '.userpicture + a'
            ]
        };
    }

    async extract() {
        return this.extractFromDocument(document, window.location.href);
    }

    async extractFromDocument(doc, url) {
        const isTeacherView = this._isTeacherView(doc, url);

        return {
            type: 'grades',
            url: url,
            course_id: this._extractCourseId(url, doc),
            is_teacher_view: isTeacherView,
            student: isTeacherView ? null : this._extractStudentGrades(doc),
            students: isTeacherView ? this._extractAllStudentGrades(doc) : null,
            course_total: this._extractCourseTotal(doc),
            extractedAt: new Date().toISOString()
        };
    }

    /**
     * استخراج درجات طالب واحد (student view)
     */
    _extractStudentGrades(doc) {
        const grades = [];

        // Find the main grade table
        let table = null;
        for (const sel of this.selectors.gradeTable) {
            table = doc.querySelector(sel);
            if (table) break;
        }

        if (!table) {
            // Fallback: try to find any table with grade data
            const tables = doc.querySelectorAll('table');
            for (const t of tables) {
                if (t.textContent.includes('Grade') || t.textContent.includes('درجة')) {
                    table = t;
                    break;
                }
            }
        }

        if (!table) return grades;

        // Parse table headers to understand column layout
        const headers = this._parseTableHeaders(table);

        // Parse rows
        const rows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
        rows.forEach(row => {
            const grade = this._parseGradeRow(row, headers);
            if (grade && grade.item_name) {
                grades.push(grade);
            }
        });

        return grades;
    }

    /**
     * تحليل رؤوس الجدول
     */
    _parseTableHeaders(table) {
        const headers = {};
        const headerRow = table.querySelector('thead tr, tr:first-child');

        if (headerRow) {
            const cells = headerRow.querySelectorAll('th, td');
            cells.forEach((cell, index) => {
                const text = cell.textContent.toLowerCase().trim();
                const className = cell.className?.toLowerCase() || '';

                if (text.includes('item') || text.includes('grade item') || 
                    className.includes('itemname') || text.includes('عنصر')) {
                    headers.itemName = index;
                }
                if ((text.includes('grade') && !text.includes('item')) ||
                    className.includes('column-grade') || text.includes('درجة')) {
                    headers.grade = index;
                }
                if (text.includes('percentage') || text.includes('%') || 
                    className.includes('percentage') || text.includes('نسبة')) {
                    headers.percentage = index;
                }
                if (text.includes('range') || className.includes('range') || text.includes('نطاق')) {
                    headers.range = index;
                }
                if (text.includes('feedback') || className.includes('feedback') || text.includes('تعليق')) {
                    headers.feedback = index;
                }
                if (text.includes('weight') || text.includes('وزن')) {
                    headers.weight = index;
                }
            });
        }

        return headers;
    }

    /**
     * تحليل صف درجة
     */
    _parseGradeRow(row, headers) {
        const cells = row.querySelectorAll('td, th');
        if (cells.length < 2) return null;

        // Skip category rows
        if (row.classList.contains('category') || row.classList.contains('header')) {
            return null;
        }

        // Extract item name
        let itemName = null;
        if (headers.itemName !== undefined && cells[headers.itemName]) {
            const nameEl = cells[headers.itemName].querySelector('a') || cells[headers.itemName];
            itemName = nameEl.textContent.trim();
        } else {
            // Fallback: first cell with a link or meaningful text
            for (const cell of cells) {
                const link = cell.querySelector('a');
                if (link && link.href && !link.href.includes('#')) {
                    itemName = link.textContent.trim();
                    break;
                }
            }
            if (!itemName && cells[0]) {
                itemName = cells[0].textContent.trim();
            }
        }

        if (!itemName || itemName === '-' || itemName.length === 0) return null;

        // Extract grade value
        let gradeValue = null;
        if (headers.grade !== undefined && cells[headers.grade]) {
            gradeValue = this._parseGradeText(cells[headers.grade].textContent.trim());
        } else {
            // Try selectors
            for (const sel of this.selectors.gradeValue) {
                const el = row.querySelector(sel);
                if (el) {
                    gradeValue = this._parseGradeText(el.textContent.trim());
                    break;
                }
            }
        }

        // Extract percentage
        let percentage = null;
        if (headers.percentage !== undefined && cells[headers.percentage]) {
            percentage = cells[headers.percentage].textContent.trim();
        }

        // Extract range
        let range = null;
        if (headers.range !== undefined && cells[headers.range]) {
            range = cells[headers.range].textContent.trim();
        }

        // Extract feedback
        let feedback = null;
        if (headers.feedback !== undefined && cells[headers.feedback]) {
            feedback = cells[headers.feedback].textContent.trim();
        }

        // Detect if this is a course total
        const isCourseTotal = row.classList.contains('lastrow') || 
                              itemName.toLowerCase().includes('course total') ||
                              itemName.includes('المجموع');

        return {
            item_name: itemName,
            grade: gradeValue,
            percentage: percentage || null,
            range: range || null,
            feedback: feedback || null,
            is_course_total: isCourseTotal
        };
    }

    /**
     * تحليل نص الدرجة إلى قيم رقمية
     */
    _parseGradeText(text) {
        if (!text || text === '-' || text === '–') return null;

        // "18.5 / 20" or "18.5/20"
        let match = text.match(/([\d.]+)\s*[/–-]\s*([\d.]+)/);
        if (match) {
            return { value: parseFloat(match[1]), max: parseFloat(match[2]) };
        }

        // "85.5%"
        match = text.match(/([\d.]+)\s*%/);
        if (match) {
            return { value: parseFloat(match[1]), max: 100 };
        }

        // Plain number
        match = text.match(/^([\d.]+)$/);
        if (match) {
            return { value: parseFloat(match[1]), max: null };
        }

        return null;
    }

    /**
     * استخراج مجموع الدورة
     */
    _extractCourseTotal(doc) {
        for (const sel of this.selectors.courseTotal) {
            const el = doc.querySelector(sel);
            if (el) {
                return this._parseGradeText(el.textContent.trim());
            }
        }

        // Try last row of grade table
        let table = null;
        for (const sel of this.selectors.gradeTable) {
            table = doc.querySelector(sel);
            if (table) break;
        }
        if (table) {
            const lastRow = table.querySelector('tbody tr:last-child, tr.lastrow');
            if (lastRow) {
                const gradeCell = lastRow.querySelector('td.column-grade, td:nth-child(2)');
                if (gradeCell) {
                    return this._parseGradeText(gradeCell.textContent.trim());
                }
            }
        }

        return null;
    }

    /**
     * استخراج درجات كل الطلاب (teacher view)
     */
    _extractAllStudentGrades(doc) {
        const students = [];
        const table = doc.querySelector('.gradestable, .gradetreebox table, #user-grades');
        if (!table) return students;

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const nameLink = row.querySelector('a[href*="user/view.php"]');
            if (!nameLink) return;

            const studentId = this._extractUserId(nameLink.href);
            const gradeCells = row.querySelectorAll('td.grade, td.column-grade');
            const grades = [];

            gradeCells.forEach(cell => {
                const parsed = this._parseGradeText(cell.textContent.trim());
                if (parsed) grades.push(parsed);
            });

            students.push({
                student_id: studentId,
                name: nameLink.textContent.trim(),
                grades: grades
            });
        });

        return students;
    }

    _isTeacherView(doc, url) {
        // URL check
        if (url.includes('grader/index.php') || url.includes('grade/report/grader')) {
            return true;
        }
        // Element check
        if (doc.querySelector('.gradestable .username a[href*="user"]')) {
            return true;
        }
        return false;
    }

    _extractCourseId(url, doc) {
        if (url) {
            const match = url.match(/[?&](?:id|courseid)=(\d+)/);
            if (match) return match[1];
        }
        // From breadcrumb
        const breadcrumb = doc?.querySelector('.breadcrumb a[href*="course/view.php"]');
        if (breadcrumb) {
            const match = breadcrumb.href.match(/[?&]id=(\d+)/);
            if (match) return match[1];
        }
        return null;
    }

    _extractUserId(url) {
        if (!url) return null;
        const match = url.match(/[?&]id=(\d+)/);
        return match ? match[1] : null;
    }
}

// Export
window.MoodleGradesStrategy = MoodleGradesStrategy;
