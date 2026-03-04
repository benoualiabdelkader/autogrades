/**
 * AI Data Manager - مدير البيانات الذكي
 * يتيح استيراد/تصدير/تحليل البيانات عبر المحادثة
 *
 * القدرات:
 * - تحليل وقراءة CSV من النص المباشر أو الملفات
 * - قراءة وتحليل JSON
 * - تحليل إحصائي متقدم للبيانات
 * - تصفية وبحث ذكي
 * - تصدير بصيغ متعددة (CSV, JSON, PDF)
 */

export interface DataRecord {
  [key: string]: string | number | boolean | null;
}

export interface DataSet {
  id: string;
  name: string;
  source: 'csv' | 'json' | 'paste' | 'api' | 'file';
  records: DataRecord[];
  headers: string[];
  createdAt: Date;
  metadata: {
    rowCount: number;
    columnCount: number;
    originalFormat: string;
    hasHeaders: boolean;
  };
}

export interface DataAnalysis {
  summary: {
    totalRecords: number;
    totalColumns: number;
    numericColumns: string[];
    textColumns: string[];
  };
  statistics: Record<string, ColumnStats>;
  insights: string[];
  recommendations: string[];
}

export interface ColumnStats {
  type: 'numeric' | 'text' | 'boolean' | 'date' | 'mixed';
  count: number;
  missing: number;
  unique: number;
  // Numeric stats
  mean?: number;
  median?: number;
  min?: number;
  max?: number;
  stdDev?: number;
  // Text stats
  avgLength?: number;
  maxLength?: number;
  minLength?: number;
  // Distribution
  distribution?: Record<string, number>;
}

export interface FilterCondition {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with';
  value: string | number;
}

