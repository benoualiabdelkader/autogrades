import type { NextApiRequest, NextApiResponse } from 'next';
import { WorkflowExecutor } from '@/lib/n8n/WorkflowExecutor';
import type { WorkflowExecutionResult } from '@/lib/n8n/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WorkflowExecutionResult>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { workflowFile, inputData, useAPI } = req.body;

    if (!workflowFile) {
      return res.status(400).json({
        success: false,
        error: 'Workflow file is required'
      });
    }

    const executor = new WorkflowExecutor();

    if (useAPI) {
      // تنفيذ عبر n8n API
      const result = await executor.executeWorkflowViaAPI(workflowFile, inputData);
      return res.status(200).json(result);
    } else {
      // تنفيذ محلي
      const workflow = await executor.loadWorkflowFromFile(workflowFile);
      
      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      const result = await executor.executeWorkflowLocally(workflow, inputData);
      return res.status(200).json(result);
    }
  } catch (error: any) {
    console.error('Workflow execution error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
