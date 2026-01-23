import type { GeneratedContent, InsertGeneratedContent, OrganizationSettings } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getAllContent(): Promise<GeneratedContent[]>;
  getContent(id: number): Promise<GeneratedContent | undefined>;
  createContent(content: InsertGeneratedContent): Promise<GeneratedContent>;
  deleteContent(id: number): Promise<void>;
  getOrganizationSettings(): Promise<OrganizationSettings>;
  updateOrganizationSettings(settings: Partial<OrganizationSettings>): Promise<OrganizationSettings>;
}

export class MemStorage implements IStorage {
  private content: Map<number, GeneratedContent>;
  private nextId: number;
  private organizationSettings: OrganizationSettings;

  constructor() {
    this.content = new Map();
    this.nextId = 1;
    this.organizationSettings = {};
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

  async getOrganizationSettings(): Promise<OrganizationSettings> {
    return this.organizationSettings;
  }

  async updateOrganizationSettings(settings: Partial<OrganizationSettings>): Promise<OrganizationSettings> {
    this.organizationSettings = { ...this.organizationSettings, ...settings };
    return this.organizationSettings;
  }
}

export const storage = new MemStorage();
