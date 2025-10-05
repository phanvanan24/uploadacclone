import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject").notNull(),
  difficulty: text("difficulty").notNull(),
  topic: text("topic").notNull(),
  requirements: text("requirements"),
  questionTypes: json("question_types").$type<string[]>().notNull(),
  questionCount: integer("question_count").notNull(),
  generatedQuestions: json("generated_questions").$type<GeneratedQuestion[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type GeneratedQuestion = {
  id: string;
  type: 'multiple_choice' | 'multiple_choice_reading1' | 'multiple_choice_reading2' | 'true_false' | 'essay' | 'essay_reading' | 'essay_writing' | 'fill_in_blank' | 'matching' | 'ordering';
  question: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  // New fields for expanded question types
  blanks?: string[]; // For fill_in_blank: acceptable answers for the blank
  leftItems?: string[]; // For matching: left column items
  rightItems?: string[]; // For matching: right column items
  correctMatches?: Record<string, string>; // For matching: correct item pairs {leftItem: rightItem}
  items?: string[]; // For ordering: items to be ordered
  correctOrder?: number[]; // For ordering: correct order indices
  // New fields for complex true/false format
  statements?: string[]; // For complex true_false: array of statements to evaluate
  statementAnswers?: boolean[]; // For complex true_false: true/false answers for each statement
  statementExplanations?: string[]; // For complex true_false: explanations for each statement
  // New fields for cloze test (multiple_choice_reading1)
  passage?: string; // For reading comprehension: the passage to read
  clozeBlanks?: Array<{
    number: number;
    options: string[];
    correctAnswer: string;
  }>; // For cloze test: each blank's options and correct answer
  // New fields for reading comprehension (multiple_choice_reading2)
  readingQuestions?: Array<{
    number: number;
    question: string;
    options: string[];
    correctAnswer: string;
  }>; // For reading comprehension: separate questions about the passage
};

export const insertQuestionRequestSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
  generatedQuestions: true,
}).extend({
  subject: z.string().min(1, "Vui lòng chọn môn học"),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
  topic: z.string().min(1, "Vui lòng nhập chủ đề"),
  requirements: z.string().optional(),
  questionTypes: z.array(z.enum(["multiple_choice", "multiple_choice_reading1", "multiple_choice_reading2", "true_false", "essay", "essay_reading", "essay_writing", "fill_in_blank", "matching", "ordering"])).min(1, "Vui lòng chọn ít nhất một loại câu hỏi"),
  questionCount: z.number().min(1).max(8),
});

export type InsertQuestionRequest = z.infer<typeof insertQuestionRequestSchema>;
export type QuestionRequest = typeof questions.$inferSelect;

// History data types for localStorage
export type QuestionHistoryEntry = {
  id: string;
  customName?: string;
  subject: string;
  difficulty: string;
  topic: string;
  requirements?: string;
  questionTypes: string[];
  questionCount: number;
  generatedQuestions: GeneratedQuestion[];
  createdAt: string; // ISO string for localStorage
  savedAt?: string; // ISO string for manual saves
};

export type QuestionHistoryMetadata = {
  totalEntries: number;
  lastUpdated: string;
  version: string;
};

export const questionHistoryEntrySchema = z.object({
  id: z.string(),
  customName: z.string().optional(),
  subject: z.string(),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
  topic: z.string(),
  requirements: z.string().optional(),
  questionTypes: z.array(z.enum(["multiple_choice", "true_false", "essay", "fill_in_blank", "matching", "ordering"])),
  questionCount: z.number(),
  generatedQuestions: z.array(z.object({
    id: z.string(),
    type: z.enum(['multiple_choice', 'true_false', 'essay', 'fill_in_blank', 'matching', 'ordering']),
    question: z.string(),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().optional(),
    explanation: z.string().optional(),
    // New fields for expanded question types
    blanks: z.array(z.string()).optional(), // For fill_in_blank: acceptable answers for the blank
    leftItems: z.array(z.string()).optional(), // For matching: left column items
    rightItems: z.array(z.string()).optional(), // For matching: right column items
    correctMatches: z.record(z.string()).optional(), // For matching: correct item pairs {leftItem: rightItem}
    items: z.array(z.string()).optional(), // For ordering: items to be ordered
    correctOrder: z.array(z.number()).optional(), // For ordering: correct order indices
    // New fields for complex true/false format
    statements: z.array(z.string()).optional(), // For complex true_false: array of statements to evaluate
    statementAnswers: z.array(z.boolean()).optional(), // For complex true_false: true/false answers for each statement
    statementExplanations: z.array(z.string()).optional(), // For complex true_false: explanations for each statement
  })),
  createdAt: z.string(),
  savedAt: z.string().optional(),
});

