/**
 * Workflow Queue System
 * نظام قائمة انتظار متقدم للـ Workflows
 * 
 * Features:
 * - معالجة متزامنة ديناميكية (Dynamic concurrency)
 * - إدارة أخطاء قوية مع إعادة المحاولة (Retry mechanism)
 * - أولويات للمهام (Priority queue)
 * - حفظ الحالة والاستئناف (State persistence)
 */

export interface QueuedTask {
  id: string;
  workflowId: number;
  priority: number; // 1-10 (10 = highest)
  data: any;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export interface QueueConfig {
  minConcurrent: number; // الحد الأدنى
  maxConcurrent: number; // الحد الأقصى
  adaptiveScaling: boolean; // تكيف تلقائي حسب الأداء
  retryAttempts: number; // عدد محاولات إعادة التنفيذ
  retryDelay: number; // التأخير بين المحاولات (ms)
  timeout: number; // مهلة التنفيذ (ms)
  persistState: boolean; // حفظ الحالة في localStorage
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  currentConcurrency: number;
}

export class WorkflowQueue {
  private static instance: WorkflowQueue;
  private queue: QueuedTask[] = [];
  private processing: Map<string, QueuedTask> = new Map();
  private completed: QueuedTask[] = [];
  private failed: QueuedTask[] = [];
  private config: QueueConfig;
  private isRunning: boolean = false;
  private currentConcurrency: number;
  private processingTimes: number[] = [];
  private stateKey = 'workflow.queue.state';

  private constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxConcurrent: 10,
      minConcurrent: 2,
      adaptiveScaling: true,
      retryAttempts: 3,
      retryDelay: 2000,
      timeout: 60000,
      persistState: true,
      ...config
    };
    this.currentConcurrency = this.config.minConcurrent;

