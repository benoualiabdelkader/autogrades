/**
 * Practical Examples for JSON Processing Library
 * أمثلة عملية لاستخدام مكتبة معالجة JSON
 */

import { JsonProcessor } from './JsonProcessor';

// ============================================
// Example 1: Student Grade Management
// مثال 1: إدارة درجات الطلاب
// ============================================

export function studentGradeExample() {
    const students = {
        class: "CS101",
        students: [
            { id: 1, name: "أحمد محمد", grades: { midterm: 85, final: 90, assignments: [95, 88, 92] } },
            { id: 2, name: "سارة علي", grades: { midterm: 92, final: 88, assignments: [90, 94, 89] } },
            { id: 3, name: "محمد حسن", grades: { midterm: 78, final: 82, assignments: [85, 80, 88] } }
        ]
    };

    // Calculate statistics
    const stats = JsonProcessor.calculateStats(students);
    console.log('Data Statistics:', stats);

    // Search for a specific student
    const searchResults = JsonProcessor.search(students, 'أحمد');
    console.log('Search Results:', searchResults);

    // Get specific grade
    const ahmadMidterm = JsonProcessor.getByPath(students, 'students.0.grades.midterm');
    console.log('Ahmed Midterm Grade:', ahmadMidterm);

    // Update a grade
    JsonProcessor.setByPath(students, 'students.0.grades.final', 95);
    console.log('Updated Final Grade');

    // Extract all keys
    const allKeys = JsonProcessor.extractKeys(students);
    console.log('All Keys:', allKeys);

    return students;
}

// ============================================
// Example 2: Configuration Management
// مثال 2: إدارة الإعدادات
// ============================================

export function configurationExample() {
    const defaultConfig = {
        app: {
            name: "AutoGrader",
            version: "1.0.0",
            theme: "light",
            language: "ar"
        },
        features: {
            aiAssistant: true,
            rubricGenerator: true,
            smartGrader: false
        },
        notifications: {
            email: true,
            sms: false,
            push: true
        }
    };

    const userConfig = {
        app: {
            theme: "dark",
            language: "en"
        },
        features: {
            smartGrader: true
        },
        notifications: {
            sms: true
        }
    };

    // Merge configurations
    const finalConfig = JsonProcessor.deepMerge(defaultConfig, userConfig);
    console.log('Merged Configuration:', finalConfig);

    // Flatten for storage
    const flatConfig = JsonProcessor.flatten(finalConfig);
    console.log('Flattened Config:', flatConfig);

    // Sort keys
    const sortedConfig = JsonProcessor.sortKeys(finalConfig);
    console.log('Sorted Config:', sortedConfig);

    return finalConfig;
}

// ============================================
// Example 3: API Response Processing
// مثال 3: معالجة استجابة API
// ============================================

export function apiResponseExample() {
    const apiResponse = {
        status: "success",
        data: {
            users: [
                { id: 1, name: "User 1", email: "user1@example.com", active: true },
                { id: 2, name: "User 2", email: null, active: false },
                { id: 3, name: "User 3", email: "user3@example.com", active: true }
            ],
            metadata: {
                total: 3,
                page: 1,
                perPage: 10,
                timestamp: "2024-01-01T00:00:00Z"
            }
        },
        errors: null
    };

    // Remove null values
    const cleanedResponse = JsonProcessor.removeNullish(apiResponse);
    console.log('Cleaned Response:', cleanedResponse);

    // Extract only active users
    const activeUsers = apiResponse.data.users.filter(u => u.active);
    console.log('Active Users:', activeUsers);

    // Transform emails to lowercase
    const transformedResponse = JsonProcessor.transform(apiResponse, (key, value) => {
        if (key === 'email' && typeof value === 'string') {
            return value.toLowerCase();
        }
        return value;
    });
    console.log('Transformed Response:', transformedResponse);

    return cleanedResponse;
}

// ============================================
// Example 4: Data Comparison
// مثال 4: مقارنة البيانات
// ============================================

