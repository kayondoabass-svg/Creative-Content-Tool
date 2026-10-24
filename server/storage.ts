import type { GeneratedContent, InsertGeneratedContent } from "@shared/schema";
import { randomUUID } from "crypto";
import { RecentContentStore } from "./content-retention";

export interface IStorage {
  getContentByUser(userId: string): Promise<GeneratedContent[]>;
  getContent(id: number): Promise<GeneratedContent | undefined>;
  createContent(content: InsertGeneratedContent): Promise<GeneratedContent>;
  deleteContent(id: number, userId?: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private content: Map<number, GeneratedContent>;
  private nextId: number;

  constructor() {
    this.content = new Map();
    this.nextId = 1;
  }

  async getContentByUser(userId: string): Promise<GeneratedContent[]> {
    return Array.from(this.content.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getContent(id: number): Promise<GeneratedContent | undefined> {
    return this.content.get(id);
  }

  async createContent(insertContent: InsertGeneratedContent): Promise<GeneratedContent> {
    const id = this.nextId++;
    const content: GeneratedContent = {
      ...insertContent,
      userId: insertContent.userId ?? null,
      id,
      createdAt: new Date(),
    };
    this.content.set(id, content);
    return content;
  }

  async deleteContent(id: number, userId?: string): Promise<void> {
    const item = this.content.get(id);
    if (item && userId && item.userId !== userId) return;
    this.content.delete(id);
  }

}

// Recent creations use the application's existing PostgreSQL database.
export class DatabaseStorage extends MemStorage {
  private recent = new RecentContentStore();
  getContentByUser(userId: string) { return this.recent.getContentByUser(userId); }
  getContent(id: number) { return this.recent.getContent(id); }
  createContent(content: InsertGeneratedContent) { return this.recent.createContent(content); }
  deleteContent(id: number, userId?: string) { return this.recent.deleteContent(id, userId); }
  purgeExpired() { return this.recent.purgeExpired(); }
}
export const storage = new DatabaseStorage();
