import {
  QuestionBank,
  QuestionBankEntry,
  QuestionBankMetadata,
  QuestionBankExport,
  CreateBankData,
  BankSearchFilters,
  QuestionRequest,
  QuestionHistoryEntry,
  questionBankSchema,
  questionBankEntrySchema,
  createBankSchema
} from "@shared/schema";

const BANKS_STORAGE_KEY = "questiongen_banks";
const BANK_METADATA_STORAGE_KEY = "questiongen_bank_metadata";
const BANK_STORAGE_VERSION = "1.0";
const BANKS_LIMIT = 50;

export class BankManager {
  private static instance: BankManager;

  public static getInstance(): BankManager {
    if (!BankManager.instance) {
      BankManager.instance = new BankManager();
    }
    return BankManager.instance;
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
  private getMetadata(): QuestionBankMetadata {
    if (!this.isLocalStorageAvailable()) {
      throw new Error("LocalStorage không khả dụng");
    }

    try {
      const metadataStr = localStorage.getItem(BANK_METADATA_STORAGE_KEY);
      if (metadataStr) {
        return JSON.parse(metadataStr);
      }
    } catch (error) {
      console.warn("Error reading bank metadata:", error);
    }

    const defaultMetadata: QuestionBankMetadata = {
      totalBanks: 0,
      lastUpdated: new Date().toISOString(),
      version: BANK_STORAGE_VERSION,
    };
    
    this.saveMetadata(defaultMetadata);
    return defaultMetadata;
  }

  /**
   * Save metadata to localStorage
   */
  private saveMetadata(metadata: QuestionBankMetadata): void {
    try {
      localStorage.setItem(BANK_METADATA_STORAGE_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error("Error saving bank metadata:", error);
      throw new Error("Không thể lưu metadata ngân hàng");
    }
  }

  /**
   * Calculate bank metadata from entries
   */
  private calculateBankMetadata(bank: QuestionBank): QuestionBank["metadata"] {
    const totalQuestions = bank.entries.reduce((sum, entry) => sum + entry.questionCount, 0);
    const totalSets = bank.entries.length;

    const difficultyDistribution: Record<string, number> = {};
    const questionTypeDistribution: Record<string, number> = {};

    bank.entries.forEach(entry => {
      // Count difficulty distribution
      difficultyDistribution[entry.difficulty] = (difficultyDistribution[entry.difficulty] || 0) + 1;

      // Count question type distribution
      entry.questionTypes.forEach(type => {
        questionTypeDistribution[type] = (questionTypeDistribution[type] || 0) + 1;
      });
    });

    return {
      totalQuestions,
      totalSets,
      difficultyDistribution,
      questionTypeDistribution,
    };
  }

  /**
   * Get all question banks
   */
  public getBanks(): QuestionBank[] {
    if (!this.isLocalStorageAvailable()) {
      return [];
    }

    try {
      const banksStr = localStorage.getItem(BANKS_STORAGE_KEY);
      if (!banksStr) {
        return [];
      }

      const banks = JSON.parse(banksStr) as QuestionBank[];
      
      // Validate banks
      const validBanks = banks.filter(bank => {
        try {
          questionBankSchema.parse(bank);
          return true;
        } catch {
          console.warn("Invalid bank found:", bank.id);
          return false;
        }
      });

      // Sort by lastModified (newest first)
      return validBanks.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );
    } catch (error) {
      console.error("Error loading banks:", error);
      return [];
    }
  }

  /**
   * Get a specific bank by ID
   */
  public getBank(bankId: string): QuestionBank | null {
    const banks = this.getBanks();
    return banks.find(bank => bank.id === bankId) || null;
  }

  /**
   * Create a new question bank
   */
  public createBank(bankData: CreateBankData): QuestionBank {
    // Validate input
    createBankSchema.parse(bankData);

    const banks = this.getBanks();

    // Check for duplicate names within same subject
    const existingBank = banks.find(
      bank => bank.name.toLowerCase() === bankData.name.toLowerCase() && 
               bank.subject === bankData.subject
    );

    if (existingBank) {
      throw new Error(`Đã tồn tại ngân hàng "${bankData.name}" cho môn học này`);
    }

    const now = new Date().toISOString();
    const newBank: QuestionBank = {
      id: `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: bankData.name.trim(),
      description: bankData.description?.trim(),
      subject: bankData.subject,
      tags: bankData.tags.filter(tag => tag.trim()).map(tag => tag.trim()),
      entries: [],
      createdAt: now,
      lastModified: now,
      metadata: {
        totalQuestions: 0,
        totalSets: 0,
        difficultyDistribution: {},
        questionTypeDistribution: {},
      },
    };

    // Validate the new bank
    questionBankSchema.parse(newBank);

    // Add to banks list
    const updatedBanks = [newBank, ...banks].slice(0, BANKS_LIMIT);
    this.saveBanks(updatedBanks);

    return newBank;
  }

  /**
   * Update an existing bank
   */
  public updateBank(bankId: string, updates: Partial<CreateBankData>): QuestionBank {
    const banks = this.getBanks();
    const bankIndex = banks.findIndex(bank => bank.id === bankId);

    if (bankIndex === -1) {
      throw new Error("Không tìm thấy ngân hàng");
    }

    const existingBank = banks[bankIndex];

    // Check for duplicate names if name is being changed
    if (updates.name && updates.name !== existingBank.name) {
      const duplicateBank = banks.find(
        bank => bank.id !== bankId &&
                bank.name.toLowerCase() === updates.name!.toLowerCase() && 
                bank.subject === (updates.subject || existingBank.subject)
      );

      if (duplicateBank) {
        throw new Error(`Đã tồn tại ngân hàng "${updates.name}" cho môn học này`);
      }
    }

    const updatedBank: QuestionBank = {
      ...existingBank,
      name: updates.name?.trim() || existingBank.name,
      description: updates.description?.trim() || existingBank.description,
      subject: updates.subject || existingBank.subject,
      tags: updates.tags?.filter(tag => tag.trim()).map(tag => tag.trim()) || existingBank.tags,
      lastModified: new Date().toISOString(),
    };

    // Recalculate metadata
    updatedBank.metadata = this.calculateBankMetadata(updatedBank);

    // Validate updated bank
    questionBankSchema.parse(updatedBank);

    banks[bankIndex] = updatedBank;
    this.saveBanks(banks);

    return updatedBank;
  }

  /**
   * Delete a bank
   */
  public deleteBank(bankId: string): boolean {
    const banks = this.getBanks();
    const filteredBanks = banks.filter(bank => bank.id !== bankId);

    if (filteredBanks.length === banks.length) {
      return false; // Bank not found
    }

    this.saveBanks(filteredBanks);
    return true;
  }

  /**
   * Duplicate a bank
   */
  public duplicateBank(bankId: string, newName?: string): QuestionBank {
    const banks = this.getBanks();
    const originalBank = banks.find(bank => bank.id === bankId);

    if (!originalBank) {
      throw new Error("Không tìm thấy ngân hàng để sao chép");
    }

    const baseName = newName || `${originalBank.name} (Copy)`;
    let duplicateName = baseName;
    let counter = 1;

    // Ensure unique name
    while (banks.some(bank => bank.name.toLowerCase() === duplicateName.toLowerCase() && bank.subject === originalBank.subject)) {
      duplicateName = `${baseName} (${counter})`;
      counter++;
    }

    const now = new Date().toISOString();
    const duplicatedBank: QuestionBank = {
      ...originalBank,
      id: `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: duplicateName,
      createdAt: now,
      lastModified: now,
      // Deep copy entries
      entries: originalBank.entries.map(entry => ({
        ...entry,
        id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        addedAt: now,
      })),
    };

    // Recalculate metadata
    duplicatedBank.metadata = this.calculateBankMetadata(duplicatedBank);

    const updatedBanks = [duplicatedBank, ...banks].slice(0, BANKS_LIMIT);
    this.saveBanks(updatedBanks);

    return duplicatedBank;
  }

  /**
   * Add question set to a bank
   */
  public addQuestionSetToBank(bankId: string, questionSet: QuestionRequest | QuestionHistoryEntry, customName?: string): QuestionBankEntry {
    const banks = this.getBanks();
    const bankIndex = banks.findIndex(bank => bank.id === bankId);

    if (bankIndex === -1) {
      throw new Error("Không tìm thấy ngân hàng");
    }

    if (!questionSet.generatedQuestions?.length) {
      throw new Error("Không có câu hỏi để thêm");
    }

    const bank = banks[bankIndex];

    // Create bank entry
    const bankEntry: QuestionBankEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: customName?.trim() || questionSet.topic,
      subject: questionSet.subject,
      difficulty: questionSet.difficulty,
      topic: questionSet.topic,
      requirements: questionSet.requirements || undefined,
      questionTypes: questionSet.questionTypes,
      questionCount: questionSet.questionCount,
      generatedQuestions: questionSet.generatedQuestions,
      tags: [],
      addedAt: new Date().toISOString(),
      originalId: questionSet.id,
    };

    // Validate the entry
    questionBankEntrySchema.parse(bankEntry);

    // Add to bank
    bank.entries.unshift(bankEntry);
    bank.lastModified = new Date().toISOString();
    bank.metadata = this.calculateBankMetadata(bank);

    banks[bankIndex] = bank;
    this.saveBanks(banks);

    return bankEntry;
  }

