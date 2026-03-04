/**
 * Data Protection System - Usage Examples
 * أمثلة عملية - استخدام نظام حماية البيانات
 */

import {
  SensitiveDataDetector,
  DataFilter,
  ResultMerger,
  DataProtectionPipeline,
  createSecurePipeline,
  StudentData,
  OriginalStudentData,
  AIAnalysisResult,
} from './index';

/**
 * مثال 1: كشف البيانات الحساسة
 * Example 1: Detect Sensitive Data
 */
export function example1_DetectSensitiveData() {
  console.log('\n=== مثال 1: كشف البيانات الحساسة ===');

  const detector = new SensitiveDataDetector();

  // البيانات التي تحتوي على معلومات حساسة
  const studentText = `
    الطالب: أحمد علي
    البريد الإلكتروني: ahmed.ali@university.com
    الهاتف: +966501234567
    رقم الهوية: 1234567890
    العنوان: شارع الملك فهد، الرياض
    تاريخ الميلاد: 01/05/2001
  `;

  const result = detector.detect(studentText);

  console.log('النتائج:');
  console.log(`- تم العثور على بيانات حساسة: ${result.found}`);
  console.log(`- العدد الكلي: ${result.summary.total}`);
  console.log(`- بيانات حساسة جداً (عالية): ${result.summary.high}`);
  console.log(`- بيانات حساسة: ${result.summary.medium}`);
  console.log(`\nالتفاصيل:`);
  result.matches.forEach((match) => {
    console.log(`  - ${match.type}: "${match.text}" (${match.severity})`);
  });

  return result;
}

/**
 * مثال 2: تصفية بيانات الطالب
 * Example 2: Filter Student Data
 */
export function example2_FilterStudentData() {
  console.log('\n=== مثال 2: تصفية بيانات الطالب ===');

  const filter = new DataFilter({
    maskSensitive: true,
    anonymize: true,
    maskingMethod: 'replace',
  });

  // بيانات طالب خام
  const rawStudent: StudentData = {
    id: 'STU001',
    student_id: 'S001',
    name: 'أحمد علي محمد',
    email: 'ahmed@university.com',
    phone: '+966501234567',
    grades: {
      math: 85,
      science: 90,
      english: 78,
    },
    attendance: 95,
    address: '123 King Fahd Street, Riyadh',
    dateOfBirth: '01/05/2001',
    ssn: '123-45-6789',
  };

  // تصفية البيانات
  const filtered = filter.filterStudentData(rawStudent);

  console.log('البيانات المصفاة:');
  console.log(JSON.stringify(filtered.filtered, null, 2));
  console.log(`\nالحقول المحذوفة (${filtered.removed.length}):`);
  console.log(filtered.removed.join(', '));
  console.log(`\nالحقول المخفية (${filtered.masked.length}):`);
  console.log(filtered.masked.join(', '));

  return filtered;
}

/**
 * مثال 3: دمج نتائج AI مع البيانات الأصلية
 * Example 3: Merge AI Results with Original Data
 */
export function example3_MergeResults() {
  console.log('\n=== مثال 3: دمج نتائج AI مع البيانات الأصلية ===');

  const merger = new ResultMerger();

  // بيانات الطلاب الأصلية
  const originalStudents: OriginalStudentData[] = [
    {
      id: 'S001',
      student_id: 'S001',
      name: 'أحمد علي',
      email: 'ahmed@university.com',
      phone: '+966501234567',
    },
    {
      id: 'S002',
      student_id: 'S002',
      name: 'فاطمة محمود',
      email: 'fatima@university.com',
      phone: '+966512345678',
    },
  ];

  // تسجيل بيانات الطلاب
  merger.registerStudentData(originalStudents);

  // نتائج من AI
  const aiResults: AIAnalysisResult[] = [
    {
      student_id: 'S001',
      analysis: 'أحمد يظهر تطورًا جيدًا في الرياضيات، يحتاج إلى تحسين اللغة الإنجليزية',
      recommendations: ['ممارسة مفردات جديدة', 'دروس خصوصية في القراءة'],
      score: 82,
    },
    {
      student_id: 'S002',
      analysis: 'فاطمة متفوقة في جميع المواد، أداء ممتاز',
      recommendations: ['الاستمرار بنفس الجهد', 'المشاركة في مسابقات'],
      score: 95,
    },
  ];

  // دمج النتائج
  const merged = merger.mergeResults(aiResults);

  console.log('النتائج المدمجة:');
  merged.forEach((result) => {
    console.log(`\nالطالب: ${result.personalInfo?.name}`);
    console.log(`البريد: ${result.personalInfo?.email}`);
    console.log(`التحليل: ${result.analysis?.content}`);
    console.log(`الدرجة: ${result.analysis?.score}`);
    console.log(`التوصيات: ${result.recommendations?.join(', ')}`);
  });

  return merged;
}

