/**
 * Unit Tests for JsonProcessor Library
 * Run with: npm test or jest
 */

import { JsonProcessor } from './JsonProcessor';

describe('JsonProcessor', () => {
    describe('deepClone', () => {
        it('should create a deep copy of an object', () => {
            const original = { a: 1, b: { c: 2 } };
            const cloned = JsonProcessor.deepClone(original);
            
            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);
            expect(cloned.b).not.toBe(original.b);
        });

        it('should handle arrays', () => {
            const original = [1, 2, { a: 3 }];
            const cloned = JsonProcessor.deepClone(original);
            
            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);
        });
    });

    describe('deepMerge', () => {
        it('should merge objects deeply', () => {
            const obj1 = { a: 1, b: { c: 2 } };
            const obj2 = { b: { d: 3 }, e: 4 };
            const result = JsonProcessor.deepMerge(obj1, obj2);
            
            expect(result).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
        });

        it('should concatenate arrays', () => {
            const obj1 = { arr: [1, 2] };
            const obj2 = { arr: [3, 4] };
            const result = JsonProcessor.deepMerge(obj1, obj2);
            
            expect(result.arr).toEqual([1, 2, 3, 4]);
        });
    });

    describe('getByPath', () => {
        it('should get nested values', () => {
            const obj = { user: { profile: { name: 'Ahmed' } } };
            const result = JsonProcessor.getByPath(obj, 'user.profile.name');
            
            expect(result).toBe('Ahmed');
        });

        it('should return undefined for non-existent paths', () => {
            const obj = { a: 1 };
            const result = JsonProcessor.getByPath(obj, 'b.c.d');
            
            expect(result).toBeUndefined();
        });
    });

    describe('setByPath', () => {
        it('should set nested values', () => {
            const obj: any = {};
            JsonProcessor.setByPath(obj, 'user.profile.name', 'Ahmed');
            
            expect(obj.user.profile.name).toBe('Ahmed');
        });

        it('should create intermediate objects', () => {
            const obj: any = {};
            JsonProcessor.setByPath(obj, 'a.b.c.d', 'value');
            
            expect(obj.a.b.c.d).toBe('value');
        });
    });

    describe('deleteByPath', () => {
        it('should delete nested values', () => {
            const obj = { user: { profile: { name: 'Ahmed', age: 25 } } };
            const result = JsonProcessor.deleteByPath(obj, 'user.profile.name');
            
            expect(result).toBe(true);
            expect(obj.user.profile.name).toBeUndefined();
            expect(obj.user.profile.age).toBe(25);
        });

        it('should return false for non-existent paths', () => {
            const obj = { a: 1 };
            const result = JsonProcessor.deleteByPath(obj, 'b.c');
            
            expect(result).toBe(false);
        });
    });

    describe('flatten', () => {
        it('should flatten nested objects', () => {
            const obj = { a: 1, b: { c: 2, d: { e: 3 } } };
            const result = JsonProcessor.flatten(obj);
            
            expect(result).toEqual({
                'a': 1,
                'b.c': 2,
                'b.d.e': 3
            });
        });

        it('should handle arrays', () => {
            const obj = { a: [1, 2, 3] };
            const result = JsonProcessor.flatten(obj);
            
            expect(result.a).toEqual([1, 2, 3]);
        });
    });

    describe('unflatten', () => {
        it('should unflatten dot notation objects', () => {
            const obj = { 'a': 1, 'b.c': 2, 'b.d.e': 3 };
            const result = JsonProcessor.unflatten(obj);
            
            expect(result).toEqual({
                a: 1,
                b: { c: 2, d: { e: 3 } }
            });
        });
    });

    describe('calculateStats', () => {
        it('should calculate correct statistics', () => {
            const obj = {
                name: 'Ahmed',
                age: 25,
                active: true,
                data: null,
                items: [1, 2, 3],
                nested: { value: 'test' }
            };
            
            const stats = JsonProcessor.calculateStats(obj);
            
            expect(stats.strings).toBe(2);
            expect(stats.numbers).toBe(4);
            expect(stats.booleans).toBe(1);
            expect(stats.nulls).toBe(1);
            expect(stats.arrays).toBe(1);
            expect(stats.objects).toBe(2);
        });
    });

    describe('search', () => {
        it('should find matching keys and values', () => {
            const obj = {
                user: { name: 'Ahmed', email: 'ahmed@test.com' },
                admin: { name: 'Sara' }
            };
            
            const results = JsonProcessor.search(obj, 'ahmed');
            
            expect(results.length).toBeGreaterThan(0);
            expect(results.some(r => r.path.includes('user'))).toBe(true);
        });

        it('should be case insensitive by default', () => {
            const obj = { Name: 'AHMED' };
            const results = JsonProcessor.search(obj, 'ahmed');
            
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('sortKeys', () => {
        it('should sort object keys alphabetically', () => {
            const obj = { z: 1, a: 2, m: 3 };
            const result = JsonProcessor.sortKeys(obj);
            const keys = Object.keys(result);
            
            expect(keys).toEqual(['a', 'm', 'z']);
        });

        it('should sort nested objects', () => {
            const obj = { z: { y: 1, a: 2 } };
            const result = JsonProcessor.sortKeys(obj);
            const nestedKeys = Object.keys(result.z);
            
            expect(nestedKeys).toEqual(['a', 'y']);
        });
    });

    describe('extractKeys', () => {
        it('should extract all keys', () => {
            const obj = { a: 1, b: { c: 2, d: { e: 3 } } };
            const keys = JsonProcessor.extractKeys(obj);
            
            expect(keys).toContain('a');
            expect(keys).toContain('b.c');
            expect(keys).toContain('b.d.e');
        });
    });

    describe('compare', () => {
        it('should detect added fields', () => {
            const obj1 = { a: 1 };
            const obj2 = { a: 1, b: 2 };
            const result = JsonProcessor.compare(obj1, obj2);
            
            expect(result.equal).toBe(false);
            expect(result.differences.some(d => d.type === 'added')).toBe(true);
        });

        it('should detect removed fields', () => {
            const obj1 = { a: 1, b: 2 };
            const obj2 = { a: 1 };
            const result = JsonProcessor.compare(obj1, obj2);
            
            expect(result.equal).toBe(false);
            expect(result.differences.some(d => d.type === 'removed')).toBe(true);
        });

        it('should detect modified fields', () => {
            const obj1 = { a: 1 };
            const obj2 = { a: 2 };
            const result = JsonProcessor.compare(obj1, obj2);
            
            expect(result.equal).toBe(false);
            expect(result.differences.some(d => d.type === 'modified')).toBe(true);
        });

        it('should return equal for identical objects', () => {
            const obj1 = { a: 1, b: { c: 2 } };
            const obj2 = { a: 1, b: { c: 2 } };
            const result = JsonProcessor.compare(obj1, obj2);
            
            expect(result.equal).toBe(true);
            expect(result.differences.length).toBe(0);
        });
    });

    describe('removeNullish', () => {
        it('should remove null and undefined values', () => {
            const obj = { a: 1, b: null, c: undefined, d: 'test' };
            const result = JsonProcessor.removeNullish(obj);
            
            expect(result).toEqual({ a: 1, d: 'test' });
        });

        it('should handle nested objects', () => {
            const obj = { a: { b: null, c: 1 } };
            const result = JsonProcessor.removeNullish(obj);
            
            expect(result).toEqual({ a: { c: 1 } });
        });
    });

    describe('transform', () => {
        it('should transform values using custom function', () => {
            const obj = { name: 'ahmed', email: 'AHMED@TEST.COM' };
            const result = JsonProcessor.transform(obj, (key, value) => {
                if (typeof value === 'string') {
                    return value.toLowerCase();
                }
                return value;
            });
            
            expect(result.email).toBe('ahmed@test.com');
        });
    });

    describe('compress and prettyPrint', () => {
        it('should compress JSON', () => {
            const obj = { a: 1, b: 2 };
            const result = JsonProcessor.compress(obj);
            
            expect(result).toBe('{"a":1,"b":2}');
        });

        it('should pretty print JSON', () => {
            const obj = { a: 1 };
            const result = JsonProcessor.prettyPrint(obj, 2);
            
            expect(result).toContain('\n');
            expect(result).toContain('  ');
        });
    });
});
