// أنواع البيانات الخاصة بـ n8n workflows

export interface N8nWorkflow {
  id: string;
  name: string;
  nodes: N8nNode[];
  connections: Record<string, any>;
  settings?: {
    executionOrder?: string;
  };
  staticData?: any;
  tags?: string[];
  active?: boolean;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
}

export interface WorkflowExecutionInput {
  workflowId: string;
  data: Record<string, any>;
  taskId?: number;
}

export interface WorkflowExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionId?: string;
}

export interface TaskWorkflowMapping {
  taskId: number;
  workflowFile: string;
  workflowName: string;
  enabled: boolean;
  config?: Record<string, any>;
}
