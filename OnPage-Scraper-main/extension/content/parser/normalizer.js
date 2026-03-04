/**
 * Data Normalizer
 * تحويل البيانات المستخرجة من كل strategy إلى JSON Schema موحد
 * 
 * Phase 4: Data Normalization Layer
 * 
 * Output Schema:
 * {
 *   "user_id": "123",
 *   "courses": [{ "course_id", "title", "teachers", "url" }],
 *   "assignments": [{ "assignment_id", "course_id", "title", "due_date", "status", "grade": { "value", "max" } }],
 *   "grades": [{ "course_id", "item_name", "grade": { "value", "max" }, "percentage" }],
 *   "synced_at": "ISO timestamp"
 * }
 */

class DataNormalizer {
    constructor() {
        this._store = {
            user_id: null,
            courses: [],
            assignments: [],
            grades: [],
            timeline: [],
            synced_at: null
        };
    }

    /**
     * دمج نتيجة route (من Router) في المخزن الموحد
     */
    merge(routeResult) {
        if (!routeResult || !routeResult.success || !routeResult.data) return;

        const data = routeResult.data;

        switch (data.type) {
            case 'dashboard':
                this._mergeDashboard(data);
                break;
            case 'course':
                this._mergeCourse(data);
                break;
            case 'assignment':
                this._mergeAssignment(data);
                break;
            case 'grades':
                this._mergeGrades(data);
                break;
        }

        this._store.synced_at = new Date().toISOString();
    }

    /**
     * دمج بيانات Dashboard
     */
    _mergeDashboard(data) {
        // Update user
        if (data.user?.id) {
            this._store.user_id = data.user.id;
        }

        // Merge courses
        if (data.courses) {
            data.courses.forEach(course => {
                this._upsertCourse({
                    course_id: course.course_id,
                    title: this._clean(course.title),
                    teachers: (course.teachers || []).map(t => this._clean(t)),
                    url: course.url || null
                });
            });
        }

        // Merge timeline events
        if (data.timeline) {
            data.timeline.forEach(event => {
                this._store.timeline.push({
                    title: this._clean(event.title),
                    url: event.url || null,
                    date: this._normalizeDate(event.date),
                    course: this._clean(event.course)
                });
            });
            // Deduplicate timeline
            this._store.timeline = this._deduplicateBy(this._store.timeline, 'title', 'date');
        }
    }

    /**
     * دمج بيانات Course
     */
    _mergeCourse(data) {
        // Update course info
        this._upsertCourse({
            course_id: data.course_id,
            title: this._clean(data.title),
            teachers: [],
            url: data.url || null
        });

        // Convert activities to assignments
        if (data.assignments) {
            data.assignments.forEach(a => {
                this._upsertAssignment({
                    assignment_id: a.activity_id,
                    course_id: data.course_id,
                    title: this._clean(a.title),
                    url: a.url || null,
                    type: a.type || 'assign',
                    due_date: null,
                    status: a.completion === 'completed' ? 'submitted' : 'not_submitted',
                    grade: null
                });
            });
        }

        if (data.quizzes) {
            data.quizzes.forEach(q => {
                this._upsertAssignment({
                    assignment_id: q.activity_id,
                    course_id: data.course_id,
                    title: this._clean(q.title),
                    url: q.url || null,
                    type: 'quiz',
                    due_date: null,
                    status: q.completion === 'completed' ? 'submitted' : 'not_submitted',
                    grade: null
                });
            });
        }
    }

    /**
     * دمج بيانات Assignment
     */
    _mergeAssignment(data) {
        this._upsertAssignment({
            assignment_id: data.assignment_id,
            course_id: data.course_id,
            title: this._clean(data.title),
            url: data.url || null,
            type: data.subtype || 'assign',
            due_date: this._normalizeDate(data.due_date),
            status: data.status || 'unknown',
            grade: data.grade ? {
                value: data.grade.value,
                max: data.grade.max
            } : null,
            feedback: data.feedback || null,
            submitted_files: data.submitted_files || []
        });
    }