/**
 * مثال 4: استخدام Pipeline كامل
 * Example 4: Complete Pipeline Usage
 */
export async function example4_CompletePipeline() {
  console.log('\n=== مثال 4: Pipeline كامل ===');

  const pipeline = createSecurePipeline();

  // 1. بيانات الطلاب الخام
  const studentsBeforeAI: StudentData[] = [
    {
      id: 'S001',
      student_id: 'S001',
      name: 'أحمد علي',
      email: 'ahmed@university.com',
      phone: '+966501234567',
      grades: { math: 85, science: 90 },
      attendance: 95,
    },
  ];

  // 2. بيانات الطلاب الأصلية (للدمج لاحقًا)
  const originalData: OriginalStudentData[] = [
    {
      id: 'S001',
      student_id: 'S001',
      name: 'أحمد علي',
      email: 'ahmed@university.com',
      phone: '+966501234567',
    },
  ];

  // 3. نتائج من AI
  const aiResults: AIAnalysisResult[] = [
    {
      student_id: 'S001',
      analysis: 'أداء جيد جدًا في العلوم',
      recommendations: ['الاستمرار بالمجهود', 'فكر في التخصص في العلوم'],
      score: 88,
    },
  ];

  // معالجة البيانات قبل الإرسال للـ AI
  console.log('\n📤 معالجة البيانات قبل الإرسال للـ AI...');
  const beforeResult = await pipeline.processBefore(studentsBeforeAI);

  console.log(`✓ نجح: ${beforeResult.success}`);
  console.log(`  - بيانات حساسة مكتشفة: ${beforeResult.stats.sensitivePatternsFound}`);
  console.log(`  - حقول محذوفة: ${beforeResult.stats.fieldsRemoved}`);
  console.log(`  - حقول مخفية: ${beforeResult.stats.fieldsAnonymized}`);
  console.log(`  - البيانات المصفاة: ${beforeResult.stats.dataFiltered}`);
  console.log(`\nالبيانات المفترضة للإرسال للـ AI:`);
  console.log(JSON.stringify(beforeResult.data, null, 2));

  // معالجة نتائج AI والدمج مع البيانات الأصلية
  console.log('\n📥 دمج نتائج AI مع البيانات الأصلية...');
  const afterResult = await pipeline.processAfter(aiResults, originalData);

  console.log(`✓ نجح: ${afterResult.success}`);
  console.log(`\nالنتائج النهائية:`);
  console.log(JSON.stringify(afterResult.data, null, 2));

  // عرض السجلات
  console.log('\n📋 السجلات:');
  beforeResult.logs.forEach((log) => {
    console.log(`  [${log.step}] ${log.message}`);
  });

  return { beforeResult, afterResult };
}

/**
 * مثال 5: تخصيص الحقول المسموح بها والمحجوبة
 * Example 5: Customize Allowed and Blocked Fields
 */