export type QuestionHistoryExport = {
  metadata: QuestionHistoryMetadata;
  entries: QuestionHistoryEntry[];
  exportedAt: string;
};

// Question Bank data types for localStorage
export type QuestionBankEntry = {
  id: string;
  name: string;
  subject: string;
  difficulty: string;
  topic: string;
  requirements?: string;
  questionTypes: string[];
  questionCount: number;
  generatedQuestions: GeneratedQuestion[];
  tags: string[];
  addedAt: string; // ISO string
  originalId?: string; // Reference to history entry if applicable
};

export type QuestionBank = {
  id: string;
  name: string;
  description?: string;
  subject: string;
  tags: string[];
  entries: QuestionBankEntry[];
  createdAt: string; // ISO string
  lastModified: string; // ISO string
  isTemplate?: boolean;
  metadata: {
    totalQuestions: number;
    totalSets: number;
    difficultyDistribution: Record<string, number>;
    questionTypeDistribution: Record<string, number>;
  };
};

export type QuestionBankMetadata = {
  totalBanks: number;
  lastUpdated: string;
  version: string;
};

export const questionBankEntrySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Tên bộ câu hỏi không được để trống"),
  subject: z.string(),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
  topic: z.string(),
  requirements: z.string().optional(),
  questionTypes: z.array(z.enum(["multiple_choice", "true_false", "essay", "fill_in_blank", "matching", "ordering"])),
  questionCount: z.number(),
  generatedQuestions: z.array(z.object({
    id: z.string(),
    type: z.enum(['multiple_choice', 'true_false', 'essay', 'fill_in_blank', 'matching', 'ordering']),
    question: z.string(),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().optional(),
    explanation: z.string().optional(),
    blanks: z.array(z.string()).optional(),
    leftItems: z.array(z.string()).optional(),
    rightItems: z.array(z.string()).optional(),
    correctMatches: z.record(z.string()).optional(),
    items: z.array(z.string()).optional(),
    correctOrder: z.array(z.number()).optional(),
    // New fields for complex true/false format
    statements: z.array(z.string()).optional(),
    statementAnswers: z.array(z.boolean()).optional(),
    statementExplanations: z.array(z.string()).optional(),
  })),
  tags: z.array(z.string()),
  addedAt: z.string(),
  originalId: z.string().optional(),
});

export const questionBankSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Tên ngân hàng không được để trống"),
  description: z.string().optional(),
  subject: z.string(),
  tags: z.array(z.string()),
  entries: z.array(questionBankEntrySchema),
  createdAt: z.string(),
  lastModified: z.string(),
  isTemplate: z.boolean().optional(),
  metadata: z.object({
    totalQuestions: z.number(),
    totalSets: z.number(),
    difficultyDistribution: z.record(z.number()),
    questionTypeDistribution: z.record(z.number()),
  }),
});

export const createBankSchema = z.object({
  name: z.string().min(1, "Tên ngân hàng không được để trống").max(100, "Tên quá dài"),
  description: z.string().max(500, "Mô tả quá dài").optional(),
  subject: z.string().min(1, "Vui lòng chọn môn học"),
  tags: z.array(z.string()).default([]),
});

