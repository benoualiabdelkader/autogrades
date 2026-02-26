/**
 * Advanced JSON Processing Library
 * Provides powerful utilities for JSON manipulation, validation, and transformation
 */

export interface JsonStats {
    size: number;
    depth: number;
    keys: number;
    arrays: number;
    objects: number;
    nulls: number;
    booleans: number;
    numbers: number;
    strings: number;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface ComparisonResult {
    equal: boolean;
    differences: Array<{
        path: string;
        type: 'added' | 'removed' | 'modified';
        oldValue?: any;
        newValue?: any;
    }>;
}

export class JsonProcessor {
    /**
     * Deep clone a JSON object
     */
    static deepClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Merge multiple JSON objects deeply
     */
    static deepMerge(...objects: any[]): any {
        const isObject = (obj: any) => obj && typeof obj === 'object' && !Array.isArray(obj);

        return objects.reduce((prev, obj) => {
            Object.keys(obj).forEach(key => {
                const pVal = prev[key];
                const oVal = obj[key];

                if (Array.isArray(pVal) && Array.isArray(oVal)) {
                    prev[key] = [...pVal, ...oVal];
                } else if (isObject(pVal) && isObject(oVal)) {
                    prev[key] = this.deepMerge(pVal, oVal);
                } else {
                    prev[key] = oVal;
                }
            });

            return prev;
        }, {});
    }

    /**
     * Get value from nested path (e.g., "user.address.city")
     */
    static getByPath(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Set value at nested path
     */
    static setByPath(obj: any, path: string, value: any): void {
        const keys = path.split('.');
        const lastKey = keys.pop()!;
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    /**
     * Remove value at nested path
     */
    static deleteByPath(obj: any, path: string): boolean {
        const keys = path.split('.');
        const lastKey = keys.pop()!;
        const target = keys.reduce((current, key) => current?.[key], obj);
        if (target && lastKey in target) {
            delete target[lastKey];
            return true;
        }
        return false;
    }

    /**
     * Flatten nested JSON to dot notation
     */
    static flatten(obj: any, prefix = ''): Record<string, any> {
        const flattened: Record<string, any> = {};

        Object.entries(obj).forEach(([key, value]) => {
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                Object.assign(flattened, this.flatten(value, newKey));
            } else {
                flattened[newKey] = value;
            }
        });

        return flattened;
    }

    /**
     * Unflatten dot notation to nested JSON
     */
    static unflatten(obj: Record<string, any>): any {
        const result: any = {};

        Object.entries(obj).forEach(([key, value]) => {
            this.setByPath(result, key, value);
        });

        return result;
    }

    /**
     * Calculate comprehensive statistics
     */
    static calculateStats(obj: any): JsonStats {
        const stats: JsonStats = {
            size: JSON.stringify(obj).length,
            depth: 0,
            keys: 0,
            arrays: 0,
            objects: 0,
            nulls: 0,
            booleans: 0,
            numbers: 0,
            strings: 0
        };

        const traverse = (item: any, currentDepth: number) => {
            stats.depth = Math.max(stats.depth, currentDepth);

            if (item === null) {
                stats.nulls++;
            } else if (typeof item === 'boolean') {
                stats.booleans++;
            } else if (typeof item === 'number') {
                stats.numbers++;
            } else if (typeof item === 'string') {
                stats.strings++;
            } else if (Array.isArray(item)) {
                stats.arrays++;
                item.forEach(el => traverse(el, currentDepth + 1));
            } else if (typeof item === 'object') {
                stats.objects++;
                stats.keys += Object.keys(item).length;
                Object.values(item).forEach(val => traverse(val, currentDepth + 1));
            }
        };

        traverse(obj, 0);
        return stats;
    }

    /**
     * Search for keys or values matching a query
     */
    static search(obj: any, query: string, caseSensitive = false): Array<{ path: string; value: any }> {
        const results: Array<{ path: string; value: any }> = [];
        const searchTerm = caseSensitive ? query : query.toLowerCase();

        const traverse = (item: any, path = ''): void => {
            if (typeof item === 'object' && item !== null) {
                Object.entries(item).forEach(([key, value]) => {
                    const currentPath = path ? `${path}.${key}` : key;
                    const keyMatch = caseSensitive ? key : key.toLowerCase();
                    const valueStr = caseSensitive ? JSON.stringify(value) : JSON.stringify(value).toLowerCase();

                    if (keyMatch.includes(searchTerm) || valueStr.includes(searchTerm)) {
                        results.push({ path: currentPath, value });
                    }

                    if (typeof value === 'object') {
                        traverse(value, currentPath);
                    }
                });
            }
        };

        traverse(obj);
        return results;
    }

    /**
     * Sort object keys recursively
     */
    static sortKeys(obj: any): any {
        if (Array.isArray(obj)) {
            return obj.map(item => this.sortKeys(item));
        } else if (typeof obj === 'object' && obj !== null) {
            return Object.keys(obj)
                .sort()
                .reduce((sorted: any, key) => {
                    sorted[key] = this.sortKeys(obj[key]);
                    return sorted;
                }, {});
        }
        return obj;
    }

    /**
     * Extract all unique keys from JSON
     */
    static extractKeys(obj: any, prefix = ''): string[] {
        const keys = new Set<string>();

        const traverse = (item: any, path: string): void => {
            if (typeof item === 'object' && item !== null) {
                Object.keys(item).forEach(key => {
                    const fullKey = path ? `${path}.${key}` : key;
                    keys.add(fullKey);
                    traverse(item[key], fullKey);
                });
            }
        };

        traverse(obj, prefix);
        return Array.from(keys).sort();
    }

    /**
     * Compare two JSON objects and find differences
     */
    static compare(obj1: any, obj2: any): ComparisonResult {
        const differences: ComparisonResult['differences'] = [];

        const traverse = (o1: any, o2: any, path = ''): void => {
            const keys1 = o1 && typeof o1 === 'object' ? Object.keys(o1) : [];
            const keys2 = o2 && typeof o2 === 'object' ? Object.keys(o2) : [];
            const allKeys = new Set([...keys1, ...keys2]);

            allKeys.forEach(key => {
                const currentPath = path ? `${path}.${key}` : key;
                const val1 = o1?.[key];
                const val2 = o2?.[key];

                if (!(key in o1)) {
                    differences.push({ path: currentPath, type: 'added', newValue: val2 });
                } else if (!(key in o2)) {
                    differences.push({ path: currentPath, type: 'removed', oldValue: val1 });
                } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
                    if (typeof val1 === 'object' && typeof val2 === 'object') {
                        traverse(val1, val2, currentPath);
                    } else {
                        differences.push({ path: currentPath, type: 'modified', oldValue: val1, newValue: val2 });
                    }
                }
            });
        };

        traverse(obj1, obj2);
        return {
            equal: differences.length === 0,
            differences
        };
    }

