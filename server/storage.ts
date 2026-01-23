import type { GeneratedContent, InsertGeneratedContent } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getAllContent(): Promise<GeneratedContent[]>;
  getContent(id: number): Promise<GeneratedContent | undefined>;
  createContent(content: InsertGeneratedContent): Promise<GeneratedContent>;
  deleteContent(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private content: Map<number, GeneratedContent>;
  private nextId: number;

  constructor() {
    this.content = new Map();
    this.nextId = 1;
  }

  async getAllContent(): Promise<GeneratedContent[]> {
    return Array.from(this.content.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getContent(id: number): Promise<GeneratedContent | undefined> {
    return this.content.get(id);
  }

  async createContent(insertContent: InsertGeneratedContent): Promise<GeneratedContent> {
    const id = this.nextId++;
    const content: GeneratedContent = {
      ...insertContent,
      id,
      createdAt: new Date(),
    };
    this.content.set(id, content);
    return content;
  }

  async deleteContent(id: number): Promise<void> {
    this.content.delete(id);
  }
}

export const storage = new MemStorage();