  /**
   * Remove question set from bank
   */
  public removeQuestionSetFromBank(bankId: string, entryId: string): boolean {
    const banks = this.getBanks();
    const bankIndex = banks.findIndex(bank => bank.id === bankId);

    if (bankIndex === -1) {
      return false;
    }

    const bank = banks[bankIndex];
    const originalLength = bank.entries.length;
    bank.entries = bank.entries.filter(entry => entry.id !== entryId);

    if (bank.entries.length === originalLength) {
      return false; // Entry not found
    }

    bank.lastModified = new Date().toISOString();
    bank.metadata = this.calculateBankMetadata(bank);

    banks[bankIndex] = bank;
    this.saveBanks(banks);

    return true;
  }

  /**
   * Update question set in bank
   */
  public updateQuestionSetInBank(bankId: string, entryId: string, updates: { name?: string; tags?: string[] }): QuestionBankEntry {
    const banks = this.getBanks();
    const bankIndex = banks.findIndex(bank => bank.id === bankId);

    if (bankIndex === -1) {
      throw new Error("Không tìm thấy ngân hàng");
    }

    const bank = banks[bankIndex];
    const entryIndex = bank.entries.findIndex(entry => entry.id === entryId);

    if (entryIndex === -1) {
      throw new Error("Không tìm thấy bộ câu hỏi");
    }

    const updatedEntry: QuestionBankEntry = {
      ...bank.entries[entryIndex],
      name: updates.name?.trim() || bank.entries[entryIndex].name,
      tags: updates.tags?.filter(tag => tag.trim()).map(tag => tag.trim()) || bank.entries[entryIndex].tags,
    };

    // Validate updated entry
    questionBankEntrySchema.parse(updatedEntry);

    bank.entries[entryIndex] = updatedEntry;
    bank.lastModified = new Date().toISOString();

    banks[bankIndex] = bank;
    this.saveBanks(banks);

    return updatedEntry;
  }