    // استعادة الحالة المحفوظة
    if (this.config.persistState) {
      this.restoreState();
    }
  }

  static getInstance(config?: Partial<QueueConfig>): WorkflowQueue {
    if (!WorkflowQueue.instance) {
      WorkflowQueue.instance = new WorkflowQueue(config);
    }
    return WorkflowQueue.instance;
  }

  /**
   * إضافة مهمة إلى القائمة
   */
  enqueue(
    workflowId: number,
    data: any,
    priority: number = 5,
    maxRetries?: number
  ): string {
    const task: QueuedTask = {
      id: this.generateTaskId(),
      workflowId,
      priority: Math.max(1, Math.min(10, priority)),
      data,
      retries: 0,
      maxRetries: maxRetries ?? this.config.retryAttempts,
      status: 'pending',
      createdAt: new Date()
    };

    this.queue.push(task);
    this.sortQueue();
    this.persistState();

    console.log(`📥 Task enqueued: ${task.id} (priority: ${task.priority})`);

    // بدء المعالجة إذا لم تكن قيد التشغيل
    if (!this.isRunning) {
      this.start();
    }

    return task.id;
  }

  /**
   * بدء معالجة القائمة
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Queue is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Queue started');

    while (this.isRunning && (this.queue.length > 0 || this.processing.size > 0)) {
      // معالجة المهام المتاحة
      await this.processAvailableTasks();

      // انتظار قصير قبل التحقق مرة أخرى
      await this.delay(100);
    }

    this.isRunning = false;
    console.log('⏸️ Queue stopped');
  }

  /**
   * إيقاف القائمة
   */
  stop(): void {
    this.isRunning = false;
    console.log('🛑 Queue stop requested');
  }

  /**
   * إلغاء مهمة محددة
   */
  cancel(taskId: string): boolean {
    // إلغاء من القائمة
    const queueIndex = this.queue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      this.queue[queueIndex].status = 'cancelled';
      this.failed.push(this.queue[queueIndex]);
      this.queue.splice(queueIndex, 1);
      this.persistState();
      return true;
    }

    // إلغاء من المعالجة (سيتم إيقافها في الدورة التالية)
    const processingTask = this.processing.get(taskId);
    if (processingTask) {
      processingTask.status = 'cancelled';
      return true;
    }

    return false;
  }

  /**
   * الحصول على حالة مهمة
   */
  getTaskStatus(taskId: string): QueuedTask | null {
    // البحث في القائمة
    const queued = this.queue.find(t => t.id === taskId);
    if (queued) return queued;

    // البحث في المعالجة
    const processing = this.processing.get(taskId);
    if (processing) return processing;

    // البحث في المكتملة
    const completed = this.completed.find(t => t.id === taskId);
    if (completed) return completed;

    // البحث في الفاشلة
    const failed = this.failed.find(t => t.id === taskId);
    if (failed) return failed;

    return null;
  }

  /**
   * الحصول على إحصائيات القائمة
   */
  getStats(): QueueStats {
    const totalProcessed = this.completed.length + this.failed.length;
    const avgTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
      : 0;

    return {
      pending: this.queue.length,
      processing: this.processing.size,
      completed: this.completed.length,
      failed: this.failed.length,
      cancelled: this.failed.filter(t => t.status === 'cancelled').length,
      totalProcessed,
      averageProcessingTime: Math.round(avgTime),
      successRate: totalProcessed > 0 ? (this.completed.length / totalProcessed) * 100 : 0,
      currentConcurrency: this.currentConcurrency
    };
  }

  /**
   * مسح المهام المكتملة والفاشلة
   */
  clear(): void {
    this.completed = [];
    this.failed = [];
    this.persistState();
    console.log('🧹 Queue cleared');
  }

  /**
   * معالجة المهام المتاحة
   */
  private async processAvailableTasks(): Promise<void> {
    // حساب عدد المهام التي يمكن معالجتها
    const availableSlots = this.currentConcurrency - this.processing.size;

    if (availableSlots <= 0 || this.queue.length === 0) {
      return;
    }

    // أخذ المهام حسب الأولوية
    const tasksToProcess = this.queue.splice(0, availableSlots);

    // بدء معالجة كل مهمة
    for (const task of tasksToProcess) {
      this.processTask(task);
    }
  }

  /**
   * معالجة مهمة واحدة
   */
  private async processTask(task: QueuedTask): Promise<void> {
    task.status = 'processing';
    task.startedAt = new Date();
    this.processing.set(task.id, task);
    this.persistState();

    console.log(`⚙️ Processing task: ${task.id} (workflow: ${task.workflowId})`);

    const startTime = Date.now();

    try {
      // تنفيذ الـ Workflow مع timeout
      const result = await this.executeWithTimeout(task);

      // نجاح
      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;

      this.processing.delete(task.id);
      this.completed.push(task);

      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);

      // الاحتفاظ بآخر 100 وقت فقط
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }

      console.log(`✅ Task completed: ${task.id} (${processingTime}ms)`);

      // تكيف التزامن
      if (this.config.adaptiveScaling) {
        this.adjustConcurrency(true);
      }

    } catch (error: any) {
      console.error(`❌ Task failed: ${task.id}`, error);

      // محاولة إعادة التنفيذ
      if (task.retries < task.maxRetries) {
        task.retries++;
        task.status = 'pending';
        this.processing.delete(task.id);

        console.log(`🔄 Retrying task: ${task.id} (attempt ${task.retries}/${task.maxRetries})`);

        // إعادة إلى القائمة مع تأخير
        await this.delay(this.config.retryDelay * task.retries);
        this.queue.unshift(task); // إضافة في البداية

      } else {
        // فشل نهائي
        task.status = 'failed';
        task.completedAt = new Date();
        task.error = error.message;

        this.processing.delete(task.id);
        this.failed.push(task);

        // تكيف التزامن
        if (this.config.adaptiveScaling) {
          this.adjustConcurrency(false);
        }
      }
    }

    this.persistState();
  }

  /**
   * تنفيذ مع timeout
   */
  private async executeWithTimeout(task: QueuedTask): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Task timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      try {
        // هنا يتم استدعاء الـ Workflow Executor الفعلي
        const result = await this.executeWorkflow(task.workflowId, task.data);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * تنفيذ Workflow (يتم استبداله بالتنفيذ الفعلي)
   */
  private async executeWorkflow(workflowId: number, data: any): Promise<any> {
    // TODO: استدعاء RealWorkflowExecutor هنا
    // هذا مثال بسيط
    const response = await fetch('/api/workflow/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId, data })
    });

    if (!response.ok) {
      throw new Error(`Workflow execution failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * تكيف التزامن حسب الأداء
   */
  private adjustConcurrency(success: boolean): void {
    if (success) {
      // زيادة التزامن عند النجاح
      if (this.currentConcurrency < this.config.maxConcurrent) {
        this.currentConcurrency = Math.min(
          this.currentConcurrency + 1,
          this.config.maxConcurrent
        );
        console.log(`📈 Concurrency increased to ${this.currentConcurrency}`);
      }
    } else {
      // تقليل التزامن عند الفشل
      if (this.currentConcurrency > this.config.minConcurrent) {
        this.currentConcurrency = Math.max(
          this.currentConcurrency - 1,
          this.config.minConcurrent
        );
        console.log(`📉 Concurrency decreased to ${this.currentConcurrency}`);
      }
    }
  }

  /**
   * ترتيب القائمة حسب الأولوية
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // أولوية أعلى أولاً
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // ثم حسب وقت الإنشاء
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * حفظ الحالة
   */
  private persistState(): void {
    if (!this.config.persistState || typeof window === 'undefined') {
      return;
    }

    try {
      const state = {
        queue: this.queue,
        completed: this.completed.slice(-50), // آخر 50 فقط
        failed: this.failed.slice(-50),
        currentConcurrency: this.currentConcurrency,
        timestamp: new Date().toISOString()
      };

      localStorage.setItem(this.stateKey, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist queue state:', error);
    }
  }

  /**
   * استعادة الحالة
   */
  private restoreState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.stateKey);
      if (!stored) return;

      const state = JSON.parse(stored);

      // استعادة المهام المعلقة فقط
      this.queue = state.queue
        .filter((t: QueuedTask) => t.status === 'pending')
        .map((t: QueuedTask) => ({
          ...t,
          createdAt: new Date(t.createdAt)
        }));

      this.currentConcurrency = state.currentConcurrency || this.config.minConcurrent;

      console.log(`♻️ Restored ${this.queue.length} pending tasks from previous session`);
    } catch (error) {
      console.error('Failed to restore queue state:', error);
    }
  }

  /**
   * توليد معرف فريد للمهمة
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * تأخير
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
