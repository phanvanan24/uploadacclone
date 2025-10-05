import { 
  QuestionHistoryEntry, 
  QuestionHistoryMetadata, 
  QuestionHistoryExport,
  QuestionRequest,
  questionHistoryEntrySchema
} from "@shared/schema";

const HISTORY_STORAGE_KEY = "questiongen_history";
const METADATA_STORAGE_KEY = "questiongen_history_metadata";
const HISTORY_LIMIT = 20;
const STORAGE_VERSION = "1.0";

export class HistoryManager {
  private static instance: HistoryManager;

  public static getInstance(): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager();
    }
    return HistoryManager.instance;
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
   * Get current metadata or create default
   */
  private getMetadata(): QuestionHistoryMetadata {
    if (!this.isLocalStorageAvailable()) {
      throw new Error("LocalStorage không khả dụng");
    }

    try {
      const metadataStr = localStorage.getItem(METADATA_STORAGE_KEY);
      if (metadataStr) {
        return JSON.parse(metadataStr);
      }
    } catch (error) {
      console.warn("Error reading history metadata:", error);
    }

    // Return default metadata
    const defaultMetadata: QuestionHistoryMetadata = {
      totalEntries: 0,
      lastUpdated: new Date().toISOString(),
      version: STORAGE_VERSION,
    };
    
    this.saveMetadata(defaultMetadata);
    return defaultMetadata;
  }

  /**
   * Save metadata to localStorage
   */
  private saveMetadata(metadata: QuestionHistoryMetadata): void {
    try {
      localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error("Error saving metadata:", error);
      throw new Error("Không thể lưu metadata lịch sử");
    }
  }

  /**
   * Get all history entries
   */
  public getHistoryEntries(): QuestionHistoryEntry[] {
    if (!this.isLocalStorageAvailable()) {
      return [];
    }

    try {
      const historyStr = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!historyStr) {
        return [];
      }

      const entries = JSON.parse(historyStr) as QuestionHistoryEntry[];
      
      // Validate entries
      const validEntries = entries.filter(entry => {
        try {
          questionHistoryEntrySchema.parse(entry);
          return true;
        } catch {
          console.warn("Invalid history entry found:", entry.id);
          return false;
        }
      });

      // Sort by createdAt (newest first)
      return validEntries.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error("Error loading history:", error);
      return [];
    }
  }

  /**
   * Get a specific history entry by ID
   */
  public getHistoryEntry(id: string): QuestionHistoryEntry | null {
    const entries = this.getHistoryEntries();
    return entries.find(entry => entry.id === id) || null;
  }

  /**
   * Save a new history entry (auto-save after generation)
   */
  public saveHistoryEntry(questionRequest: QuestionRequest): QuestionHistoryEntry {
    if (!questionRequest.generatedQuestions?.length) {
      throw new Error("Không có câu hỏi để lưu");
    }

    const entries = this.getHistoryEntries();
    
    // Create new entry
    const newEntry: QuestionHistoryEntry = {
      id: questionRequest.id || `gen_${Date.now()}`,
      subject: questionRequest.subject,
      difficulty: questionRequest.difficulty,
      topic: questionRequest.topic,
      requirements: questionRequest.requirements || undefined,
      questionTypes: questionRequest.questionTypes,
      questionCount: questionRequest.questionCount,
      generatedQuestions: questionRequest.generatedQuestions,
      createdAt: questionRequest.createdAt?.toISOString() || new Date().toISOString(),
    };

    // Validate the new entry
    questionHistoryEntrySchema.parse(newEntry);

    // Remove entry if it already exists (replace with new)
    const filteredEntries = entries.filter(entry => entry.id !== newEntry.id);

    // Add new entry at the beginning
    const updatedEntries = [newEntry, ...filteredEntries];

    // Maintain history limit
    const limitedEntries = updatedEntries.slice(0, HISTORY_LIMIT);

    // Save to localStorage
    this.saveEntries(limitedEntries);

    return newEntry;
  }

  /**
   * Manually save with custom name
   */
  public saveWithCustomName(questionRequest: QuestionRequest, customName: string): QuestionHistoryEntry {
    const entry = this.saveHistoryEntry(questionRequest);
    return this.updateCustomName(entry.id, customName);
  }

  /**
   * Update custom name for an entry
   */
  public updateCustomName(entryId: string, customName: string): QuestionHistoryEntry {
    const entries = this.getHistoryEntries();
    const entryIndex = entries.findIndex(entry => entry.id === entryId);
    
    if (entryIndex === -1) {
      throw new Error("Không tìm thấy mục trong lịch sử");
    }

    entries[entryIndex] = {
      ...entries[entryIndex],
      customName: customName.trim() || undefined,
      savedAt: new Date().toISOString(),
    };

    this.saveEntries(entries);
    return entries[entryIndex];
  }

  /**
   * Delete a specific history entry
   */
  public deleteHistoryEntry(entryId: string): boolean {
    const entries = this.getHistoryEntries();
    const filteredEntries = entries.filter(entry => entry.id !== entryId);
    
    if (filteredEntries.length === entries.length) {
      return false; // Entry not found
    }

    this.saveEntries(filteredEntries);
    return true;
  }

  /**
   * Clear all history
   */
  public clearAllHistory(): void {
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      const metadata: QuestionHistoryMetadata = {
        totalEntries: 0,
        lastUpdated: new Date().toISOString(),
        version: STORAGE_VERSION,
      };
      this.saveMetadata(metadata);
    } catch (error) {
      console.error("Error clearing history:", error);
      throw new Error("Không thể xóa lịch sử");
    }
  }

  /**
   * Search history entries
   */
  public searchHistory(query: string): QuestionHistoryEntry[] {
    if (!query.trim()) {
      return this.getHistoryEntries();
    }

    const entries = this.getHistoryEntries();
    const searchTerm = query.toLowerCase().trim();

    return entries.filter(entry => 
      entry.subject.toLowerCase().includes(searchTerm) ||
      entry.topic.toLowerCase().includes(searchTerm) ||
      (entry.customName && entry.customName.toLowerCase().includes(searchTerm)) ||
      (entry.requirements && entry.requirements.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Filter history by subject
   */
  public filterBySubject(subject: string): QuestionHistoryEntry[] {
    const entries = this.getHistoryEntries();
    return entries.filter(entry => entry.subject === subject);
  }

  /**
   * Export history data
   */
  public exportHistory(): QuestionHistoryExport {
    const entries = this.getHistoryEntries();
    const metadata = this.getMetadata();

    return {
      metadata,
      entries,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Import history data
   */
  public importHistory(exportData: QuestionHistoryExport, mergeWithExisting = true): {
    success: boolean;
    importedCount: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let importedCount = 0;

    try {
      // Validate export data structure
      if (!exportData.entries || !Array.isArray(exportData.entries)) {
        throw new Error("Dữ liệu import không hợp lệ");
      }

      const existingEntries = mergeWithExisting ? this.getHistoryEntries() : [];
      const existingIds = new Set(existingEntries.map(entry => entry.id));

      // Process and validate imported entries
      const validImportedEntries: QuestionHistoryEntry[] = [];
      
      for (const entry of exportData.entries) {
        try {
          // Validate entry
          const validatedEntry = questionHistoryEntrySchema.parse(entry);
          
          // Skip duplicates if merging
          if (!mergeWithExisting || !existingIds.has(entry.id)) {
            validImportedEntries.push(validatedEntry);
            importedCount++;
          }
        } catch (error) {
          errors.push(`Mục ${entry.id}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
        }
      }

      // Combine and limit entries
      const combinedEntries = [...validImportedEntries, ...existingEntries];
      const limitedEntries = combinedEntries
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, HISTORY_LIMIT);

      // Save the imported entries
      this.saveEntries(limitedEntries);

      return {
        success: true,
        importedCount,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        importedCount: 0,
        errors: [error instanceof Error ? error.message : 'Lỗi import không xác định'],
      };
    }
  }

  /**
   * Get storage statistics
   */
  public getStorageStats(): {
    totalEntries: number;
    storageUsed: number;
    isNearLimit: boolean;
    metadata: QuestionHistoryMetadata;
  } {
    const entries = this.getHistoryEntries();
    const metadata = this.getMetadata();
    
    let storageUsed = 0;
    try {
      const historyStr = localStorage.getItem(HISTORY_STORAGE_KEY) || '[]';
      const metadataStr = localStorage.getItem(METADATA_STORAGE_KEY) || '{}';
      storageUsed = new Blob([historyStr + metadataStr]).size;
    } catch {
      storageUsed = 0;
    }

    return {
      totalEntries: entries.length,
      storageUsed,
      isNearLimit: storageUsed > 4 * 1024 * 1024, // Warning if > 4MB
      metadata,
    };
  }

  /**
   * Private method to save entries array to localStorage
   */
  private saveEntries(entries: QuestionHistoryEntry[]): void {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
      
      const metadata: QuestionHistoryMetadata = {
        totalEntries: entries.length,
        lastUpdated: new Date().toISOString(),
        version: STORAGE_VERSION,
      };
      this.saveMetadata(metadata);
    } catch (error) {
      console.error("Error saving history entries:", error);
      throw new Error("Không thể lưu lịch sử. Có thể do hết dung lượng lưu trữ.");
    }
  }
}

// Export singleton instance
export const historyManager = HistoryManager.getInstance();