  /**
   * Move question set between banks
   */
  public moveQuestionSetBetweenBanks(fromBankId: string, toBankId: string, entryId: string): boolean {
    const banks = this.getBanks();
    const fromBankIndex = banks.findIndex(bank => bank.id === fromBankId);
    const toBankIndex = banks.findIndex(bank => bank.id === toBankId);

    if (fromBankIndex === -1 || toBankIndex === -1) {
      throw new Error("Không tìm thấy ngân hàng");
    }

    const fromBank = banks[fromBankIndex];
    const toBank = banks[toBankIndex];

    const entryIndex = fromBank.entries.findIndex(entry => entry.id === entryId);
    if (entryIndex === -1) {
      throw new Error("Không tìm thấy bộ câu hỏi");
    }

    const entry = fromBank.entries[entryIndex];

    // Remove from source bank
    fromBank.entries.splice(entryIndex, 1);
    fromBank.lastModified = new Date().toISOString();
    fromBank.metadata = this.calculateBankMetadata(fromBank);

    // Add to destination bank
    toBank.entries.unshift(entry);
    toBank.lastModified = new Date().toISOString();
    toBank.metadata = this.calculateBankMetadata(toBank);

    banks[fromBankIndex] = fromBank;
    banks[toBankIndex] = toBank;
    this.saveBanks(banks);

    return true;
  }

  /**
   * Search banks
   */
  public searchBanks(query: string, filters?: BankSearchFilters): QuestionBank[] {
    let banks = this.getBanks();

    // Apply text search
    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      banks = banks.filter(bank =>
        bank.name.toLowerCase().includes(searchTerm) ||
        bank.description?.toLowerCase().includes(searchTerm) ||
        bank.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        bank.entries.some(entry => 
          entry.name.toLowerCase().includes(searchTerm) ||
          entry.topic.toLowerCase().includes(searchTerm)
        )
      );
    }

    // Apply filters
    if (filters) {
      if (filters.subject) {
        banks = banks.filter(bank => bank.subject === filters.subject);
      }

      if (filters.tags?.length) {
        banks = banks.filter(bank =>
          filters.tags!.some(tag => bank.tags.includes(tag))
        );
      }

      if (filters.difficulty) {
        banks = banks.filter(bank =>
          bank.entries.some(entry => entry.difficulty === filters.difficulty)
        );
      }

      if (filters.questionType) {
        banks = banks.filter(bank =>
          bank.entries.some(entry => entry.questionTypes.includes(filters.questionType!))
        );
      }

      if (filters.dateRange) {
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        banks = banks.filter(bank => {
          const bankDate = new Date(bank.createdAt);
          return bankDate >= startDate && bankDate <= endDate;
        });
      }
    }

