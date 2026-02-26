/**
 * Advanced JSON Analysis Library
 * Provides AI-powered and rule-based analysis for JSON data
 */

import { JsonProcessor, JsonStats } from './JsonProcessor';

export interface AnalysisReport {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    issues: Issue[];
    warnings: Warning[];
    suggestions: Suggestion[];
    metrics: Metrics;
    summary: string;
}

export interface Issue {
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: string;
    message: string;
    path?: string;
    suggestion?: string;
}

export interface Warning {
    type: string;
    message: string;
    path?: string;
}

export interface Suggestion {
    category: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
}

export interface Metrics {
    complexity: number;
    maintainability: number;
    performance: number;
    security: number;
    quality: number;
}

export class JsonAnalyzer {
    /**
     * Comprehensive JSON analysis
     */
    static analyze(data: any): AnalysisReport {
        const issues: Issue[] = [];
        const warnings: Warning[] = [];
        const suggestions: Suggestion[] = [];

        // Get basic stats
        const stats = JsonProcessor.calculateStats(data);

        // Run all analysis checks
        this.checkStructure(data, issues, warnings, suggestions);
        this.checkSecurity(data, issues, warnings);
        this.checkPerformance(data, stats, issues, suggestions);
        this.checkQuality(data, issues, warnings, suggestions);
        this.checkBestPractices(data, warnings, suggestions);

        // Calculate metrics
        const metrics = this.calculateMetrics(issues, warnings, stats);

        // Calculate overall score
        const score = this.calculateScore(metrics, issues);

        // Determine grade
        const grade = this.getGrade(score);

        // Generate summary
        const summary = this.generateSummary(score, issues, warnings, suggestions);

        return {
            score,
            grade,
            issues,
            warnings,
            suggestions,
            metrics,
            summary
        };
    }

    /**
     * Check JSON structure
     */
    private static checkStructure(
        data: any,
        issues: Issue[],
        warnings: Warning[],
        suggestions: Suggestion[]
    ): void {
        const stats = JsonProcessor.calculateStats(data);

        // Check depth
        if (stats.depth > 10) {
            issues.push({
                severity: 'high',
                type: 'structure',
                message: `عمق التداخل كبير جداً (${stats.depth} مستويات)`,
                suggestion: 'قم بتسطيح البنية لتحسين الأداء وسهولة القراءة'
            });
        } else if (stats.depth > 7) {
            warnings.push({
                type: 'structure',
                message: `عمق التداخل مرتفع (${stats.depth} مستويات)`
            });
        }

        // Check size
        if (stats.size > 1000000) { // 1MB
            issues.push({
                severity: 'medium',
                type: 'performance',
                message: `حجم JSON كبير جداً (${Math.round(stats.size / 1024)} KB)`,
                suggestion: 'فكر في تقسيم البيانات أو استخدام الضغط'
            });
        }

        // Check empty objects/arrays
        this.checkEmptyValues(data, '', warnings);

        // Check naming conventions
        this.checkNamingConventions(data, '', warnings, suggestions);
    }

    /**
     * Check for security issues
     */
    private static checkSecurity(
        data: any,
        issues: Issue[],
        warnings: Warning[]
    ): void {
        const sensitivePatterns = [
            { pattern: /password/i, name: 'كلمة مرور' },
            { pattern: /secret/i, name: 'سر' },
            { pattern: /token/i, name: 'رمز' },
            { pattern: /api[_-]?key/i, name: 'مفتاح API' },
            { pattern: /private[_-]?key/i, name: 'مفتاح خاص' },
            { pattern: /credit[_-]?card/i, name: 'بطاقة ائتمان' },
            { pattern: /ssn/i, name: 'رقم ضمان اجتماعي' }
        ];

        this.traverseForSecurity(data, '', sensitivePatterns, issues, warnings);
    }

    /**
     * Check performance implications
     */
    private static checkPerformance(
        data: any,
        stats: JsonStats,
        issues: Issue[],
        suggestions: Suggestion[]
    ): void {
        // Check for duplicate data
        const duplicates = this.findDuplicates(data);
        if (duplicates.length > 0) {
            suggestions.push({
                category: 'performance',
                message: `تم العثور على ${duplicates.length} قيم مكررة - فكر في استخدام المراجع`,
                priority: 'medium'
            });
        }

        // Check array sizes
        this.checkArraySizes(data, '', issues, suggestions);

        // Check for inefficient structures
        if (stats.objects > 1000) {
            suggestions.push({
                category: 'performance',
                message: 'عدد كبير من الكائنات - فكر في استخدام قاعدة بيانات',
                priority: 'high'
            });
        }
    }

