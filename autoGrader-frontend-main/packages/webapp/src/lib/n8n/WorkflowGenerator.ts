/**
 * Workflow Generator - يولد workflow JSON حقيقي من description + AI Prompt
 * Generates real n8n JSON workflows from task description and AI prompt
 */

export interface TaskInput {
  id: number;
  title: string;
  description: string;
  prompt: string;
  icon: string;
}

export interface GeneratedWorkflow {
  name: string;
  nodes: any[];
  connections: any;
  active: boolean;
  settings: any;
  id: string;
  tags: string[];
}

export class WorkflowGenerator {
  private static instance: WorkflowGenerator;

  private constructor() {}

  static getInstance(): WorkflowGenerator {
    if (!WorkflowGenerator.instance) {
      WorkflowGenerator.instance = new WorkflowGenerator();
    }
    return WorkflowGenerator.instance;
  }

  /**
   * Generate real n8n JSON workflow from task description and AI prompt
   * توليد workflow JSON حقيقي من وصف المهمة و AI Prompt
   */
  async generateWorkflow(task: TaskInput): Promise<GeneratedWorkflow> {
    console.log(`🔧 Generating workflow for: ${task.title}`);

    // Analyze description to determine workflow structure
    const workflowStructure = this.analyzeDescription(task.description);
    
    // Build nodes based on structure
    const nodes = this.buildNodes(task, workflowStructure);
    
    // Build connections between nodes
    const connections = this.buildConnections(nodes);

    const workflow: GeneratedWorkflow = {
      name: `${task.title} Workflow`,
      nodes,
      connections,
      active: true,
      settings: {
        executionOrder: 'v1'
      },
      id: `workflow-${task.id}-${Date.now()}`,
      tags: this.extractTags(task.description)
    };

    console.log(`✅ Workflow generated: ${workflow.id}`);
    return workflow;
  }

  /**
   * Analyze description to determine workflow structure
   * تحليل الوصف لتحديد هيكل workflow
   */
  private analyzeDescription(description: string): any {
    const lower = description.toLowerCase();
    
    return {
      needsDatabase: lower.includes('student') || lower.includes('assignment') || lower.includes('data'),
      needsAI: lower.includes('analyze') || lower.includes('generate') || lower.includes('grade') || lower.includes('feedback'),
      needsTransform: true,
      outputFormat: lower.includes('report') || lower.includes('rubric') ? 'pdf' : 'csv',
      complexity: lower.includes('complex') || lower.includes('comprehensive') ? 'high' : 'medium'
    };
  }

