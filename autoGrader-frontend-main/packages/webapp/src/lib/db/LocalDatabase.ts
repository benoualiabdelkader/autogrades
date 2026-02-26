/**
 * Local Database Manager
 * قاعدة بيانات محلية بسيطة باستخدام localStorage
 */

export interface Student {
    id: string;
    name: string;
    email: string;
    class: string;
}

export interface Assignment {
    id: string;
    studentId: string;
    title: string;
    content: string;
    submittedAt: string;
    graded: boolean;
    grade?: number;
    feedback?: string;
}

export class LocalDatabase {
    private static STUDENTS_KEY = 'local_students';
    private static ASSIGNMENTS_KEY = 'local_assignments';
    private static GRADING_RULES_KEY = 'grading_rules';

    /**
     * تهيئة قاعدة البيانات بالبيانات التجريبية
     */
    static initializeDemo(): void {
        if (!this.getStudents().length) {
            const demoStudents: Student[] = [
                { id: 'S001', name: 'أحمد محمد', email: 'ahmed@example.com', class: 'الصف الثالث' },
                { id: 'S002', name: 'سارة علي', email: 'sara@example.com', class: 'الصف الثالث' },
                { id: 'S003', name: 'محمد حسن', email: 'mohamed@example.com', class: 'الصف الثالث' },
                { id: 'S004', name: 'فاطمة أحمد', email: 'fatima@example.com', class: 'الصف الثالث' },
                { id: 'S005', name: 'عمر خالد', email: 'omar@example.com', class: 'الصف الثالث' }
            ];
            this.saveStudents(demoStudents);
        }

        if (!this.getAssignments().length) {
            const demoAssignments: Assignment[] = [
                {
                    id: 'A001',
                    studentId: 'S001',
                    title: 'واجب الفوتوسينثيسيس',
                    content: 'الفوتوسينثيسيس هي عملية حيوية تحدث في النباتات الخضراء، حيث تقوم النباتات بتحويل الطاقة الضوئية من الشمس إلى طاقة كيميائية مخزنة في جزيئات الجلوكوز. تتم هذه العملية في البلاستيدات الخضراء وتحتاج إلى ثاني أكسيد الكربون والماء، وينتج عنها الأكسجين كمنتج ثانوي.',
                    submittedAt: new Date().toISOString(),
                    graded: false
                },
                {
                    id: 'A002',
                    studentId: 'S002',
                    title: 'واجب الفوتوسينثيسيس',
                    content: 'النباتات تصنع غذائها بنفسها من خلال عملية اسمها الفوتوسينثيسيس. تحتاج النباتات للضوء والماء وثاني أكسيد الكربون.',
                    submittedAt: new Date().toISOString(),
                    graded: false
                },
                {
                    id: 'A003',
                    studentId: 'S003',
                    title: 'واجب الفوتوسينثيسيس',
                    content: 'الفوتوسينثيسيس عملية معقدة تشمل مرحلتين رئيسيتين: التفاعلات الضوئية والتفاعلات اللاضوئية. في المرحلة الأولى، يتم امتصاص الضوء بواسطة الكلوروفيل وتحويله إلى ATP وNADPH.',
                    submittedAt: new Date().toISOString(),
                    graded: false
                },
                {
                    id: 'A004',
                    studentId: 'S004',
                    title: 'واجب الفوتوسينثيسيس',
                    content: 'النباتات خضراء وتحتاج للشمس.',
                    submittedAt: new Date().toISOString(),
                    graded: false
                },
                {
                    id: 'A005',
                    studentId: 'S005',
                    title: 'واجب الفوتوسينثيسيس',
                    content: 'عملية البناء الضوئي تحدث في أوراق النباتات حيث يوجد الكلوروفيل الذي يمتص الضوء. المعادلة الكيميائية للعملية هي: 6CO2 + 6H2O + طاقة ضوئية → C6H12O6 + 6O2.',
                    submittedAt: new Date().toISOString(),
                    graded: false
                }
            ];
            this.saveAssignments(demoAssignments);
        }

        // قواعد التقييم الافتراضية
        if (!this.getGradingRules()) {
            this.saveGradingRules('الدقة العلمية، الوضوح في التعبير، الأمثلة والتفاصيل، التنظيم المنطقي');
        }
    }

    /**
     * الطلاب
     */
    static getStudents(): Student[] {
        const data = localStorage.getItem(this.STUDENTS_KEY);
        return data ? JSON.parse(data) : [];
    }

    static saveStudents(students: Student[]): void {
        localStorage.setItem(this.STUDENTS_KEY, JSON.stringify(students));
    }

    static getStudent(id: string): Student | undefined {
        return this.getStudents().find(s => s.id === id);
    }

    /**
     * الواجبات
     */
    static getAssignments(): Assignment[] {
        const data = localStorage.getItem(this.ASSIGNMENTS_KEY);
        return data ? JSON.parse(data) : [];
    }

    static saveAssignments(assignments: Assignment[]): void {
        localStorage.setItem(this.ASSIGNMENTS_KEY, JSON.stringify(assignments));
    }

    static getAssignment(id: string): Assignment | undefined {
        return this.getAssignments().find(a => a.id === id);
    }

    static getStudentAssignments(studentId: string): Assignment[] {
        return this.getAssignments().filter(a => a.studentId === studentId);
    }

    static getUngradedAssignments(): Assignment[] {
        return this.getAssignments().filter(a => !a.graded);
    }

    static updateAssignment(id: string, updates: Partial<Assignment>): void {
        const assignments = this.getAssignments();
        const index = assignments.findIndex(a => a.id === id);
        if (index !== -1) {
            assignments[index] = { ...assignments[index], ...updates };
            this.saveAssignments(assignments);
        }
    }

    /**
     * قواعد التقييم
     */
    static getGradingRules(): string {
        return localStorage.getItem(this.GRADING_RULES_KEY) || '';
    }

    static saveGradingRules(rules: string): void {
        localStorage.setItem(this.GRADING_RULES_KEY, rules);
    }

    /**
     * إحصائيات
     */
    static getStats() {
        const students = this.getStudents();
        const assignments = this.getAssignments();
        const graded = assignments.filter(a => a.graded);
        const ungraded = assignments.filter(a => !a.graded);

        const grades = graded.map(a => a.grade || 0);
        const averageGrade = grades.length > 0
            ? grades.reduce((a, b) => a + b, 0) / grades.length
            : 0;

        return {
            totalStudents: students.length,
            totalAssignments: assignments.length,
            gradedAssignments: graded.length,
            ungradedAssignments: ungraded.length,
            averageGrade: Math.round(averageGrade)
        };
    }

    /**
     * مسح البيانات
     */
    static clearAll(): void {
        localStorage.removeItem(this.STUDENTS_KEY);
        localStorage.removeItem(this.ASSIGNMENTS_KEY);
        localStorage.removeItem(this.GRADING_RULES_KEY);
    }
}