    /**
     * Check data quality
     */
    private static checkQuality(
        data: any,
        issues: Issue[],
        warnings: Warning[],
        suggestions: Suggestion[]
    ): void {
        // Check for null/undefined values
        this.checkNullValues(data, '', warnings);

        // Check for inconsistent types
        this.checkTypeConsistency(data, '', issues);

        // Check for missing required fields (if patterns detected)
        this.checkCompleteness(data, warnings, suggestions);

        // Check for data validation
        this.checkDataValidation(data, '', warnings);
    }

    /**
     * Check best practices
     */
    private static checkBestPractices(
        data: any,
        warnings: Warning[],
        suggestions: Suggestion[]
    ): void {
        // Check for proper use of arrays vs objects
        this.checkArrayObjectUsage(data, '', suggestions);

        // Check for proper date formats
        this.checkDateFormats(data, '', warnings);

        // Check for proper boolean usage
        this.checkBooleanUsage(data, '', warnings);

        // Check for documentation/comments (metadata)
        if (!this.hasMetadata(data)) {
            suggestions.push({
                category: 'documentation',
                message: 'فكر في إضافة حقول metadata للتوثيق',
                priority: 'low'
            });
        }
    }

    /**
     * Helper: Traverse for security issues
     */
    private static traverseForSecurity(
        obj: any,
        path: string,
        patterns: Array<{ pattern: RegExp; name: string }>,
        issues: Issue[],
        warnings: Warning[]
    ): void {
        if (typeof obj !== 'object' || obj === null) return;

        Object.entries(obj).forEach(([key, value]) => {
            const currentPath = path ? `${path}.${key}` : key;

            // Check key names
            patterns.forEach(({ pattern, name }) => {
                if (pattern.test(key)) {
                    issues.push({
                        severity: 'critical',
                        type: 'security',
                        message: `تم العثور على بيانات حساسة محتملة: ${name}`,
                        path: currentPath,
                        suggestion: 'لا تقم بتخزين بيانات حساسة في JSON - استخدم التشفير أو المراجع'
                    });
                }
            });

            // Check for potential SQL injection patterns
            if (typeof value === 'string' && /select.*from|insert.*into|delete.*from/i.test(value)) {
                warnings.push({
                    type: 'security',
                    message: 'تم العثور على نمط SQL محتمل',
                    path: currentPath
                });
            }

            // Recurse
            if (typeof value === 'object') {
                this.traverseForSecurity(value, currentPath, patterns, issues, warnings);
            }
        });
    }

    /**
     * Helper: Check empty values
     */
    private static checkEmptyValues(obj: any, path: string, warnings: Warning[]): void {
        if (typeof obj !== 'object' || obj === null) return;

        if (Array.isArray(obj)) {
            if (obj.length === 0) {
                warnings.push({
                    type: 'quality',
                    message: 'مصفوفة فارغة',
                    path
                });
            }
            obj.forEach((item, idx) => this.checkEmptyValues(item, `${path}[${idx}]`, warnings));
        } else {
            if (Object.keys(obj).length === 0) {
                warnings.push({
                    type: 'quality',
                    message: 'كائن فارغ',
                    path
                });
            }
            Object.entries(obj).forEach(([key, value]) => {
                this.checkEmptyValues(value, path ? `${path}.${key}` : key, warnings);
            });
        }
    }

    /**
     * Helper: Check naming conventions
     */
    private static checkNamingConventions(
        obj: any,
        path: string,
        warnings: Warning[],
        suggestions: Suggestion[]
    ): void {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return;

        Object.entries(obj).forEach(([key, value]) => {
            // Check for spaces in keys
            if (key.includes(' ')) {
                warnings.push({
                    type: 'naming',
                    message: `المفتاح يحتوي على مسافات: "${key}"`,
                    path: path ? `${path}.${key}` : key
                });
            }

            // Check for inconsistent casing
            if (key !== key.toLowerCase() && key !== this.toCamelCase(key) && key !== this.toSnakeCase(key)) {
                suggestions.push({
                    category: 'naming',
                    message: `استخدم تنسيق موحد للمفاتيح (camelCase أو snake_case)`,
                    priority: 'low'
                });
            }

            if (typeof value === 'object') {
                this.checkNamingConventions(value, path ? `${path}.${key}` : key, warnings, suggestions);
            }
        });
    }

    /**
     * Helper: Find duplicates
     */
    private static findDuplicates(obj: any): string[] {
        const values = new Map<string, number>();
        const duplicates: string[] = [];

        const traverse = (item: any): void => {
            if (typeof item === 'object' && item !== null) {
                const str = JSON.stringify(item);
                const count = values.get(str) || 0;
                values.set(str, count + 1);
                if (count === 1) duplicates.push(str);

                Object.values(item).forEach(traverse);
            }
        };

        traverse(obj);
        return duplicates;
    }

