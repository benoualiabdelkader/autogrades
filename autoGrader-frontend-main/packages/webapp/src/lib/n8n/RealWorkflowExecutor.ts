/**
 * Real Workflow Executor - ينفذ workflows JSON الحقيقية فقط عند الطلب
 * NO automatic execution - ONLY when user requests
 */

import { WorkflowRegistry } from './WorkflowRegistry';

export interface ExecutionOptions {
  maxConcurrent?: number;
  delayBetweenRequests?: number;
  maxItems?: number;
  onProgress?: (step: string, progress: number) => void;
}

export interface ExecutionResult {
  success: boolean;
  data: any;
  stats: {
    totalProcessed: number;
    successful: number;
    failed: number;
    duration: number;
  };
  outputFile?: string;
  error?: string;
}

export class RealWorkflowExecutor {
  private static instance: RealWorkflowExecutor;
  private registry: WorkflowRegistry;
  private apiKey: string | null = null;
  private isExecuting: boolean = false;

  private constructor() {
    this.registry = WorkflowRegistry.getInstance();
  }

  static getInstance(): RealWorkflowExecutor {
    if (!RealWorkflowExecutor.instance) {
      RealWorkflowExecutor.instance = new RealWorkflowExecutor();
    }
    return RealWorkflowExecutor.instance;
  }

  /**
   * Execute workflow ONLY when user requests
   * تنفيذ workflow فقط عندما يطلب المستخدم
   */
  async executeWorkflow(
    taskId: number,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    // Check if already executing
    if (this.isExecuting) {
      return {
        success: false,
        data: null,
        stats: { totalProcessed: 0, successful: 0, failed: 0, duration: 0 },
        error: 'Another workflow is currently executing. Please wait.'
      };
    }

    // Get workflow from registry (pre-existing JSON file)
    const workflowMeta = this.registry.getWorkflow(taskId);
    if (!workflowMeta) {
      return {
        success: false,
        data: null,
        stats: { totalProcessed: 0, successful: 0, failed: 0, duration: 0 },
        error: `No workflow found for task ${taskId}`
      };
    }

    this.isExecuting = true;
    const startTime = Date.now();

    try {
      console.log(`🚀 Executing workflow: ${workflowMeta.name}`);
      
      // Execute workflow nodes in sequence
      const result = await this.executeWorkflowNodes(
        workflowMeta.workflow,
        options
      );

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: result.data,
        stats: {
          totalProcessed: result.totalProcessed,
          successful: result.successful,
          failed: result.failed,
          duration
        },
        outputFile: result.outputFile
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        data: null,
        stats: { totalProcessed: 0, successful: 0, failed: 0, duration },
        error: error.message
      };

    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Execute workflow nodes from JSON
   * تنفيذ nodes من ملف JSON
   */
  private async executeWorkflowNodes(
    workflow: any,
    options: ExecutionOptions
  ): Promise<any> {
    const { maxConcurrent = 3, delayBetweenRequests = 2, maxItems = 20, onProgress } = options;
    
    const nodes = workflow.nodes;
    
    let currentData: any[] = [];
    let totalProcessed = 0;
    let successful = 0;
    let failed = 0;

    // Execute nodes in order
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const progress = ((i + 1) / nodes.length) * 100;
      
      if (onProgress) {
        onProgress(node.name, progress);
      }

      console.log(`📍 Executing node: ${node.name} (${node.type})`);

      try {
        switch (node.type) {
          case 'n8n-nodes-base.manualTrigger':
          case 'n8n-nodes-base.start':
            // Start node - initialize data
            currentData = [{ json: {} }];
            break;

          case 'n8n-nodes-base.mySql':
            // Database query
            currentData = await this.executeDatabaseQuery(node, currentData);
            totalProcessed = currentData.length;
            break;

          case 'n8n-nodes-base.httpRequest':
            // HTTP request (AI API call)
            const results = await this.executeHttpRequests(
              node,
              currentData.slice(0, maxItems),
              maxConcurrent,
              delayBetweenRequests
            );
            currentData = results.data;
            successful = results.successful;
            failed = results.failed;
            break;

          case 'n8n-nodes-base.code':
            // JavaScript code execution
            currentData = await this.executeCode(node, currentData);
            break;

          case 'n8n-nodes-base.set':
            // Set values
            currentData = this.executeSet(node, currentData);
            break;

          case 'n8n-nodes-base.convertToFile':
            // Export to file
            const outputFile = await this.exportToFile(node, currentData);
            return {
              data: currentData,
              totalProcessed,
              successful,
              failed,
              outputFile
            };

          default:
            console.log(`⚠️ Node type ${node.type} not implemented, skipping...`);
        }

        // Small delay between nodes
        await this.delay(500);

      } catch (error: any) {
        console.error(`❌ Error executing node ${node.name}:`, error);
        failed++;
      }
    }

    return {
      data: currentData,
      totalProcessed,
      successful,
      failed,
      outputFile: null
    };
  }