export function example5_CustomizeFields() {
  console.log('\n=== مثال 5: تخصيص الحقول ===');

  // إنشاء فلتر مخصص
  const filter = new DataFilter({
    allowedFields: ['student_id', 'grades', 'attendance', 'courses'],
    blockedFields: ['email', 'phone', 'address', 'ssn', 'birthDate'],
    maskSensitive: true,
  });

  const student: StudentData = {
    student_id: 'S001',
    name: 'أحمد',
    email: 'ahmed@university.com',
    phone: '+966501234567',
    grades: { math: 85 },
    attendance: 95,
    courses: ['الرياضيات', 'العلوم'],
    address: '123 Main St',
    birthDate: '01/05/2001',
  };

  const filtered = filter.filterStudentData(student);

  console.log('الحقول المسموح بها:');
  console.log(JSON.stringify(filtered.filtered, null, 2));
  console.log(`\nالحقول المحذوفة: ${filtered.removed.join(', ')}`);

  return filtered;
}

/**
 * مثال 6: كشف أنماط مخصصة إضافية
 * Example 6: Custom Pattern Detection
 */
export function example6_CustomPatterns() {
  console.log('\n=== مثال 6: أنماط مخصصة ===');

  const detector = new SensitiveDataDetector();

  // إضافة نمط مخصص للتعرف على أرقام الطالب
  detector.addPattern('studentNumber', {
    name: 'رقم الطالب المخصص',
    pattern: /STU\d{6}/g,
    type: 'custom',
    severity: 'high',
  });

  // إضافة نمط مخصص للتعرف على أرقام المقررات
  detector.addPattern('courseCode', {
    name: 'رمز المقرر',
    pattern: /[A-Z]{2}\d{3,4}/g,
    type: 'custom',
    severity: 'low',
  });

  const text = `
    رقم الطالب: STU123456
    المقررات: CS101, MATH200, ENG150
    البريد: student@university.com
  `;

  const result = detector.detect(text);

  console.log('النتائج:');
  result.matches.forEach((match) => {
    console.log(`  - ${match.type}: "${match.text}" (${match.severity})`);
  });

  return result;
}

/**
 * مثال 7: معالجة مجموعة كبيرة من الطلاب
 * Example 7: Batch Processing Large Number of Students
 */
export async function example7_BatchProcessing() {
  console.log('\n=== مثال 7: معالجة دفعات ===');

  const pipeline = createSecurePipeline();

  // إنشاء 100 طالب
  const largeStudentSet: StudentData[] = Array.from({ length: 100 }, (_, i) => ({
    student_id: `S${String(i + 1).padStart(3, '0')}`,
    name: `Student ${i + 1}`,
    email: `student${i + 1}@university.com`,
    phone: `+966501234${String(i).padStart(3, '0')}`,
    grades: {
      math: Math.random() * 100,
      science: Math.random() * 100,
    },
    attendance: Math.random() * 100,
  }));

  console.log(`معالجة ${largeStudentSet.length} طالب...`);
  const startTime = Date.now();

  const result = await pipeline.processBefore(largeStudentSet);

  const processingTime = Date.now() - startTime;

  console.log(`✓ اكتملت المعالجة في ${processingTime}ms`);
  console.log(`  - عدد الطلاب المعالجة: ${Array.isArray(result.data) ? result.data.length : 1}`);
  console.log(`  - إجمالي البيانات الحساسة: ${result.stats.sensitivePatternsFound}`);
  console.log(`  - إجمالي الحقول المحذوفة: ${result.stats.fieldsRemoved}`);
  console.log(`  - متوسط الوقت لكل طالب: ${(processingTime / largeStudentSet.length).toFixed(2)}ms`);

  return result;
}

/**
 * تشغيل جميع الأمثلة
 * Run all examples
 */
export async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('🛡️  نظام حماية البيانات - أمثلة عملية');
  console.log('='.repeat(60));

  try {
    example1_DetectSensitiveData();
    example2_FilterStudentData();
    example3_MergeResults();
    await example4_CompletePipeline();
    example5_CustomizeFields();
    example6_CustomPatterns();
    await example7_BatchProcessing();

    console.log('\n' + '='.repeat(60));
    console.log('✓ اكتملت جميع الأمثلة بنجاح!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ حدث خطأ:', error);
  }
}

// تصدير لتشغيل الأمثلة
if (typeof window === 'undefined') {
  // في بيئة Node.js
  runAllExamples().catch(console.error);
}