export function dataComparisonExample() {
    const version1 = {
        product: "AutoGrader",
        version: "1.0.0",
        features: ["grading", "rubrics"],
        settings: {
            theme: "light",
            language: "ar"
        }
    };

    const version2 = {
        product: "AutoGrader",
        version: "1.1.0",
        features: ["grading", "rubrics", "ai-assistant"],
        settings: {
            theme: "dark",
            language: "ar",
            notifications: true
        }
    };

    // Compare versions
    const comparison = JsonProcessor.compare(version1, version2);
    console.log('Comparison Result:', comparison);

    if (!comparison.equal) {
        console.log('Differences found:');
        comparison.differences.forEach(diff => {
            console.log(`- ${diff.type} at ${diff.path}`);
            if (diff.type === 'modified') {
                console.log(`  Old: ${JSON.stringify(diff.oldValue)}`);
                console.log(`  New: ${JSON.stringify(diff.newValue)}`);
            }
        });
    }

    return comparison;
}

// ============================================
// Example 5: Form Data Processing
// مثال 5: معالجة بيانات النماذج
// ============================================

export function formDataExample() {
    const formData = {
        "user.firstName": "أحمد",
        "user.lastName": "محمد",
        "user.email": "ahmed@example.com",
        "user.address.street": "شارع النيل",
        "user.address.city": "القاهرة",
        "user.address.country": "مصر",
        "preferences.theme": "dark",
        "preferences.language": "ar"
    };

    // Unflatten form data
    const structuredData = JsonProcessor.unflatten(formData);
    console.log('Structured Data:', structuredData);

    // Validate required fields
    const requiredFields = ['user.firstName', 'user.lastName', 'user.email'];
    const missingFields = requiredFields.filter(field => !JsonProcessor.getByPath(structuredData, field));
    
    if (missingFields.length > 0) {
        console.log('Missing required fields:', missingFields);
    } else {
        console.log('All required fields present');
    }

    return structuredData;
}

// ============================================
// Example 6: Data Migration
// مثال 6: ترحيل البيانات
// ============================================

export function dataMigrationExample() {
    const oldFormat = {
        userName: "أحمد",
        userEmail: "ahmed@example.com",
        userAge: 25,
        userCity: "القاهرة"
    };

    // Transform to new format
    const newFormat = JsonProcessor.transform(oldFormat, (key, value) => {
        // Remove 'user' prefix and convert to camelCase
        if (key.startsWith('user')) {
            const newKey = key.replace('user', '').toLowerCase();
            return value;
        }
        return value;
    });

    // Restructure
    const restructured = {
        user: {
            name: oldFormat.userName,
            email: oldFormat.userEmail,
            profile: {
                age: oldFormat.userAge,
                city: oldFormat.userCity
            }
        }
    };

    console.log('Migrated Data:', restructured);
    return restructured;
}

// ============================================
// Example 7: JSON Schema Validation
// مثال 7: التحقق من مخطط JSON
// ============================================

export function schemaValidationExample() {
    const data = {
        name: "أحمد",
        age: 25,
        email: "ahmed@example.com",
        active: true
    };

    const schema = {
        type: "object",
        required: ["name", "email"],
        properties: {
            name: { type: "string" },
            age: { type: "number" },
            email: { type: "string" },
            active: { type: "boolean" }
        }
    };

    const validationResult = JsonProcessor.validate(data, schema);
    
    if (validationResult.valid) {
        console.log('✓ Data is valid');
    } else {
        console.log('✗ Validation errors:');
        validationResult.errors.forEach(error => console.log(`  - ${error}`));
    }

    return validationResult;
}

// ============================================
// Example 8: Performance Optimization
// مثال 8: تحسين الأداء
// ============================================

