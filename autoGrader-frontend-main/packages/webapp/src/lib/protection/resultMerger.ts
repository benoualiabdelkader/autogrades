/**
 * Result Merger & Data Reconstruction
 * دمج نتائج AI مع بيانات الطالب الأصلية
 */

export interface AIAnalysisResult {
  student_id?: string;
  analysis?: string;
  recommendations?: string[];
  insights?: any;
  score?: number;
  [key: string]: any;
}

export interface OriginalStudentData {
  id?: string | number;
  student_id?: string | number;
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

export interface MergedResult {
  /** معرف الطالب - Student ID */
  student_id?: string | number;

  /** البيانات الشخصية - Personal info */
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
  };

  /** نتائج التحليل - Analysis results */
  analysis?: {
    content?: string;
    insights?: any;
    score?: number;
    [key: string]: any;
  };

  /** التوصيات - Recommendations */
  recommendations?: string[];

  /** تاريخ التحليل - Analysis timestamp */
  analysisDate?: string;

  /** بيانات إضافية - Additional data */
  [key: string]: any;
}

/**
 * دمج النتائج - Result Merger
 */
export class ResultMerger {
  private studentDataMap: Map<string | number, OriginalStudentData> = new Map();

  /**
   * تسجيل بيانات الطالب الأصلية - Register original student data
   */
  registerStudentData(data: OriginalStudentData | OriginalStudentData[]): void {
    if (Array.isArray(data)) {
      data.forEach((student) => this.registerSingleStudent(student));
    } else {
      this.registerSingleStudent(data);
    }
  }

  /**
   * تسجيل طالب واحد - Register single student
   */
  private registerSingleStudent(student: OriginalStudentData): void {
    const key = student.student_id || student.id;
    if (key) {
      this.studentDataMap.set(key, student);
    }
  }

  /**
   * دمج نتيجة AI مع بيانات الطالب - Merge AI result with student data
   */
  mergeResult(aiResult: AIAnalysisResult): MergedResult {
    const studentId = aiResult.student_id;
    const originalData = studentId ? this.studentDataMap.get(studentId) : null;

    const merged: MergedResult = {
      student_id: studentId,
      analysisDate: new Date().toISOString(),
    };

    // إضافة البيانات الشخصية
    if (originalData) {
      merged.personalInfo = {
        name: originalData.name,
        email: originalData.email,
        phone: originalData.phone,
        ...this.extractPersonalInfo(originalData),
      };
    }

    // إضافة نتائج التحليل
    merged.analysis = {
      content: aiResult.analysis,
      insights: aiResult.insights,
      score: aiResult.score,
      ...this.extractAnalysisData(aiResult),
    };

    // إضافة التوصيات
    if (aiResult.recommendations && Array.isArray(aiResult.recommendations)) {
      merged.recommendations = aiResult.recommendations;
    }

    // إضافة أي بيانات إضافية من النتيجة الأصلية
    for (const [key, value] of Object.entries(aiResult)) {
      if (
        ![
          'student_id',
          'analysis',
          'recommendations',
          'insights',
          'score',
        ].includes(key)
      ) {
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * دمج مجموعة من النتائج - Merge array of AI results
   */
  mergeResults(aiResults: AIAnalysisResult[]): MergedResult[] {
    return aiResults.map((result) => this.mergeResult(result));
  }

  /**
   * استخراج بيانات شخصية من الكائن - Extract personal info from object
   */
  private extractPersonalInfo(data: OriginalStudentData): Record<string, any> {
    const personalFields = [
      'address',
      'city',
      'country',
      'dateOfBirth',
      'nationality',
      'guardian',
      'parentName',
    ];

    const personal: Record<string, any> = {};
    for (const field of personalFields) {
      if (field in data) {
        personal[field] = data[field];
      }
    }
    return personal;
  }

  /**
   * استخراج بيانات التحليل - Extract analysis data from object
   */
  private extractAnalysisData(data: AIAnalysisResult): Record<string, any> {
    const analysisFields = [
      'strengths',
      'weaknesses',
      'trends',
      'predictions',
      'patterns',
      'summary',
    ];

    const analysis: Record<string, any> = {};
    for (const field of analysisFields) {
      if (field in data) {
        analysis[field] = data[field];
      }
    }
    return analysis;
  }

  /**
   * دمج مقدم الطالب بالنتائج - Merge with preconfigured student data
   */
  mergeWithPresets(
    aiResults: AIAnalysisResult[],
    studentDataMap: Map<string | number, OriginalStudentData>
  ): MergedResult[] {
    this.studentDataMap = studentDataMap;
    return this.mergeResults(aiResults);
  }

  /**
   * تحديث بيانات الطالب - Update student data
   */
  updateStudentData(id: string | number, data: Partial<OriginalStudentData>): void {
    const existing = this.studentDataMap.get(id);
    if (existing) {
      this.studentDataMap.set(id, { ...existing, ...data });
    } else {
      this.studentDataMap.set(id, { ...data, student_id: id } as OriginalStudentData);
    }
  }

  /**
   * مسح جميع البيانات المسجلة - Clear all registered data
   */
  clearData(): void {
    this.studentDataMap.clear();
  }

  /**
   * الحصول على عدد الطلاب المسجلين - Get registered student count
   */
  getStudentCount(): number {
    return this.studentDataMap.size;
  }

  /**
   * التحقق من تسجيل طالب - Check if student is registered
   */
  hasStudent(id: string | number): boolean {
    return this.studentDataMap.has(id);
  }

  /**
   * إرجاع بيانات الطالب الأصلية - Get original student data
   */
  getStudentData(id: string | number): OriginalStudentData | undefined {
    return this.studentDataMap.get(id);
  }

  /**
   * إرجاع جميع بيانات الطلاب - Get all student data
   */
  getAllStudentData(): Map<string | number, OriginalStudentData> {
    return new Map(this.studentDataMap);
  }

  /**
   * إنشاء خريطة البيانات من مصفوفة - Create data map from array
   */
  static createMapFromArray(
    students: OriginalStudentData[]
  ): Map<string | number, OriginalStudentData> {
    const map = new Map<string | number, OriginalStudentData>();
    for (const student of students) {
      const key = student.student_id || student.id;
      if (key) {
        map.set(key, student);
      }
    }
    return map;
  }
}

/**
 * دالة مساعدة لدمج سريع - Helper function for quick merge
 */
export function quickMerge(
  aiResult: AIAnalysisResult,
  studentData: OriginalStudentData
): MergedResult {
  const merger = new ResultMerger();
  merger.registerStudentData(studentData);
  return merger.mergeResult(aiResult);
}

/**
 * دالة مساعدة لدمج مجموعة - Helper function for batch merge
 */
export function batchMerge(
  aiResults: AIAnalysisResult[],
  studentDataMap: Map<string | number, OriginalStudentData>
): MergedResult[] {
  const merger = new ResultMerger();
  return merger.mergeWithPresets(aiResults, studentDataMap);
}