export type CreateBankData = z.infer<typeof createBankSchema>;

export type QuestionBankExport = {
  metadata: QuestionBankMetadata;
  banks: QuestionBank[];
  exportedAt: string;
};

export type BankSearchFilters = {
  subject?: string;
  tags?: string[];
  difficulty?: string;
  questionType?: string;
  dateRange?: {
    start: string;
    end: string;
  };
};

// Batch Generation Types
export type BatchGenerationConfig = {
  id: string;
  name: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  topic: string;
  requirements?: string;
  questionTypes: ('multiple_choice' | 'true_false' | 'essay' | 'fill_in_blank' | 'matching' | 'ordering')[];
  questionCount: number;
};

export type BatchGenerationRequest = {
  id: string;
  name: string;
  configs: BatchGenerationConfig[];
  options: {
    autoSaveToBank?: string; // Bank ID to auto-save to
    commonTags?: string[];
    generateVariations?: boolean;
    randomizeTopics?: boolean;
    exportAsPackage?: boolean;
  };
  createdAt: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';
  progress: {
    current: number;
    total: number;
    currentConfig?: string;
    startedAt?: string;
    estimatedCompletion?: string;
  };
  results: BatchGenerationResult[];
  errors: BatchGenerationError[];
};

export type BatchGenerationResult = {
  configId: string;
  configName: string;
  questionRequest: QuestionRequest;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt?: string;
  error?: string;
};

export type BatchGenerationError = {
  configId: string;
  configName: string;
  error: string;
  timestamp: string;
  retryable: boolean;
};

export type BatchTemplate = {
  id: string;
  name: string;
  description: string;
  subject?: string; // If undefined, applies to all subjects
  configs: Omit<BatchGenerationConfig, 'id' | 'subject' | 'topic'>[];
  isBuiltIn: boolean;
};

export const batchGenerationConfigSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Tên cấu hình không được để trống"),
  subject: z.string().min(1, "Vui lòng chọn môn học"),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
  topic: z.string().min(1, "Vui lòng nhập chủ đề"),
  requirements: z.string().optional(),
  questionTypes: z.array(z.enum(["multiple_choice", "true_false", "essay", "fill_in_blank", "matching", "ordering"])).min(1, "Vui lòng chọn ít nhất một loại câu hỏi"),
  questionCount: z.number().min(1).max(8),
});

export const batchGenerationRequestSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Tên batch không được để trống"),
  configs: z.array(batchGenerationConfigSchema).min(1, "Cần ít nhất một cấu hình"),
  options: z.object({
    autoSaveToBank: z.string().optional(),
    commonTags: z.array(z.string()).default([]),
    generateVariations: z.boolean().default(false),
    randomizeTopics: z.boolean().default(false),
    exportAsPackage: z.boolean().default(false),
  }),
  createdAt: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled', 'failed']),
  progress: z.object({
    current: z.number(),
    total: z.number(),
    currentConfig: z.string().optional(),
    startedAt: z.string().optional(),
    estimatedCompletion: z.string().optional(),
  }),
  results: z.array(z.object({
    configId: z.string(),
    configName: z.string(),
    questionRequest: z.any(), // Will be validated as QuestionRequest
    status: z.enum(['pending', 'processing', 'completed', 'failed']),
    createdAt: z.string().optional(),
    error: z.string().optional(),
  })),
  errors: z.array(z.object({
    configId: z.string(),
    configName: z.string(),
    error: z.string(),
    timestamp: z.string(),
    retryable: z.boolean(),
  })),
});

export const batchTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Tên template không được để trống"),
  description: z.string(),
  subject: z.string().optional(),
  configs: z.array(batchGenerationConfigSchema.omit({ id: true, subject: true, topic: true })),
  isBuiltIn: z.boolean().default(false),
});

export type BatchGenerationOptions = {
  autoSaveToBank?: string;
  commonTags?: string[];
  generateVariations?: boolean;
  randomizeTopics?: boolean;
  exportAsPackage?: boolean;
};