    /**
     * Validate JSON schema (basic validation)
     */
    static validate(obj: any, schema: any): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        const validateType = (value: any, expectedType: string, path: string): void => {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== expectedType) {
                errors.push(`Type mismatch at ${path}: expected ${expectedType}, got ${actualType}`);
            }
        };

        const traverse = (data: any, schemaNode: any, path = 'root'): void => {
            if (schemaNode.type) {
                validateType(data, schemaNode.type, path);
            }

            if (schemaNode.required && Array.isArray(schemaNode.required)) {
                schemaNode.required.forEach((key: string) => {
                    if (!(key in data)) {
                        errors.push(`Missing required field: ${path}.${key}`);
                    }
                });
            }

            if (schemaNode.properties && typeof data === 'object') {
                Object.entries(schemaNode.properties).forEach(([key, propSchema]) => {
                    if (key in data) {
                        traverse(data[key], propSchema, `${path}.${key}`);
                    }
                });
            }
        };

        try {
            traverse(obj, schema);
        } catch (error: any) {
            errors.push(`Validation error: ${error.message}`);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Remove null or undefined values
     */
    static removeNullish(obj: any): any {
        if (Array.isArray(obj)) {
            return obj.map(item => this.removeNullish(item)).filter(item => item != null);
        } else if (typeof obj === 'object' && obj !== null) {
            return Object.entries(obj).reduce((acc: any, [key, value]) => {
                const cleaned = this.removeNullish(value);
                if (cleaned != null) {
                    acc[key] = cleaned;
                }
                return acc;
            }, {});
        }
        return obj;
    }

    /**
     * Transform JSON using a mapping function
     */
    static transform(obj: any, transformer: (key: string, value: any, path: string) => any): any {
        const traverse = (item: any, path = ''): any => {
            if (Array.isArray(item)) {
                return item.map((el, idx) => traverse(el, `${path}[${idx}]`));
            } else if (typeof item === 'object' && item !== null) {
                return Object.entries(item).reduce((acc: any, [key, value]) => {
                    const currentPath = path ? `${path}.${key}` : key;
                    acc[key] = transformer(key, traverse(value, currentPath), currentPath);
                    return acc;
                }, {});
            }
            return item;
        };

        return traverse(obj);
    }

    /**
     * Pretty print JSON with colors (for terminal/console)
     */
    static prettyPrint(obj: any, indent = 2): string {
        return JSON.stringify(obj, null, indent);
    }

    /**
     * Compress JSON by removing whitespace
     */
    static compress(obj: any): string {
        return JSON.stringify(obj);
    }

    /**
     * Escape special characters in JSON strings
     */
    static escape(str: string): string {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }

    /**
     * Unescape special characters in JSON strings
     */
    static unescape(str: string): string {
        return str
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
    }
}