export function performanceExample() {
    // Large dataset
    const largeData = {
        records: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            name: `Record ${i}`,
            data: {
                value: Math.random() * 100,
                timestamp: new Date().toISOString()
            }
        }))
    };

    console.time('Statistics Calculation');
    const stats = JsonProcessor.calculateStats(largeData);
    console.timeEnd('Statistics Calculation');

    console.time('Search Operation');
    const searchResults = JsonProcessor.search(largeData, 'Record 500');
    console.timeEnd('Search Operation');

    console.time('Flatten Operation');
    const flattened = JsonProcessor.flatten(largeData);
    console.timeEnd('Flatten Operation');

    console.log('Performance Stats:', {
        totalRecords: largeData.records.length,
        dataSize: stats.size,
        searchResults: searchResults.length
    });

    return stats;
}

// ============================================
// Example 9: Real-time Data Sync
// مثال 9: مزامنة البيانات في الوقت الفعلي
// ============================================

export function realtimeSyncExample() {
    const localData = {
        lastSync: "2024-01-01T10:00:00Z",
        items: [
            { id: 1, name: "Item 1", modified: "2024-01-01T09:00:00Z" },
            { id: 2, name: "Item 2", modified: "2024-01-01T08:00:00Z" }
        ]
    };

    const serverData = {
        lastSync: "2024-01-01T11:00:00Z",
        items: [
            { id: 1, name: "Item 1 Updated", modified: "2024-01-01T10:30:00Z" },
            { id: 2, name: "Item 2", modified: "2024-01-01T08:00:00Z" },
            { id: 3, name: "Item 3", modified: "2024-01-01T10:00:00Z" }
        ]
    };

    // Compare and find changes
    const comparison = JsonProcessor.compare(localData, serverData);
    
    console.log('Sync Status:');
    console.log(`- Total differences: ${comparison.differences.length}`);
    
    const updates = comparison.differences.filter(d => d.type === 'modified');
    const additions = comparison.differences.filter(d => d.type === 'added');
    
    console.log(`- Updates needed: ${updates.length}`);
    console.log(`- New items: ${additions.length}`);

    return comparison;
}

// ============================================
// Example 10: Export/Import Utilities
// مثال 10: أدوات التصدير/الاستيراد
// ============================================

export function exportImportExample() {
    const data = {
        title: "تقرير الدرجات",
        date: "2024-01-01",
        students: [
            { name: "أحمد", grade: 95 },
            { name: "سارة", grade: 88 },
            { name: "محمد", grade: 92 }
        ]
    };

    // Pretty print for export
    const prettyJson = JsonProcessor.prettyPrint(data, 2);
    console.log('Pretty JSON for export:');
    console.log(prettyJson);

    // Compress for storage
    const compressed = JsonProcessor.compress(data);
    console.log('Compressed JSON:', compressed);
    console.log('Size reduction:', prettyJson.length - compressed.length, 'bytes');

    // Clone for modification
    const cloned = JsonProcessor.deepClone(data);
    cloned.students.push({ name: "فاطمة", grade: 97 });
    console.log('Modified copy:', cloned);
    console.log('Original unchanged:', data);

    return { prettyJson, compressed, cloned };
}

// ============================================
// Run All Examples
// تشغيل جميع الأمثلة
// ============================================

export function runAllExamples() {
    console.log('=== JSON Processing Examples ===\n');

    console.log('1. Student Grade Management');
    studentGradeExample();
    console.log('\n');

    console.log('2. Configuration Management');
    configurationExample();
    console.log('\n');

    console.log('3. API Response Processing');
    apiResponseExample();
    console.log('\n');

    console.log('4. Data Comparison');
    dataComparisonExample();
    console.log('\n');

    console.log('5. Form Data Processing');
    formDataExample();
    console.log('\n');

    console.log('6. Data Migration');
    dataMigrationExample();
    console.log('\n');

    console.log('7. Schema Validation');
    schemaValidationExample();
    console.log('\n');

    console.log('8. Performance Optimization');
    performanceExample();
    console.log('\n');

    console.log('9. Real-time Data Sync');
    realtimeSyncExample();
    console.log('\n');

    console.log('10. Export/Import Utilities');
    exportImportExample();
    console.log('\n');

    console.log('=== All Examples Completed ===');
}