    /**
     * دمج بيانات Grades
     */
    _mergeGrades(data) {
        const courseId = data.course_id;

        if (data.student) {
            data.student.forEach(item => {
                if (item.is_course_total) {
                    // Update course total
                    const course = this._store.courses.find(c => c.course_id === courseId);
                    if (course) {
                        course.total_grade = item.grade;
                    }
                } else {
                    this._upsertGrade({
                        course_id: courseId,
                        item_name: this._clean(item.item_name),
                        grade: item.grade ? {
                            value: item.grade.value,
                            max: item.grade.max
                        } : null,
                        percentage: item.percentage || null,
                        feedback: item.feedback || null
                    });
                }
            });
        }
    }

    /**
     * إضافة أو تحديث دورة
     */
    _upsertCourse(course) {
        const idx = this._store.courses.findIndex(c => c.course_id === course.course_id);
        if (idx >= 0) {
            // Merge: keep existing data, update with new
            const existing = this._store.courses[idx];
            this._store.courses[idx] = {
                ...existing,
                ...course,
                teachers: course.teachers.length > 0 ? course.teachers : existing.teachers
            };
        } else {
            this._store.courses.push(course);
        }
    }

    /**
     * إضافة أو تحديث مهمة
     */
    _upsertAssignment(assignment) {
        const idx = this._store.assignments.findIndex(
            a => a.assignment_id === assignment.assignment_id
        );
        if (idx >= 0) {
            const existing = this._store.assignments[idx];
            this._store.assignments[idx] = {
                ...existing,
                ...assignment,
                grade: assignment.grade || existing.grade,
                due_date: assignment.due_date || existing.due_date
            };
        } else {
            this._store.assignments.push(assignment);
        }
    }

    /**
     * إضافة أو تحديث درجة
     */
    _upsertGrade(grade) {
        const idx = this._store.grades.findIndex(
            g => g.course_id === grade.course_id && g.item_name === grade.item_name
        );
        if (idx >= 0) {
            this._store.grades[idx] = { ...this._store.grades[idx], ...grade };
        } else {
            this._store.grades.push(grade);
        }
    }

    /**
     * الحصول على البيانات الموحدة
     */
    getNormalized() {
        return JSON.parse(JSON.stringify(this._store));
    }

    /**
     * تنظيف نص
     */
    _clean(text) {
        if (!text) return null;
        return text.replace(/\s+/g, ' ').trim() || null;
    }

    /**
     * تطبيع التاريخ إلى ISO format
     */
    _normalizeDate(dateStr) {
        if (!dateStr) return null;
        // Already ISO
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;

        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) return date.toISOString();
        } catch (e) { /* ignore */ }

        return dateStr; // Return as-is
    }

    /**
     * إزالة التكرارات من مصفوفة بناءً على مفاتيح
     */
    _deduplicateBy(arr, ...keys) {
        const seen = new Set();
        return arr.filter(item => {
            const key = keys.map(k => item[k]).join('|');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /**
     * إعادة ضبط المخزن
     */
    reset() {
        this._store = {
            user_id: null,
            courses: [],
            assignments: [],
            grades: [],
            timeline: [],
            synced_at: null
        };
    }

    /**
     * تحميل من التخزين المحلي
     */
    async loadFromStorage() {
        return new Promise(resolve => {
            chrome.storage.local.get(['moodle_normalized_data'], result => {
                if (result.moodle_normalized_data) {
                    this._store = result.moodle_normalized_data;
                }
                resolve(this._store);
            });
        });
    }

    /**
     * حفظ في التخزين المحلي
     */
    async saveToStorage() {
        return new Promise(resolve => {
            chrome.storage.local.set({
                'moodle_normalized_data': this._store
            }, resolve);
        });
    }
}

// Export
window.DataNormalizer = DataNormalizer;