export class AIDataManager {
  private static instance: AIDataManager;
  private datasets: Map<string, DataSet> = new Map();
  private storageKey = 'aiDataManager.datasets';

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): AIDataManager {
    if (!AIDataManager.instance) {
      AIDataManager.instance = new AIDataManager();
    }
    return AIDataManager.instance;
  }

  // ===== CSV Operations =====

  /**
   * Parse CSV text into structured data
   */
  parseCSV(csvText: string, options: {
    delimiter?: string;
    hasHeaders?: boolean;
    name?: string;
  } = {}): DataSet {
    const delimiter = options.delimiter || this.detectDelimiter(csvText);
    const hasHeaders = options.hasHeaders !== false;
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length === 0) {
      throw new Error('CSV data is empty');
    }

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = hasHeaders
      ? parseRow(lines[0]).map((h, i) => h || `column_${i + 1}`)
      : parseRow(lines[0]).map((_, i) => `column_${i + 1}`);

    const dataStartIndex = hasHeaders ? 1 : 0;
    const records: DataRecord[] = [];

    for (let i = dataStartIndex; i < lines.length; i++) {
      const values = parseRow(lines[i]);
      const record: DataRecord = {};
      headers.forEach((header, idx) => {
        const val = values[idx] || '';
        // Auto-detect types
        if (val === '' || val === 'null' || val === 'NULL') {
          record[header] = null;
        } else if (!isNaN(Number(val)) && val !== '') {
          record[header] = Number(val);
        } else if (val.toLowerCase() === 'true' || val.toLowerCase() === 'false') {
          record[header] = val.toLowerCase() === 'true';
        } else {
          record[header] = val;
        }
      });
      records.push(record);
    }

    const id = `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const dataset: DataSet = {
      id,
      name: options.name || `CSV Import ${new Date().toLocaleDateString()}`,
      source: 'csv',
      records,
      headers,
      createdAt: new Date(),
      metadata: {
        rowCount: records.length,
        columnCount: headers.length,
        originalFormat: 'csv',
        hasHeaders,
      },
    };

    this.datasets.set(id, dataset);
    this.saveToStorage();
    return dataset;
  }

  /**
   * Detect CSV delimiter
   */
  private detectDelimiter(text: string): string {
    const firstLine = text.split('\n')[0];
    const counts = {
      ',': (firstLine.match(/,/g) || []).length,
      '\t': (firstLine.match(/\t/g) || []).length,
      ';': (firstLine.match(/;/g) || []).length,
      '|': (firstLine.match(/\|/g) || []).length,
    };
    let maxDelimiter = ',';
    let maxCount = 0;
    for (const [delim, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxDelimiter = delim;
      }
    }
    return maxDelimiter;
  }

  // ===== JSON Operations =====

  /**
   * Parse JSON data into structured DataSet
   */
  parseJSON(jsonData: any, options: { name?: string } = {}): DataSet {
    let records: DataRecord[] = [];

    if (Array.isArray(jsonData)) {
      records = jsonData.map(item => {
        if (typeof item === 'object' && item !== null) {
          return this.flattenObject(item);
        }
        return { value: item };
      });
    } else if (typeof jsonData === 'object' && jsonData !== null) {
      // Single object or nested structure
      if (this.isRecordLike(jsonData)) {
        records = [this.flattenObject(jsonData)];
      } else {
        // Try to find array inside object
        for (const key of Object.keys(jsonData)) {
          if (Array.isArray(jsonData[key])) {
            records = jsonData[key].map((item: any) =>
              typeof item === 'object' ? this.flattenObject(item) : { value: item }
            );
            break;
          }
        }
        if (records.length === 0) {
          records = [this.flattenObject(jsonData)];
        }
      }
    }

    const headers = [...new Set(records.flatMap(r => Object.keys(r)))];
    const id = `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    const dataset: DataSet = {
      id,
      name: options.name || `JSON Import ${new Date().toLocaleDateString()}`,
      source: 'json',
      records,
      headers,
      createdAt: new Date(),
      metadata: {
        rowCount: records.length,
        columnCount: headers.length,
        originalFormat: 'json',
        hasHeaders: true,
      },
    };

    this.datasets.set(id, dataset);
    this.saveToStorage();
    return dataset;
  }

  /**
   * Flatten nested object for tabular representation
   */
  private flattenObject(obj: any, prefix = ''): DataRecord {
    const result: DataRecord = {};
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value, fullKey));
      } else if (Array.isArray(value)) {
        result[fullKey] = JSON.stringify(value);
      } else {
        result[fullKey] = value as string | number | boolean | null;
      }
    }
    return result;
  }

  private isRecordLike(obj: any): boolean {
    return Object.values(obj).every(v =>
      v === null || typeof v !== 'object' || Array.isArray(v)
    );
  }

  // ===== Analysis Operations =====

  /**
   * Perform comprehensive data analysis
   */
  analyzeData(datasetId?: string): DataAnalysis {
    const dataset = datasetId
      ? this.datasets.get(datasetId)
      : this.getLastDataset();

    if (!dataset) {
      return {
        summary: { totalRecords: 0, totalColumns: 0, numericColumns: [], textColumns: [] },
        statistics: {},
        insights: ['No data available for analysis.'],
        recommendations: ['Import CSV or JSON data first.'],
      };
    }

    const statistics: Record<string, ColumnStats> = {};
    const numericColumns: string[] = [];
    const textColumns: string[] = [];

    for (const header of dataset.headers) {
      const values = dataset.records.map(r => r[header]);
      const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
      const numericValues = nonNullValues.filter(v => typeof v === 'number' || !isNaN(Number(v))).map(v => Number(v));

      const colType = numericValues.length > nonNullValues.length * 0.7 ? 'numeric' : 'text';

      if (colType === 'numeric') {
        numericColumns.push(header);
        const sorted = [...numericValues].sort((a, b) => a - b);
        const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
        const variance = numericValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numericValues.length;

        statistics[header] = {
          type: 'numeric',
          count: nonNullValues.length,
          missing: values.length - nonNullValues.length,
          unique: new Set(numericValues).size,
          mean: Math.round(mean * 100) / 100,
          median: Math.round(median * 100) / 100,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
        };
      } else {
        textColumns.push(header);
        const textValues = nonNullValues.map(v => String(v));
        const lengths = textValues.map(v => v.length);
        const distribution: Record<string, number> = {};
        textValues.forEach(v => {
          distribution[v] = (distribution[v] || 0) + 1;
        });

        statistics[header] = {
          type: 'text',
          count: nonNullValues.length,
          missing: values.length - nonNullValues.length,
          unique: new Set(textValues).size,
          avgLength: lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0,
          maxLength: lengths.length ? Math.max(...lengths) : 0,
          minLength: lengths.length ? Math.min(...lengths) : 0,
          distribution: Object.entries(distribution).length <= 20
            ? distribution
            : Object.fromEntries(Object.entries(distribution).sort((a, b) => b[1] - a[1]).slice(0, 10)),
        };
      }
    }

    // Generate insights
    const insights: string[] = [];
    const recommendations: string[] = [];

    insights.push(`📊 Dataset "${dataset.name}" contains ${dataset.metadata.rowCount} records with ${dataset.metadata.columnCount} columns.`);

    // Grade-related insights
    const gradeColumns = numericColumns.filter(c =>
      /grade|score|mark|درجة|نتيجة/i.test(c)
    );
    for (const col of gradeColumns) {
      const stats = statistics[col];
      if (stats.mean !== undefined) {
        insights.push(`📈 Average ${col}: ${stats.mean}% (Median: ${stats.median}%, Range: ${stats.min}-${stats.max})`);
        if (stats.mean < 60) {
          insights.push(`⚠️ Warning: Low average ${col} (${stats.mean}%). Class may need additional support.`);
          recommendations.push(`Consider scheduling remedial sessions for students scoring below ${stats.mean}%.`);
        }
        if (stats.stdDev !== undefined && stats.stdDev > 20) {
          insights.push(`📉 High variation in ${col} (σ=${stats.stdDev}). There's significant performance disparity.`);
          recommendations.push('Consider differentiated instruction to address the wide performance gap.');
        }
      }
    }

    // Missing data insights
    const missingColumns = Object.entries(statistics)
      .filter(([, s]) => s.missing > 0)
      .map(([col, s]) => ({ col, missing: s.missing, pct: Math.round((s.missing / dataset.metadata.rowCount) * 100) }));

    if (missingColumns.length > 0) {
      const topMissing = missingColumns.sort((a, b) => b.missing - a.missing).slice(0, 3);
      insights.push(`🔍 Missing data detected in ${missingColumns.length} column(s): ${topMissing.map(m => `${m.col} (${m.pct}%)`).join(', ')}`);
      recommendations.push('Review and clean missing data before running AI analysis.');
    }

    // Distribution insights
    for (const col of textColumns) {
      const stats = statistics[col];
      if (stats.unique && stats.count && stats.unique === 1) {
        insights.push(`📌 Column "${col}" has only one unique value — it may not be useful for analysis.`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Data looks clean and ready for AI analysis. Try: "analyze data" or "batch grade all".');
    }

    return {
      summary: {
        totalRecords: dataset.metadata.rowCount,
        totalColumns: dataset.metadata.columnCount,
        numericColumns,
        textColumns,
      },
      statistics,
      insights,
      recommendations,
    };
  }

  // ===== Filter & Query =====

  /**
   * Filter dataset records based on conditions
   */
  filterRecords(datasetId: string, conditions: FilterCondition[]): DataRecord[] {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) return [];

    return dataset.records.filter(record => {
      return conditions.every(cond => {
        const value = record[cond.column];
        if (value === null || value === undefined) return false;

        const numVal = typeof value === 'number' ? value : Number(value);
        const strVal = String(value).toLowerCase();
        const condVal = typeof cond.value === 'number' ? cond.value : cond.value;
        const condStr = String(condVal).toLowerCase();

        switch (cond.operator) {
          case 'eq': return strVal === condStr;
          case 'neq': return strVal !== condStr;
          case 'gt': return !isNaN(numVal) && numVal > Number(condVal);
          case 'lt': return !isNaN(numVal) && numVal < Number(condVal);
          case 'gte': return !isNaN(numVal) && numVal >= Number(condVal);
          case 'lte': return !isNaN(numVal) && numVal <= Number(condVal);
          case 'contains': return strVal.includes(condStr);
          case 'not_contains': return !strVal.includes(condStr);
          case 'starts_with': return strVal.startsWith(condStr);
          case 'ends_with': return strVal.endsWith(condStr);
          default: return true;
        }
      });
    });
  }

  /**
   * Parse natural language filter into conditions
   */
  parseNaturalFilter(input: string, dataset: DataSet): FilterCondition[] {
    const conditions: FilterCondition[] = [];
    const text = input.toLowerCase();

    // Parse "where/where X > Y" patterns
    const comparisonPatterns = [
      { pattern: /(\w+)\s*(?:greater than|more than|above|>|أكبر من|أعلى من)\s*(\d+)/gi, op: 'gt' as const },
      { pattern: /(\w+)\s*(?:less than|below|under|<|أقل من|أصغر من)\s*(\d+)/gi, op: 'lt' as const },
      { pattern: /(\w+)\s*(?:equals?|is|=|يساوي)\s*["']?([^"'\s]+)/gi, op: 'eq' as const },
      { pattern: /(\w+)\s*(?:contains?|includes?|has|يحتوي)\s*["']?([^"'\s]+)/gi, op: 'contains' as const },
      { pattern: /(\w+)\s*(?:>=|at least|على الأقل)\s*(\d+)/gi, op: 'gte' as const },
      { pattern: /(\w+)\s*(?:<=|at most|على الأكثر)\s*(\d+)/gi, op: 'lte' as const },
    ];

    for (const { pattern, op } of comparisonPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const column = this.findBestColumnMatch(match[1], dataset.headers);
        if (column) {
          conditions.push({
            column,
            operator: op,
            value: isNaN(Number(match[2])) ? match[2] : Number(match[2]),
          });
        }
      }
    }

    return conditions;
  }

  /**
   * Find best matching column name
   */
  private findBestColumnMatch(input: string, headers: string[]): string | null {
    const normalized = input.toLowerCase().replace(/[_\s-]/g, '');
    
    // Exact match
    const exact = headers.find(h => h.toLowerCase() === input.toLowerCase());
    if (exact) return exact;

    // Normalized match
    const normalMatch = headers.find(h => h.toLowerCase().replace(/[_\s-]/g, '') === normalized);
    if (normalMatch) return normalMatch;

    // Partial match
    const partial = headers.find(h => h.toLowerCase().includes(normalized) || normalized.includes(h.toLowerCase()));
    if (partial) return partial;

    return null;
  }

  // ===== Export Operations =====

  /**
   * Export dataset to CSV format
   */
  exportToCSV(datasetId: string): string {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) throw new Error('Dataset not found');

    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const rows = [
      dataset.headers.join(','),
      ...dataset.records.map(record =>
        dataset.headers.map(h => escapeCSV(record[h])).join(',')
      ),
    ];

    return rows.join('\n');
  }

  /**
   * Export dataset to JSON format
   */
  exportToJSON(datasetId: string): string {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) throw new Error('Dataset not found');
    return JSON.stringify(dataset.records, null, 2);
  }

  /**
   * Download data as file
   */
  downloadAsFile(content: string, filename: string, mimeType: string): void {
    if (typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ===== Dataset Management =====

  getDataset(id: string): DataSet | undefined {
    return this.datasets.get(id);
  }

  getLastDataset(): DataSet | undefined {
    const entries = [...this.datasets.values()];
    return entries[entries.length - 1];
  }

  getAllDatasets(): DataSet[] {
    return [...this.datasets.values()];
  }

  deleteDataset(id: string): boolean {
    const result = this.datasets.delete(id);
    this.saveToStorage();
    return result;
  }

  /**
   * Add records from preview data (dashboard preview rows)
   */
  importFromPreview(records: Record<string, unknown>[], name: string): DataSet {
    const cleanRecords: DataRecord[] = records.map(r => {
      const clean: DataRecord = {};
      for (const [k, v] of Object.entries(r)) {
        if (v === null || v === undefined) clean[k] = null;
        else if (typeof v === 'number' || typeof v === 'boolean') clean[k] = v;
        else clean[k] = String(v);
      }
      return clean;
    });

    const headers = [...new Set(cleanRecords.flatMap(r => Object.keys(r)))];
    const id = `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const dataset: DataSet = {
      id,
      name,
      source: 'api',
      records: cleanRecords,
      headers,
      createdAt: new Date(),
      metadata: {
        rowCount: cleanRecords.length,
        columnCount: headers.length,
        originalFormat: 'api',
        hasHeaders: true,
      },
    };

    this.datasets.set(id, dataset);
    this.saveToStorage();
    return dataset;
  }

  // ===== Storage =====

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const serializable = [...this.datasets.entries()].map(([, ds]) => ({
        ...ds,
        createdAt: ds.createdAt.toISOString(),
      }));
      // Only save metadata, not full data (to avoid quota issues)
      const light = serializable.map(ds => ({
        id: ds.id,
        name: ds.name,
        source: ds.source,
        headers: ds.headers,
        metadata: ds.metadata,
        createdAt: ds.createdAt,
        recordCount: ds.records.length,
      }));
      localStorage.setItem(this.storageKey, JSON.stringify(light));
    } catch {
      // Storage full or unavailable
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        // We only store metadata, so don't try to load full datasets
        // Full data is loaded on demand
      }
    } catch {
      // Storage unavailable
    }
  }

  /**
   * Get formatted analysis text for chat display
   */
  getAnalysisText(analysis: DataAnalysis, lang: 'en' | 'ar' = 'en'): string {
    const lines: string[] = [];

    if (lang === 'ar') {
      lines.push('📊 **تقرير تحليل البيانات**\n');
      lines.push(`- إجمالي السجلات: ${analysis.summary.totalRecords}`);
      lines.push(`- إجمالي الأعمدة: ${analysis.summary.totalColumns}`);
      lines.push(`- الأعمدة الرقمية: ${analysis.summary.numericColumns.join(', ') || 'لا يوجد'}`);
      lines.push(`- الأعمدة النصية: ${analysis.summary.textColumns.join(', ') || 'لا يوجد'}`);
    } else {
      lines.push('📊 **Data Analysis Report**\n');
      lines.push(`- Total Records: ${analysis.summary.totalRecords}`);
      lines.push(`- Total Columns: ${analysis.summary.totalColumns}`);
      lines.push(`- Numeric Columns: ${analysis.summary.numericColumns.join(', ') || 'None'}`);
      lines.push(`- Text Columns: ${analysis.summary.textColumns.join(', ') || 'None'}`);
    }

    lines.push('');

    // Statistics for numeric columns
    for (const [col, stats] of Object.entries(analysis.statistics)) {
      if (stats.type === 'numeric') {
        lines.push(`**${col}:** Mean=${stats.mean}, Median=${stats.median}, Min=${stats.min}, Max=${stats.max}, σ=${stats.stdDev}`);
      }
    }

    lines.push('');

    // Insights
    if (analysis.insights.length > 0) {
      lines.push(lang === 'ar' ? '**🔍 رؤى:**' : '**🔍 Insights:**');
      analysis.insights.forEach(i => lines.push(`  ${i}`));
    }

    lines.push('');

    // Recommendations
    if (analysis.recommendations.length > 0) {
      lines.push(lang === 'ar' ? '**💡 توصيات:**' : '**💡 Recommendations:**');
      analysis.recommendations.forEach(r => lines.push(`  - ${r}`));
    }

    return lines.join('\n');
  }
}