    /**
     * Helper: Check array sizes
     */
    private static checkArraySizes(
        obj: any,
        path: string,
        issues: Issue[],
        suggestions: Suggestion[]
    ): void {
        if (Array.isArray(obj)) {
            if (obj.length > 10000) {
                issues.push({
                    severity: 'high',
                    type: 'performance',
                    message: `مصفوفة كبيرة جداً (${obj.length} عنصر)`,
                    path,
                    suggestion: 'فكر في التقسيم إلى صفحات أو استخدام قاعدة بيانات'
                });
            } else if (obj.length > 1000) {
                suggestions.push({
                    category: 'performance',
                    message: `مصفوفة كبيرة (${obj.length} عنصر) في ${path}`,
                    priority: 'medium'
                });
            }

            obj.forEach((item, idx) => this.checkArraySizes(item, `${path}[${idx}]`, issues, suggestions));
        } else if (typeof obj === 'object' && obj !== null) {
            Object.entries(obj).forEach(([key, value]) => {
                this.checkArraySizes(value, path ? `${path}.${key}` : key, issues, suggestions);
            });
        }
    }

    /**
     * Helper: Check null values
     */
    private static checkNullValues(obj: any, path: string, warnings: Warning[]): void {
        if (obj === null) {
            warnings.push({
                type: 'quality',
                message: 'قيمة null',
                path
            });
            return;
        }

        if (typeof obj === 'object') {
            Object.entries(obj).forEach(([key, value]) => {
                this.checkNullValues(value, path ? `${path}.${key}` : key, warnings);
            });
        }
    }

    /**
     * Helper: Check type consistency
     */
    private static checkTypeConsistency(obj: any, path: string, issues: Issue[]): void {
        if (!Array.isArray(obj)) return;

        const types = new Set(obj.map(item => typeof item));
        if (types.size > 1) {
            issues.push({
                severity: 'medium',
                type: 'quality',
                message: `أنواع بيانات غير متسقة في المصفوفة`,
                path,
                suggestion: 'تأكد من أن جميع عناصر المصفوفة من نفس النوع'
            });
        }
    }

    /**
     * Helper: Check completeness
     */
    private static checkCompleteness(data: any, warnings: Warning[], suggestions: Suggestion[]): void {
        if (Array.isArray(data) && data.length > 0) {
            const allKeys = new Set<string>();
            data.forEach(item => {
                if (typeof item === 'object' && item !== null) {
                    Object.keys(item).forEach(key => allKeys.add(key));
                }
            });

            data.forEach((item, idx) => {
                if (typeof item === 'object' && item !== null) {
                    allKeys.forEach(key => {
                        if (!(key in item)) {
                            warnings.push({
                                type: 'completeness',
                                message: `حقل مفقود: ${key}`,
                                path: `[${idx}]`
                            });
                        }
                    });
                }
            });
        }
    }

