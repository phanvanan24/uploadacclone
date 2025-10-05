import {
  BatchGenerationRequest,
  BatchGenerationConfig,
  BatchGenerationResult,
  BatchGenerationError,
  BatchTemplate,
  InsertQuestionRequest,
  QuestionRequest,
  batchGenerationRequestSchema,
  batchTemplateSchema
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { HistoryManager } from "@/lib/history-manager";
import { BankManager } from "@/lib/bank-manager";

const BATCH_STORAGE_KEY = "questiongen_batch_requests";
const TEMPLATES_STORAGE_KEY = "questiongen_batch_templates";
const CONCURRENCY_LIMIT = 2; // Maximum concurrent API requests
const RETRY_LIMIT = 3;
const RETRY_DELAY = 5000; // 5 seconds

export interface BatchGeneratorEvents {
  onProgress: (batch: BatchGenerationRequest) => void;
  onComplete: (batch: BatchGenerationRequest) => void;
  onError: (batch: BatchGenerationRequest, error: string) => void;
  onConfigComplete: (batch: BatchGenerationRequest, result: BatchGenerationResult) => void;
  onConfigError: (batch: BatchGenerationRequest, error: BatchGenerationError) => void;
}

export class BatchGenerator {
  private static instance: BatchGenerator;
  private activeBatches = new Map<string, Promise<void>>();
  private eventListeners = new Map<string, Partial<BatchGeneratorEvents>>();
  private historyManager = HistoryManager.getInstance();
  private bankManager = BankManager.getInstance();

  public static getInstance(): BatchGenerator {
    if (!BatchGenerator.instance) {
      BatchGenerator.instance = new BatchGenerator();
    }
    return BatchGenerator.instance;
  }

  /**
   * Check if localStorage is available
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const test = "__localStorage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all batch requests
   */
  public getBatchRequests(): BatchGenerationRequest[] {
    if (!this.isLocalStorageAvailable()) {
      return [];
    }

    try {
      const batchStr = localStorage.getItem(BATCH_STORAGE_KEY);
      if (!batchStr) {
        return [];
      }

      const batches = JSON.parse(batchStr) as BatchGenerationRequest[];
      
      // Validate and sort by creation date
      const validBatches = batches.filter(batch => {
        try {
          batchGenerationRequestSchema.parse(batch);
          return true;
        } catch {
          console.warn("Invalid batch request found:", batch.id);
          return false;
        }
      });

      return validBatches.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error("Error loading batch requests:", error);
      return [];
    }
  }

  /**
   * Save batch requests to localStorage
   */
  private saveBatchRequests(batches: BatchGenerationRequest[]): void {
    try {
      localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(batches));
    } catch (error) {
      console.error("Error saving batch requests:", error);
      throw new Error("Không thể lưu yêu cầu batch");
    }
  }

  /**
   * Get a specific batch request
   */
  public getBatchRequest(batchId: string): BatchGenerationRequest | null {
    const batches = this.getBatchRequests();
    return batches.find(batch => batch.id === batchId) || null;
  }

  /**
   * Create a new batch generation request
   */
  public createBatchRequest(
    name: string,
    configs: BatchGenerationConfig[],
    options: BatchGenerationRequest['options']
  ): BatchGenerationRequest {
    const now = new Date().toISOString();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const batch: BatchGenerationRequest = {
      id: batchId,
      name: name.trim(),
      configs,
      options,
      createdAt: now,
      status: 'pending',
      progress: {
        current: 0,
        total: configs.length,
      },
      results: [],
      errors: [],
    };

    // Validate the batch
    batchGenerationRequestSchema.parse(batch);

    // Save to localStorage
    const batches = this.getBatchRequests();
    const updatedBatches = [batch, ...batches];
    this.saveBatchRequests(updatedBatches);

    return batch;
  }

  /**
   * Update batch request
   */
  private updateBatchRequest(batchId: string, updates: Partial<BatchGenerationRequest>): BatchGenerationRequest {
    const batches = this.getBatchRequests();
    const batchIndex = batches.findIndex(batch => batch.id === batchId);
    
    if (batchIndex === -1) {
      throw new Error("Không tìm thấy batch request");
    }

    batches[batchIndex] = { ...batches[batchIndex], ...updates };
    this.saveBatchRequests(batches);
    
    return batches[batchIndex];
  }

  /**
   * Register event listeners for a batch
   */
  public registerEventListeners(batchId: string, events: Partial<BatchGeneratorEvents>): void {
    this.eventListeners.set(batchId, events);
  }

  /**
   * Unregister event listeners for a batch
   */
  public unregisterEventListeners(batchId: string): void {
    this.eventListeners.delete(batchId);
  }

  /**
   * Emit events for a batch
   */
  private emitEvent<K extends keyof BatchGeneratorEvents>(
    batchId: string,
    event: K,
    ...args: Parameters<BatchGeneratorEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(batchId);
    if (listeners && listeners[event]) {
      try {
        (listeners[event] as any)(...args);
      } catch (error) {
        console.error(`Error in batch event listener ${event}:`, error);
      }
    }
  }

  /**
   * Start batch generation
   */
  public async startBatch(batchId: string): Promise<void> {
    const batch = this.getBatchRequest(batchId);
    if (!batch) {
      throw new Error("Không tìm thấy batch request");
    }

    if (this.activeBatches.has(batchId)) {
      throw new Error("Batch đang được xử lý");
    }

    const batchPromise = this.processBatch(batch);
    this.activeBatches.set(batchId, batchPromise);

    try {
      await batchPromise;
    } finally {
      this.activeBatches.delete(batchId);
    }
  }

  /**
   * Cancel batch generation
   */
  public async cancelBatch(batchId: string): Promise<void> {
    const updatedBatch = this.updateBatchRequest(batchId, { status: 'cancelled' });
    this.emitEvent(batchId, 'onComplete', updatedBatch);
  }

  /**
   * Process batch generation
   */
  private async processBatch(batch: BatchGenerationRequest): Promise<void> {
    try {
      // Update status to processing
      let updatedBatch = this.updateBatchRequest(batch.id, {
        status: 'processing',
        progress: {
          ...batch.progress,
          startedAt: new Date().toISOString(),
        },
      });

      this.emitEvent(batch.id, 'onProgress', updatedBatch);

      // Process configs in batches with concurrency limit
      const configQueue = [...batch.configs];
      const activePromises: Promise<void>[] = [];

      while (configQueue.length > 0 || activePromises.length > 0) {
        // Check if batch was cancelled
        const currentBatch = this.getBatchRequest(batch.id);
        if (currentBatch?.status === 'cancelled') {
          break;
        }

        // Start new configs up to concurrency limit
        while (configQueue.length > 0 && activePromises.length < CONCURRENCY_LIMIT) {
          const config = configQueue.shift()!;
          const promise = this.processConfig(batch.id, config);
          activePromises.push(promise);
        }

        // Wait for at least one to complete
        if (activePromises.length > 0) {
          await Promise.race(activePromises);
          
          // Remove completed promises
          for (let i = activePromises.length - 1; i >= 0; i--) {
            const promise = activePromises[i];
            if (await Promise.race([promise.then(() => true), Promise.resolve(false)])) {
              activePromises.splice(i, 1);
            }
          }
        }
      }

      // Wait for all remaining promises
      await Promise.all(activePromises);

      // Final status update
      const finalBatch = this.getBatchRequest(batch.id);
      if (finalBatch && finalBatch.status !== 'cancelled') {
        const completedCount = finalBatch.results.filter(r => r.status === 'completed').length;
        const failedCount = finalBatch.results.filter(r => r.status === 'failed').length;
        
        const finalStatus = failedCount === 0 ? 'completed' : 
                           completedCount > 0 ? 'completed' : 'failed';

        const finalUpdatedBatch = this.updateBatchRequest(batch.id, {
          status: finalStatus,
          progress: {
            ...finalBatch.progress,
            current: finalBatch.configs.length,
          },
        });

        this.emitEvent(batch.id, 'onComplete', finalUpdatedBatch);

        // Auto-save to bank if configured
        if (finalUpdatedBatch.options.autoSaveToBank && completedCount > 0) {
          await this.autoSaveToBank(finalUpdatedBatch);
        }
      }

    } catch (error) {
      console.error("Error processing batch:", error);
      const errorBatch = this.updateBatchRequest(batch.id, { status: 'failed' });
      this.emitEvent(batch.id, 'onError', errorBatch, error instanceof Error ? error.message : 'Lỗi không xác định');
    }
  }

  /**
   * Process individual config with retry logic
   */
  private async processConfig(batchId: string, config: BatchGenerationConfig): Promise<void> {
    let retryCount = 0;
    let lastError: string = '';

    while (retryCount <= RETRY_LIMIT) {
      try {
        // Update current config in progress
        this.updateBatchRequest(batchId, {
          progress: {
            ...this.getBatchRequest(batchId)!.progress,
            currentConfig: config.name,
          },
        });

        // Convert config to API request format
        const requestData: InsertQuestionRequest = {
          subject: config.subject,
          difficulty: config.difficulty,
          topic: config.topic,
          requirements: config.requirements,
          questionTypes: config.questionTypes,
          questionCount: config.questionCount,
        };

        // Make API request
        const response = await apiRequest('POST', '/api/questions/generate', requestData);
        const questionRequest = await response.json() as QuestionRequest;

        // Create successful result
        const result: BatchGenerationResult = {
          configId: config.id,
          configName: config.name,
          questionRequest,
          status: 'completed',
          createdAt: new Date().toISOString(),
        };

        // Update batch with result
        const batch = this.getBatchRequest(batchId)!;
        const updatedResults = [...batch.results.filter(r => r.configId !== config.id), result];
        const updatedBatch = this.updateBatchRequest(batchId, {
          results: updatedResults,
          progress: {
            ...batch.progress,
            current: updatedResults.filter(r => r.status === 'completed' || r.status === 'failed').length,
          },
        });

        this.emitEvent(batchId, 'onConfigComplete', updatedBatch, result);
        this.emitEvent(batchId, 'onProgress', updatedBatch);

        // Auto-save to history
        try {
          this.historyManager.saveHistoryEntry(questionRequest);
        } catch (historyError) {
          console.warn("Failed to save to history:", historyError);
        }

        return; // Success, exit retry loop

      } catch (error) {
        retryCount++;
        lastError = error instanceof Error ? error.message : 'Lỗi không xác định';
        
        if (retryCount <= RETRY_LIMIT) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount));
        }
      }
    }

    // All retries failed, record error
    const batchError: BatchGenerationError = {
      configId: config.id,
      configName: config.name,
      error: lastError,
      timestamp: new Date().toISOString(),
      retryable: true,
    };

    const failedResult: BatchGenerationResult = {
      configId: config.id,
      configName: config.name,
      questionRequest: {} as QuestionRequest, // Empty placeholder
      status: 'failed',
      error: lastError,
    };

    const batch = this.getBatchRequest(batchId)!;
    const updatedErrors = [...batch.errors, batchError];
    const updatedResults = [...batch.results.filter(r => r.configId !== config.id), failedResult];
    const updatedBatch = this.updateBatchRequest(batchId, {
      errors: updatedErrors,
      results: updatedResults,
      progress: {
        ...batch.progress,
        current: updatedResults.filter(r => r.status === 'completed' || r.status === 'failed').length,
      },
    });

    this.emitEvent(batchId, 'onConfigError', updatedBatch, batchError);
    this.emitEvent(batchId, 'onProgress', updatedBatch);
  }

  /**
   * Auto-save all successful results to a bank
   */
  private async autoSaveToBank(batch: BatchGenerationRequest): Promise<void> {
    if (!batch.options.autoSaveToBank) return;

    try {
      const bank = this.bankManager.getBank(batch.options.autoSaveToBank);
      if (!bank) {
        console.warn("Auto-save bank not found:", batch.options.autoSaveToBank);
        return;
      }

      const successfulResults = batch.results.filter(r => r.status === 'completed');
      
      for (const result of successfulResults) {
        try {
          const entryData = {
            name: result.configName,
            tags: batch.options.commonTags || [],
          };
          
          this.bankManager.addQuestionSetToBank(
            bank.id,
            result.questionRequest,
            entryData.name
          );
        } catch (error) {
          console.warn("Failed to auto-save result to bank:", error);
        }
      }
    } catch (error) {
      console.error("Error in auto-save to bank:", error);
    }
  }

  /**
   * Retry failed configs in a batch
   */
  public async retryFailedConfigs(batchId: string): Promise<void> {
    const batch = this.getBatchRequest(batchId);
    if (!batch) {
      throw new Error("Không tìm thấy batch request");
    }

    const failedResults = batch.results.filter(r => r.status === 'failed');
    if (failedResults.length === 0) {
      return;
    }

    // Reset failed results and errors
    const updatedBatch = this.updateBatchRequest(batchId, {
      status: 'pending',
      results: batch.results.filter(r => r.status !== 'failed'),
      errors: batch.errors.filter(e => !failedResults.some(r => r.configId === e.configId)),
      progress: {
        ...batch.progress,
        current: batch.results.filter(r => r.status === 'completed').length,
      },
    });

    // Start processing again
    await this.startBatch(batchId);
  }

  /**
   * Delete a batch request
   */
  public deleteBatchRequest(batchId: string): boolean {
    const batches = this.getBatchRequests();
    const filteredBatches = batches.filter(batch => batch.id !== batchId);
    
    if (filteredBatches.length === batches.length) {
      return false; // Batch not found
    }

    this.saveBatchRequests(filteredBatches);
    this.unregisterEventListeners(batchId);
    return true;
  }

  /**
   * Get built-in batch templates
   */
  public getBuiltInTemplates(): BatchTemplate[] {
    return [
      {
        id: 'template_difficulty_progression',
        name: 'Cùng chủ đề - 3 độ khó',
        description: 'Tạo câu hỏi cùng chủ đề ở 3 mức độ: dễ, trung bình, khó',
        configs: [
          {
            name: 'Dễ',
            difficulty: 'easy',
            questionTypes: ['multiple_choice'],
            questionCount: 2,
          },
          {
            name: 'Trung bình',
            difficulty: 'medium',
            questionTypes: ['multiple_choice', 'true_false'],
            questionCount: 3,
          },
          {
            name: 'Khó',
            difficulty: 'hard',
            questionTypes: ['essay', 'multiple_choice'],
            questionCount: 2,
          },
        ],
        isBuiltIn: true,
      },
      {
        id: 'template_question_types',
        name: 'Đa dạng loại câu hỏi',
        description: 'Tạo nhiều loại câu hỏi khác nhau cho cùng một chủ đề',
        configs: [
          {
            name: 'Trắc nghiệm',
            difficulty: 'medium',
            questionTypes: ['multiple_choice'],
            questionCount: 4,
          },
          {
            name: 'Đúng/Sai',
            difficulty: 'medium',
            questionTypes: ['true_false'],
            questionCount: 3,
          },
          {
            name: 'Tự luận',
            difficulty: 'medium',
            questionTypes: ['essay'],
            questionCount: 2,
          },
          {
            name: 'Điền từ',
            difficulty: 'medium',
            questionTypes: ['fill_in_blank'],
            questionCount: 3,
          },
        ],
        isBuiltIn: true,
      },
      {
        id: 'template_exam_set',
        name: 'Bộ đề thi hoàn chỉnh',
        description: 'Tạo một bộ đề thi với các phần khác nhau',
        configs: [
          {
            name: 'Phần 1: Trắc nghiệm',
            difficulty: 'medium',
            questionTypes: ['multiple_choice'],
            questionCount: 4,
          },
          {
            name: 'Phần 2: Đúng/Sai',
            difficulty: 'easy',
            questionTypes: ['true_false'],
            questionCount: 3,
          },
          {
            name: 'Phần 3: Tự luận',
            difficulty: 'hard',
            questionTypes: ['essay'],
            questionCount: 2,
          },
        ],
        isBuiltIn: true,
      },
    ];
  }

  /**
   * Get custom templates
   */
  public getCustomTemplates(): BatchTemplate[] {
    if (!this.isLocalStorageAvailable()) {
      return [];
    }

    try {
      const templatesStr = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (!templatesStr) {
        return [];
      }

      const templates = JSON.parse(templatesStr) as BatchTemplate[];
      
      return templates.filter(template => {
        try {
          batchTemplateSchema.parse(template);
          return !template.isBuiltIn;
        } catch {
          console.warn("Invalid template found:", template.id);
          return false;
        }
      });
    } catch (error) {
      console.error("Error loading custom templates:", error);
      return [];
    }
  }

  /**
   * Save a custom template
   */
  public saveCustomTemplate(
    name: string,
    description: string,
    subject: string | undefined,
    configs: Omit<BatchGenerationConfig, 'id' | 'subject' | 'topic'>[]
  ): BatchTemplate {
    const template: BatchTemplate = {
      id: `custom_template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description.trim(),
      subject,
      configs,
      isBuiltIn: false,
    };

    batchTemplateSchema.parse(template);

    const customTemplates = this.getCustomTemplates();
    const updatedTemplates = [template, ...customTemplates];

    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updatedTemplates));
    } catch (error) {
      console.error("Error saving custom template:", error);
      throw new Error("Không thể lưu template");
    }

    return template;
  }

  /**
   * Delete a custom template
   */
  public deleteCustomTemplate(templateId: string): boolean {
    const customTemplates = this.getCustomTemplates();
    const filteredTemplates = customTemplates.filter(template => template.id !== templateId);
    
    if (filteredTemplates.length === customTemplates.length) {
      return false; // Template not found
    }

    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(filteredTemplates));
      return true;
    } catch (error) {
      console.error("Error deleting custom template:", error);
      return false;
    }
  }

  /**
   * Get all templates (built-in + custom)
   */
  public getAllTemplates(): BatchTemplate[] {
    return [...this.getBuiltInTemplates(), ...this.getCustomTemplates()];
  }

  /**
   * Check if a batch is currently active
   */
  public isBatchActive(batchId: string): boolean {
    return this.activeBatches.has(batchId);
  }

  /**
   * Get active batch count
   */
  public getActiveBatchCount(): number {
    return this.activeBatches.size;
  }

  /**
   * Clear completed batches older than specified days
   */
  public clearOldBatches(daysOld: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const batches = this.getBatchRequests();
    const filteredBatches = batches.filter(batch => {
      const batchDate = new Date(batch.createdAt);
      return batchDate > cutoffDate || 
             batch.status === 'processing' || 
             batch.status === 'pending';
    });

    const removedCount = batches.length - filteredBatches.length;
    if (removedCount > 0) {
      this.saveBatchRequests(filteredBatches);
    }

    return removedCount;
  }
}