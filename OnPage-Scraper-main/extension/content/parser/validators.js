/**
 * Data Validators
 * التحقق من صحة البيانات المستخرجة قبل الإرسال
 * 
 * Phase 4: Data Normalization Layer - Validation
 */

class DataValidators {
    
    /**
     * التحقق من البيانات الموحدة بالكامل
     */
    static validateNormalizedData(data) {
        const errors = [];

        if (!data) {
            return { valid: false, errors: ['Data is null or undefined'] };
        }

        // User ID is optional but warn if missing
        if (!data.user_id) {
            errors.push({ level: 'warning', field: 'user_id', message: 'User ID is missing' });
        }

        // Validate courses
        if (data.courses && Array.isArray(data.courses)) {
            data.courses.forEach((course, i) => {
                const courseErrors = this.validateCourse(course);
                courseErrors.forEach(e => {
                    errors.push({ ...e, path: `courses[${i}]` });
                });
            });
        }

        // Validate assignments
        if (data.assignments && Array.isArray(data.assignments)) {
            data.assignments.forEach((assignment, i) => {
                const aErrors = this.validateAssignment(assignment);
                aErrors.forEach(e => {
                    errors.push({ ...e, path: `assignments[${i}]` });
                });
            });
        }

        // Validate grades
        if (data.grades && Array.isArray(data.grades)) {
            data.grades.forEach((grade, i) => {
                const gErrors = this.validateGrade(grade);
                gErrors.forEach(e => {
                    errors.push({ ...e, path: `grades[${i}]` });
                });
            });
        }

        // Validate synced_at
        if (data.synced_at && !this._isValidDate(data.synced_at)) {
            errors.push({ level: 'error', field: 'synced_at', message: 'Invalid timestamp format' });
        }

        const hasErrors = errors.some(e => e.level === 'error');
        return {
            valid: !hasErrors,
            errors: errors,
            warnings: errors.filter(e => e.level === 'warning'),
            criticalErrors: errors.filter(e => e.level === 'error')
        };
    }

    /**
     * التحقق من صحة بيانات دورة
     */
    static validateCourse(course) {
        const errors = [];

        if (!course.course_id) {
            errors.push({ level: 'error', field: 'course_id', message: 'Course ID is required' });
        }
        if (!course.title || course.title.trim().length === 0) {
            errors.push({ level: 'warning', field: 'title', message: 'Course title is empty' });
        }
        if (course.teachers && !Array.isArray(course.teachers)) {
            errors.push({ level: 'error', field: 'teachers', message: 'Teachers must be an array' });
        }

        return errors;
    }

    /**
     * التحقق من صحة بيانات مهمة
     */
    static validateAssignment(assignment) {
        const errors = [];

        if (!assignment.assignment_id) {
            errors.push({ level: 'error', field: 'assignment_id', message: 'Assignment ID is required' });
        }
        if (!assignment.course_id) {
            errors.push({ level: 'warning', field: 'course_id', message: 'Course ID is missing for assignment' });
        }
        if (!assignment.title || assignment.title.trim().length === 0) {
            errors.push({ level: 'warning', field: 'title', message: 'Assignment title is empty' });
        }
        if (assignment.due_date && !this._isValidDate(assignment.due_date)) {
            errors.push({ level: 'warning', field: 'due_date', message: 'Invalid due date format' });
        }
        if (assignment.grade) {
            if (typeof assignment.grade.value !== 'number') {
                errors.push({ level: 'warning', field: 'grade.value', message: 'Grade value should be a number' });
            }
            if (assignment.grade.max !== null && typeof assignment.grade.max !== 'number') {
                errors.push({ level: 'warning', field: 'grade.max', message: 'Grade max should be a number' });
            }
        }

        const validStatuses = ['submitted', 'not_submitted', 'draft', 'graded', 'unknown'];
        if (assignment.status && !validStatuses.includes(assignment.status)) {
            errors.push({ level: 'warning', field: 'status', message: `Unknown status: ${assignment.status}` });
        }

        return errors;
    }

    /**
     * التحقق من صحة بيانات درجة
     */
    static validateGrade(grade) {
        const errors = [];

        if (!grade.course_id) {
            errors.push({ level: 'warning', field: 'course_id', message: 'Course ID is missing for grade' });
        }
        if (!grade.item_name || grade.item_name.trim().length === 0) {
            errors.push({ level: 'warning', field: 'item_name', message: 'Grade item name is empty' });
        }
        if (grade.grade) {
            if (typeof grade.grade.value !== 'number' || isNaN(grade.grade.value)) {
                errors.push({ level: 'error', field: 'grade.value', message: 'Grade value must be a valid number' });
            }
            if (grade.grade.max !== null && (typeof grade.grade.max !== 'number' || isNaN(grade.grade.max))) {
                errors.push({ level: 'warning', field: 'grade.max', message: 'Grade max should be a valid number' });
            }
            if (grade.grade.value > grade.grade.max && grade.grade.max !== null) {
                errors.push({ level: 'warning', field: 'grade', message: 'Grade value exceeds max value' });
            }
        }

        return errors;
    }

    /**
     * التحقق من صحة URL
     */
    static isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * التحقق من صحة تاريخ
     */
    static _isValidDate(dateStr) {
        if (!dateStr) return false;
        try {
            const date = new Date(dateStr);
            return !isNaN(date.getTime());
        } catch {
            return false;
        }
    }

    /**
     * تنظيف البيانات غير الصالحة (إزالة الحقول الفارغة/null)
     */
    static sanitize(data) {
        if (!data) return data;

        const sanitized = JSON.parse(JSON.stringify(data));

        // Remove assignments without IDs
        if (sanitized.assignments) {
            sanitized.assignments = sanitized.assignments.filter(a => a.assignment_id);
        }

        // Remove courses without IDs
        if (sanitized.courses) {
            sanitized.courses = sanitized.courses.filter(c => c.course_id);
        }

        // Remove grades without item names
        if (sanitized.grades) {
            sanitized.grades = sanitized.grades.filter(g => g.item_name);
        }

        return sanitized;
    }
}

// Export
window.DataValidators = DataValidators;