    /**
     * Helper: Check data validation
     */
    private static checkDataValidation(obj: any, path: string, warnings: Warning[]): void {
        if (typeof obj !== 'object' || obj === null) return;

        Object.entries(obj).forEach(([key, value]) => {
            // Check email format
            if (key.toLowerCase().includes('email') && typeof value === 'string') {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    warnings.push({
                        type: 'validation',
                        message: 'تنسيق بريد إلكتروني غير صالح',
                        path: path ? `${path}.${key}` : key
                    });
                }
            }

            // Check URL format
            if (key.toLowerCase().includes('url') && typeof value === 'string') {
                try {
                    new URL(value);
                } catch {
                    warnings.push({
                        type: 'validation',
                        message: 'تنسيق URL غير صالح',
                        path: path ? `${path}.${key}` : key
                    });
                }
            }

            if (typeof value === 'object') {
                this.checkDataValidation(value, path ? `${path}.${key}` : key, warnings);
            }
        });
    }

    /**
     * Helper: Check array/object usage
     */
    private static checkArrayObjectUsage(obj: any, path: string, suggestions: Suggestion[]): void {
        if (typeof obj !== 'object' || obj === null) return;

        if (Array.isArray(obj)) {
            // Check if array should be object
            if (obj.every(item => typeof item === 'object' && item !== null && 'id' in item)) {
                suggestions.push({
                    category: 'structure',
                    message: `فكر في استخدام كائن بدلاً من مصفوفة (مفهرس بـ id) في ${path}`,
                    priority: 'low'
                });
            }
        }

        Object.values(obj).forEach((value, idx) => {
            const newPath = Array.isArray(obj) ? `${path}[${idx}]` : path;
            this.checkArrayObjectUsage(value, newPath, suggestions);
        });
    }

    /**
     * Helper: Check date formats
     */
    private static checkDateFormats(obj: any, path: string, warnings: Warning[]): void {
        if (typeof obj !== 'object' || obj === null) return;

        Object.entries(obj).forEach(([key, value]) => {
            if (key.toLowerCase().includes('date') && typeof value === 'string') {
                if (isNaN(Date.parse(value))) {
                    warnings.push({
                        type: 'format',
                        message: 'تنسيق تاريخ غير قياسي',
                        path: path ? `${path}.${key}` : key
                    });
                }
            }

            if (typeof value === 'object') {
                this.checkDateFormats(value, path ? `${path}.${key}` : key, warnings);
            }
        });
    }

    /**
     * Helper: Check boolean usage
     */
    private static checkBooleanUsage(obj: any, path: string, warnings: Warning[]): void {
        if (typeof obj !== 'object' || obj === null) return;

        Object.entries(obj).forEach(([key, value]) => {
            // Check for string booleans
            if (typeof value === 'string' && (value === 'true' || value === 'false')) {
                warnings.push({
                    type: 'type',
                    message: 'استخدم boolean بدلاً من string',
                    path: path ? `${path}.${key}` : key
                });
            }

            if (typeof value === 'object') {
                this.checkBooleanUsage(value, path ? `${path}.${key}` : key, warnings);
            }
        });
    }

    /**
     * Helper: Check for metadata
     */
    private static hasMetadata(obj: any): boolean {
        if (typeof obj !== 'object' || obj === null) return false;
        const metadataKeys = ['version', 'timestamp', 'author', 'description', 'schema'];
        return metadataKeys.some(key => key in obj);
    }

    /**
     * Calculate metrics
     */
    private static calculateMetrics(issues: Issue[], warnings: Warning[], stats: JsonStats): Metrics {
        const criticalIssues = issues.filter(i => i.severity === 'critical').length;
        const highIssues = issues.filter(i => i.severity === 'high').length;
        const mediumIssues = issues.filter(i => i.severity === 'medium').length;

        const complexity = Math.max(0, 100 - (stats.depth * 5) - (stats.objects / 10));
        const maintainability = Math.max(0, 100 - (warnings.length * 2) - (issues.length * 5));
        const performance = Math.max(0, 100 - (stats.size / 10000) - (stats.arrays * 2));
        const security = Math.max(0, 100 - (criticalIssues * 30) - (highIssues * 15));
        const quality = Math.max(0, 100 - (mediumIssues * 5) - (warnings.length * 2));

        return {
            complexity: Math.round(complexity),
            maintainability: Math.round(maintainability),
            performance: Math.round(performance),
            security: Math.round(security),
            quality: Math.round(quality)
        };
    }

    /**
     * Calculate overall score
     */
    private static calculateScore(metrics: Metrics, issues: Issue[]): number {
        const weights = {
            complexity: 0.15,
            maintainability: 0.20,
            performance: 0.20,
            security: 0.30,
            quality: 0.15
        };

        let score = 
            metrics.complexity * weights.complexity +
            metrics.maintainability * weights.maintainability +
            metrics.performance * weights.performance +
            metrics.security * weights.security +
            metrics.quality * weights.quality;

        // Penalize for critical issues
        const criticalPenalty = issues.filter(i => i.severity === 'critical').length * 10;
        score = Math.max(0, score - criticalPenalty);

        return Math.round(score);
    }

    /**
     * Get grade from score
     */
    private static getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    /**
     * Generate summary
     */
    private static generateSummary(
        score: number,
        issues: Issue[],
        warnings: Warning[],
        suggestions: Suggestion[]
    ): string {
        const grade = this.getGrade(score);
        const criticalCount = issues.filter(i => i.severity === 'critical').length;

        let summary = `النتيجة الإجمالية: ${score}/100 (${grade})\n\n`;

        if (criticalCount > 0) {
            summary += `⚠️ تحذير: ${criticalCount} مشكلة حرجة تحتاج إلى معالجة فورية!\n\n`;
        }

        summary += `المشاكل: ${issues.length}\n`;
        summary += `التحذيرات: ${warnings.length}\n`;
        summary += `الاقتراحات: ${suggestions.length}\n\n`;

        if (score >= 90) {
            summary += '✅ ممتاز! JSON منظم بشكل جيد ويتبع أفضل الممارسات.';
        } else if (score >= 70) {
            summary += '👍 جيد! بعض التحسينات الصغيرة ستجعله أفضل.';
        } else if (score >= 50) {
            summary += '⚠️ يحتاج إلى تحسين. راجع المشاكل والاقتراحات.';
        } else {
            summary += '❌ يحتاج إلى إعادة هيكلة كبيرة. راجع جميع المشاكل.';
        }

        return summary;
    }

    /**
     * Helper: Convert to camelCase
     */
    private static toCamelCase(str: string): string {
        return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
    }

    /**
     * Helper: Convert to snake_case
     */
    private static toSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}
