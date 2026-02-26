/**
 * TypeScript Type Definitions for JSON Processing
 */

// Basic JSON types
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

// Statistics types
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

// Validation types
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface ValidationRule {
    path: string;
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
    required?: boolean;
    pattern?: RegExp;
    min?: number;
    max?: number;
    enum?: any[];
    custom?: (value: any) => boolean | string;
}

// Comparison types
export interface ComparisonResult {
    equal: boolean;
    differences: Difference[];
}

export interface Difference {
    path: string;
    type: 'added' | 'removed' | 'modified';
    oldValue?: any;
    newValue?: any;
}

// Search types
export interface SearchResult {
    path: string;
    value: any;
    matchType: 'key' | 'value' | 'both';
}

export interface SearchOptions {
    caseSensitive?: boolean;
    matchWholeWord?: boolean;
    useRegex?: boolean;
    maxResults?: number;
}

// Transform types
export type TransformFunction = (key: string, value: any, path: string) => any;

export interface TransformOptions {
    recursive?: boolean;
    skipArrays?: boolean;
    skipObjects?: boolean;
}

// Schema types
export interface JsonSchema {
    type?: string;
    properties?: { [key: string]: JsonSchema };
    required?: string[];
    items?: JsonSchema;
    enum?: any[];
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    additionalProperties?: boolean;
}

// Path types
export type JsonPath = string | string[];

// Merge options
export interface MergeOptions {
    arrayMergeStrategy?: 'concat' | 'replace' | 'merge';
    overwriteArrays?: boolean;
    skipNull?: boolean;
    skipUndefined?: boolean;
}

// Flatten options
export interface FlattenOptions {
    delimiter?: string;
    maxDepth?: number;
    includeArrayIndices?: boolean;
}

// Sort options
export interface SortOptions {
    recursive?: boolean;
    sortArrays?: boolean;
    compareFn?: (a: any, b: any) => number;
}

// Export options
export interface ExportOptions {
    format?: 'json' | 'csv' | 'xml' | 'yaml';
    pretty?: boolean;
    indent?: number;
    encoding?: 'utf8' | 'utf16' | 'ascii';
}

// Import options
export interface ImportOptions {
    format?: 'json' | 'csv' | 'xml' | 'yaml';
    encoding?: 'utf8' | 'utf16' | 'ascii';
    strict?: boolean;
}

// Filter types
export type FilterPredicate = (key: string, value: any, path: string) => boolean;

export interface FilterOptions {
    recursive?: boolean;
    removeEmpty?: boolean;
}

// Utility types
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
    readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type PathValue<T, P extends string> = P extends keyof T
    ? T[P]
    : P extends `${infer K}.${infer R}`
    ? K extends keyof T
        ? PathValue<T[K], R>
        : never
    : never;

// Error types
export class JsonProcessingError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any
    ) {
        super(message);
        this.name = 'JsonProcessingError';
    }
}

export class JsonValidationError extends JsonProcessingError {
    constructor(message: string, public errors: string[]) {
        super(message, 'VALIDATION_ERROR', { errors });
        this.name = 'JsonValidationError';
    }
}

export class JsonParseError extends JsonProcessingError {
    constructor(message: string, public position?: number) {
        super(message, 'PARSE_ERROR', { position });
        this.name = 'JsonParseError';
    }
}

// Configuration types
export interface JsonProcessorConfig {
    maxDepth?: number;
    maxSize?: number;
    strictMode?: boolean;
    allowComments?: boolean;
    allowTrailingCommas?: boolean;
}

// Event types for reactive processing
export type JsonChangeEvent = {
    type: 'add' | 'update' | 'delete';
    path: string;
    oldValue?: any;
    newValue?: any;
    timestamp: number;
};

export type JsonChangeListener = (event: JsonChangeEvent) => void;

// Batch operation types
export interface BatchOperation {
    type: 'set' | 'delete' | 'merge';
    path: string;
    value?: any;
}

export interface BatchResult {
    success: boolean;
    operations: number;
    errors: Array<{ operation: BatchOperation; error: string }>;
}
