import { type QuestionRequest, type InsertQuestionRequest, type GeneratedQuestion } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  createQuestionRequest(request: InsertQuestionRequest): Promise<QuestionRequest>;
  updateQuestionRequest(id: string, generatedQuestions: GeneratedQuestion[]): Promise<QuestionRequest | undefined>;
  getQuestionRequest(id: string): Promise<QuestionRequest | undefined>;
}

export class MemStorage implements IStorage {
  private questionRequests: Map<string, QuestionRequest>;

  constructor() {
    this.questionRequests = new Map();
  }

  async createQuestionRequest(insertRequest: InsertQuestionRequest): Promise<QuestionRequest> {
    const id = randomUUID();
    const request: QuestionRequest = {
      ...insertRequest,
      id,
      requirements: insertRequest.requirements ?? null,
      generatedQuestions: null,
      createdAt: new Date(),
    };
    this.questionRequests.set(id, request);
    return request;
  }

  async updateQuestionRequest(id: string, generatedQuestions: GeneratedQuestion[]): Promise<QuestionRequest | undefined> {
    const request = this.questionRequests.get(id);
    if (!request) return undefined;
    
    const updatedRequest = { ...request, generatedQuestions };
    this.questionRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  async getQuestionRequest(id: string): Promise<QuestionRequest | undefined> {
    return this.questionRequests.get(id);
  }
}

export const storage = new MemStorage();