    return banks;
  }

  /**
   * Get all unique tags across banks
   */
  public getAllTags(): string[] {
    const banks = this.getBanks();
    const tagsSet = new Set<string>();

    banks.forEach(bank => {
      bank.tags.forEach(tag => tagsSet.add(tag));
      bank.entries.forEach(entry => {
        entry.tags.forEach(tag => tagsSet.add(tag));
      });
    });

    return Array.from(tagsSet).sort();
  }

  /**
   * Get banks by subject
   */
  public getBanksBySubject(subject: string): QuestionBank[] {
    return this.getBanks().filter(bank => bank.subject === subject);
  }

  /**
   * Export banks
   */
  public exportBanks(bankIds?: string[]): QuestionBankExport {
    const allBanks = this.getBanks();
    const banksToExport = bankIds ? 
      allBanks.filter(bank => bankIds.includes(bank.id)) : 
      allBanks;

    const metadata = this.getMetadata();

    return {
      metadata: {
        ...metadata,
        totalBanks: banksToExport.length,
      },
      banks: banksToExport,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Import banks
   */
  public importBanks(exportData: QuestionBankExport, mergeWithExisting = true): {
    success: boolean;
    importedCount: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let importedCount = 0;

    try {
      if (!exportData.banks || !Array.isArray(exportData.banks)) {
        throw new Error("Dữ liệu import không hợp lệ");
      }

      const existingBanks = mergeWithExisting ? this.getBanks() : [];
      const existingIds = new Set(existingBanks.map(bank => bank.id));

      const validImportedBanks: QuestionBank[] = [];

      for (const bank of exportData.banks) {
        try {
          const validatedBank = questionBankSchema.parse(bank);

          // Handle ID conflicts
          if (existingIds.has(bank.id)) {
            if (mergeWithExisting) {
              // Generate new ID for imported bank
              validatedBank.id = `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            } else {
              // Skip if not merging
              continue;
            }
          }

          // Handle name conflicts
          const nameConflict = existingBanks.find(
            existing => existing.name.toLowerCase() === validatedBank.name.toLowerCase() &&
                       existing.subject === validatedBank.subject
          );

          if (nameConflict) {
            validatedBank.name = `${validatedBank.name} (Imported)`;
          }

          validImportedBanks.push(validatedBank);
          importedCount++;
        } catch (error) {
          errors.push(`Ngân hàng ${bank.id}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
        }
      }

      const combinedBanks = [...validImportedBanks, ...existingBanks];
      const limitedBanks = combinedBanks
        .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
        .slice(0, BANKS_LIMIT);

      this.saveBanks(limitedBanks);

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
   * Clear all banks
   */
  public clearAllBanks(): void {
    try {
      localStorage.removeItem(BANKS_STORAGE_KEY);
      const metadata: QuestionBankMetadata = {
        totalBanks: 0,
        lastUpdated: new Date().toISOString(),
        version: BANK_STORAGE_VERSION,
      };
      this.saveMetadata(metadata);
    } catch (error) {
      console.error("Error clearing banks:", error);
      throw new Error("Không thể xóa ngân hàng");
    }
  }

  /**
   * Get storage statistics
   */
  public getStorageStats(): {
    totalBanks: number;
    totalQuestionSets: number;
    totalQuestions: number;
    storageUsed: number;
    isNearLimit: boolean;
    metadata: QuestionBankMetadata;
  } {
    const banks = this.getBanks();
    const metadata = this.getMetadata();

    const totalQuestionSets = banks.reduce((sum, bank) => sum + bank.entries.length, 0);
    const totalQuestions = banks.reduce((sum, bank) => sum + bank.metadata.totalQuestions, 0);

    let storageUsed = 0;
    try {
      const banksStr = localStorage.getItem(BANKS_STORAGE_KEY) || '[]';
      const metadataStr = localStorage.getItem(BANK_METADATA_STORAGE_KEY) || '{}';
      storageUsed = new Blob([banksStr + metadataStr]).size;
    } catch {
      storageUsed = 0;
    }

    return {
      totalBanks: banks.length,
      totalQuestionSets,
      totalQuestions,
      storageUsed,
      isNearLimit: storageUsed > 4 * 1024 * 1024, // Warning if > 4MB
      metadata,
    };
  }

  /**
   * Private method to save banks array to localStorage
   */
  private saveBanks(banks: QuestionBank[]): void {
    try {
      localStorage.setItem(BANKS_STORAGE_KEY, JSON.stringify(banks));

      const metadata: QuestionBankMetadata = {
        totalBanks: banks.length,
        lastUpdated: new Date().toISOString(),
        version: BANK_STORAGE_VERSION,
      };
      this.saveMetadata(metadata);
    } catch (error) {
      console.error("Error saving banks:", error);
      throw new Error("Không thể lưu ngân hàng. Có thể do hết dung lượng lưu trữ.");
    }
  }
}

// Export singleton instance
export const bankManager = BankManager.getInstance();