  /**
   * Execute database query
   */
  private async executeDatabaseQuery(node: any, inputData: any[]): Promise<any[]> {
    try {
      const query = node.parameters.query;
      
      const response = await fetch('/api/moodle/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: '127.0.0.1',
          port: 3307,
          database: 'moodle',
          user: 'root',
          password: '',
          prefix: 'mdl_',
          query
        })
      });

      const result = await response.json();
      
      if (result.success) {
        return result.data.map((row: any) => ({ json: row }));
      }
      
      return [];
    } catch (error) {
      console.error('Database query failed:', error);
      return [];
    }
  }

  /**
   * Execute HTTP requests (AI API calls) in batches
   */
  private async executeHttpRequests(
    node: any,
    data: any[],
    maxConcurrent: number,
    delay: number
  ): Promise<{ data: any[]; successful: number; failed: number }> {
    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < data.length; i += maxConcurrent) {
      const batch = data.slice(i, i + maxConcurrent);
      
      const batchResults = await Promise.all(
        batch.map(item => this.executeSingleHttpRequest(node, item))
      );

      batchResults.forEach(result => {
        if (result.success) {
          results.push(result.data);
          successful++;
        } else {
          failed++;
        }
      });

      // Delay between batches
      if (i + maxConcurrent < data.length) {
        await this.delay(delay * 1000);
      }
    }

    return { data: results, successful, failed };
  }

  /**
   * Execute single HTTP request
   */
  private async executeSingleHttpRequest(node: any, item: any): Promise<any> {
    const itemData = item?.json || {};

    try {
      const params = node.parameters || {};
      const url = this.renderTemplate(params.url || '', itemData);
      const method = params.method || 'POST';
      
      // Build headers
      const headers: any = {};
      if (params.sendHeaders && params.headerParameters?.parameters) {
        params.headerParameters.parameters.forEach((header: any) => {
          if (!header?.name) return;
          headers[header.name] = this.resolveHeaderValue(String(header.value || ''), itemData);
        });
      }

      // Build body
      let body = null;
      const rawBody = params.jsonBody || params.bodyParametersJson;
      if (params.sendBody && rawBody) {
        const renderedBody = this.renderTemplate(String(rawBody), itemData);

        try {
          const parsedBody = JSON.parse(renderedBody);
          body = JSON.stringify(parsedBody);
        } catch (e) {
          body = renderedBody;
        }
      }

      // Keep provider secrets on the server by proxying Groq requests.
      const isGroqChatEndpoint = /api\.groq\.com\/openai\/v1\/chat\/completions/i.test(url);
      const response = isGroqChatEndpoint
        ? await fetch('/api/groq-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body || '{}'
          })
        : await fetch(url, {
            method,
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: body
          });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || `Request failed with status ${response.status}`);
      }

      return {
        success: true,
        data: { json: { ...itemData, ...result } }
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Render n8n-like templates used by JSON workflows.
   * Supports $json.field and $env.GROQ_API_KEY.
   */
  private renderTemplate(template: string, itemData: Record<string, any>): string {
    if (!template) return '';

    let rendered = template.trim();
    if (rendered.startsWith('=')) {
      rendered = rendered.slice(1);
    }

    rendered = rendered.replace(
      /\{\{\s*\$env\.GROQ_API_KEY\s*\}\}/g,
      this.apiKey || ''
    );

    rendered = rendered.replace(
      /\{\{\s*\$json\s*\}\}/g,
      JSON.stringify(itemData)
    );

    rendered = rendered.replace(
      /\{\{\s*\$json\.([a-zA-Z0-9_]+)\s*\}\}/g,
      (_match, key: string) => {
        const value = itemData[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }
    );

    return rendered;
  }

  private resolveHeaderValue(value: string, itemData: Record<string, any>): string {
    return this.renderTemplate(value, itemData);
  }

  /**
   * Execute JavaScript code
   */
  private async executeCode(node: any, data: any[]): Promise<any[]> {
    try {
      const jsCode = node.parameters.jsCode;
      
      // Simple code execution (for parsing AI responses)
      const results = data.map(item => {
        try {
          // For feedback processing, flatten the nested structure
          if (item.json && item.json.choices) {
            // This is an AI response
            const response = item.json.choices?.[0]?.message?.content;
            let feedback;
            try {
              feedback = JSON.parse(response);
            } catch (e) {
              feedback = { feedback_text: response || 'Good work!', strengths: 'N/A', improvements: 'N/A' };
            }
            
            // Flatten the feedback object
            return {
              json: {
                student_id: item.json.student_id || 'N/A',
                student_name: item.json.student_name || 'N/A',
                grade: item.json.grade || 'N/A',
                feedback_text: feedback.feedback_text || feedback.feedback || JSON.stringify(feedback),
                strengths: Array.isArray(feedback.strengths) ? feedback.strengths.join('; ') : (feedback.strengths || 'N/A'),
                improvements: Array.isArray(feedback.improvements) ? feedback.improvements.join('; ') : (feedback.improvements || 'N/A')
              }
            };
          }
          
          // For other code nodes, try to execute
          const $input = { item };
          const $json = item.json;
          
          // Execute code (simplified)
          const func = new Function('$input', '$json', jsCode);
          const result = func($input, $json);
          
          return result[0] || item;
        } catch (error) {
          console.error('Code execution error:', error);
          return item;
        }
      });

      return results;

    } catch (error) {
      console.error('Code node failed:', error);
      return data;
    }
  }

  /**
   * Execute set node
   */
  private executeSet(node: any, data: any[]): any[] {
    try {
      const assignments = node.parameters.assignments?.assignments || [];
      
      return data.map(item => {
        const newData: any = {};
        
        assignments.forEach((assignment: any) => {
          const sourceValue = assignment.value;
          if (typeof sourceValue === 'string') {
            newData[assignment.name] = this.renderTemplate(sourceValue, item?.json || {});
          } else {
            newData[assignment.name] = sourceValue;
          }
        });
        
        return { json: newData };
      });

    } catch (error) {
      console.error('Set node failed:', error);
      return data;
    }
  }

  /**
   * Export to file
   */
  private async exportToFile(node: any, data: any[]): Promise<string> {
    try {
      const fileName = node.parameters.options?.fileName || `output_${Date.now()}`;
      const declaredFormat = node.parameters.fileFormat || node.parameters.options?.fileFormat;
      const format = declaredFormat === 'pdf' || fileName.endsWith('.pdf') ? 'pdf' : 'csv';

      if (format === 'csv') {
        return this.exportToCSV(data, fileName);
      } else {
        return this.exportToPDF(data, fileName);
      }

    } catch (error) {
      console.error('Export failed:', error);
      return '';
    }
  }

  /**
   * Export to CSV
   */
  private exportToCSV(data: any[], fileName: string): string {
    if (!data || data.length === 0) return '';

    const items = data.map(d => d.json || d);
    
    if (items.length === 0) return '';
    
    const headers = Object.keys(items[0]);
    const rows = items.map(item => 
      headers.map(header => {
        const value = item[header];
        
        // Handle different value types
        if (value === null || value === undefined) {
          return '""';
        } else if (typeof value === 'object') {
          // Convert objects to JSON string
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        } else if (typeof value === 'string') {
          // Escape quotes in strings
          return `"${value.replace(/"/g, '""')}"`;
        } else {
          // Numbers, booleans, etc.
          return `"${value}"`;
        }
      }).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
    link.click();

    return url;
  }

  /**
   * Export to PDF (placeholder)
   */
  private exportToPDF(data: any[], fileName: string): string {
    console.log('PDF export not yet implemented');
    return '';
  }

  /**
   * Initialize API key
   */
  private async initializeApiKey(): Promise<void> {
    // Disabled on purpose: API keys must remain server-side only.
    this.apiKey = null;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if executor is busy
   */
  isExecutingWorkflow(): boolean {
    return this.isExecuting;
  }
}