  /**
   * Build workflow nodes based on structure
   * بناء nodes حسب الهيكل
   */
  private buildNodes(task: TaskInput, structure: any): any[] {
    const nodes: any[] = [];
    let yPosition = 300;

    // 1. Start Node (always first)
    nodes.push({
      parameters: {},
      id: `start-${task.id}`,
      name: 'Start',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [250, yPosition]
    });

    // 2. Database Query Node (if needed)
    if (structure.needsDatabase) {
      nodes.push({
        parameters: {
          operation: 'executeQuery',
          query: this.generateDatabaseQuery(task.description),
          options: {}
        },
        id: `mysql-${task.id}`,
        name: 'Fetch Data from Moodle',
        type: 'n8n-nodes-base.mySql',
        typeVersion: 2,
        position: [450, yPosition],
        credentials: {
          mySql: {
            id: 'moodle-db',
            name: 'Moodle Database'
          }
        }
      });
    }

    // 3. AI Processing Node (if needed)
    if (structure.needsAI) {
      nodes.push({
        parameters: {
          url: 'https://api.groq.com/openai/v1/chat/completions',
          method: 'POST',
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: 'Authorization',
                value: 'Bearer {{$env.GROQ_API_KEY}}'
              },
              {
                name: 'Content-Type',
                value: 'application/json'
              }
            ]
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody: JSON.stringify({
            model: 'qwen/qwen3-32b',
            messages: [
              {
                role: 'system',
                content: task.prompt
              },
              {
                role: 'user',
                content: '{{ $json }}'
              }
            ],
            temperature: 0.7,
            max_tokens: 2000
          }),
          options: {}
        },
        id: `ai-${task.id}`,
        name: 'AI Processing (Groq)',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4,
        position: [650, yPosition]
      });
    }

    // 4. Code Node for parsing AI response
    if (structure.needsAI) {
      nodes.push({
        parameters: {
          jsCode: `// Parse AI response
const items = [];
for (const item of $input.all()) {
  const aiResponse = item.json.choices[0].message.content;
  
  // Extract structured data from AI response
  const parsed = {
    original: item.json,
    aiResult: aiResponse,
    timestamp: new Date().toISOString()
  };
  
  items.push({ json: parsed });
}

return items;`
        },
        id: `code-${task.id}`,
        name: 'Parse AI Response',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [850, yPosition]
      });
    }

    // 5. Transform/Set Node
    if (structure.needsTransform) {
      nodes.push({
        parameters: {
          mode: 'manual',
          duplicateItem: false,
          assignments: {
            assignments: this.generateTransformations(task.description)
          },
          options: {}
        },
        id: `set-${task.id}`,
        name: 'Format Output',
        type: 'n8n-nodes-base.set',
        typeVersion: 3,
        position: [1050, yPosition]
      });
    }

    // 6. Export Node (always last)
    nodes.push({
      parameters: {
        operation: 'toFile',
        fileFormat: structure.outputFormat,
        options: {
          fileName: `${task.title.toLowerCase().replace(/\s+/g, '-')}_{{$now.format('YYYY-MM-DD_HH-mm-ss')}}`,
          compression: 'none'
        }
      },
      id: `export-${task.id}`,
      name: `Export to ${structure.outputFormat.toUpperCase()}`,
      type: 'n8n-nodes-base.convertToFile',
      typeVersion: 1,
      position: [1250, yPosition]
    });

    return nodes;
  }

  /**
   * Build connections between nodes
   * بناء الروابط بين nodes
   */
  private buildConnections(nodes: any[]): any {
    const connections: any = {};

    for (let i = 0; i < nodes.length - 1; i++) {
      const currentNode = nodes[i];
      const nextNode = nodes[i + 1];
      
      connections[currentNode.name] = {
        main: [[{
          node: nextNode.name,
          type: 'main',
          index: 0
        }]]
      };
    }

    return connections;
  }

  /**
   * Generate database query based on description
   * توليد استعلام قاعدة البيانات حسب الوصف
   */
  private generateDatabaseQuery(description: string): string {
    const lower = description.toLowerCase();

    if (lower.includes('assignment')) {
      return `SELECT 
        u.id as student_id,
        u.firstname,
        u.lastname,
        u.email,
        a.name as assignment_name,
        s.timemodified,
        s.status
      FROM mdl_user u
      JOIN mdl_assign_submission s ON u.id = s.userid
      JOIN mdl_assign a ON s.assignment = a.id
      ORDER BY s.timemodified DESC
      LIMIT 20`;
    }

    if (lower.includes('student') && lower.includes('performance')) {
      return `SELECT 
        u.id as student_id,
        u.firstname,
        u.lastname,
        u.email,
        AVG(g.finalgrade) as avg_grade,
        COUNT(DISTINCT c.id) as course_count
      FROM mdl_user u
      LEFT JOIN mdl_grade_grades g ON u.id = g.userid
      LEFT JOIN mdl_course c ON g.itemid = c.id
      GROUP BY u.id
      LIMIT 20`;
    }

    if (lower.includes('course')) {
      return `SELECT 
        c.id as course_id,
        c.fullname,
        c.shortname,
        COUNT(DISTINCT ue.userid) as enrolled_students
      FROM mdl_course c
      LEFT JOIN mdl_enrol e ON c.id = e.courseid
      LEFT JOIN mdl_user_enrolments ue ON e.id = ue.enrolid
      GROUP BY c.id
      LIMIT 20`;
    }

    // Default query
    return `SELECT 
      u.id,
      u.firstname,
      u.lastname,
      u.email
    FROM mdl_user u
    WHERE u.deleted = 0
    LIMIT 20`;
  }

  /**
   * Generate transformations for Set node
   * توليد التحويلات لـ Set node
   */
  private generateTransformations(description: string): any[] {
    const lower = description.toLowerCase();
    const transformations: any[] = [];

    if (lower.includes('grade') || lower.includes('score')) {
      transformations.push(
        { name: 'student_name', value: '={{ $json.firstname }} {{ $json.lastname }}', type: 'string' },
        { name: 'grade', value: '={{ $json.aiResult }}', type: 'string' },
        { name: 'feedback', value: '={{ $json.aiResult }}', type: 'string' }
      );
    } else if (lower.includes('analytics') || lower.includes('performance')) {
      transformations.push(
        { name: 'student_id', value: '={{ $json.student_id }}', type: 'number' },
        { name: 'analysis', value: '={{ $json.aiResult }}', type: 'string' },
        { name: 'risk_level', value: '={{ $json.aiResult }}', type: 'string' }
      );
    } else {
      transformations.push(
        { name: 'result', value: '={{ $json.aiResult }}', type: 'string' },
        { name: 'timestamp', value: '={{ $now }}', type: 'string' }
      );
    }

    return transformations;
  }

  /**
   * Extract tags from description
   * استخراج tags من الوصف
   */
  private extractTags(description: string): string[] {
    const tags: string[] = [];
    const lower = description.toLowerCase();

    if (lower.includes('grade') || lower.includes('grading')) tags.push('grading');
    if (lower.includes('student')) tags.push('students');
    if (lower.includes('assignment')) tags.push('assignments');
    if (lower.includes('analytics') || lower.includes('analysis')) tags.push('analytics');
    if (lower.includes('feedback')) tags.push('feedback');
    if (lower.includes('rubric')) tags.push('rubric');
    if (lower.includes('course')) tags.push('courses');

    return tags.length > 0 ? tags : ['general'];
  }

  /**
   * Save generated workflow to file (for development/debugging)
   * حفظ workflow المولد إلى ملف
   */
  async saveWorkflowToFile(workflow: GeneratedWorkflow, taskId: number): Promise<void> {
    const json = JSON.stringify(workflow, null, 2);
    console.log(`📝 Workflow JSON generated for task ${taskId}:`);
    console.log(json);
    
    // In production, this would save to the workflows directory
    // For now, just log it
  }
}
