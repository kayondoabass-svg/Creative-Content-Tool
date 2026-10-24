import type { Express } from "express";
import type { Pool } from "pg";
import { organizationSettingsSchema, type OrganizationSettings } from "../shared/schema";
import { prepareExactLogo } from "./exactLogoService";

export interface OrganizationSettingsStore {
  get(userId: string): Promise<OrganizationSettings>;
  update(userId: string, settings: Partial<OrganizationSettings>): Promise<OrganizationSettings>;
}

// No migration of the former global logo: its owner cannot be established.
export class PrivateOrganizationSettings implements OrganizationSettingsStore {
  private ready?: Promise<unknown>;
  constructor(private pool: Pool) {}
  private prepare() {
    return this.ready ??= this.pool.query(`CREATE TABLE IF NOT EXISTS teacher_organization_settings (
      user_id text PRIMARY KEY, settings jsonb NOT NULL DEFAULT '{}'::jsonb
    )`).catch(error => { this.ready = undefined; throw error; });
  }
  async get(userId: string): Promise<OrganizationSettings> {
    if (!userId) throw new Error("A settings owner is required.");
    await this.prepare();
    const result = await this.pool.query("SELECT settings FROM teacher_organization_settings WHERE user_id=$1", [userId]);
    return result.rows[0]?.settings ?? {};
  }
  async update(userId: string, settings: Partial<OrganizationSettings>): Promise<OrganizationSettings> {
    if (!userId) throw new Error("A settings owner is required.");
    await this.prepare();
    const result = await this.pool.query(`INSERT INTO teacher_organization_settings(user_id,settings)
      VALUES($1,$2::jsonb) ON CONFLICT(user_id) DO UPDATE
      SET settings=teacher_organization_settings.settings || EXCLUDED.settings RETURNING settings`,
    [userId, JSON.stringify(settings)]);
    return result.rows[0].settings;
  }
}

export function registerOrganizationSettingsRoutes(app: Express, store: OrganizationSettingsStore) {
  app.use("/api/settings", (req, res, next) => {
    const userId = (req as any).session?.userId || (req as any).user?.claims?.sub;
    res.setHeader("Cache-Control", "private, no-store");
    if (!userId) return res.status(401).json({ error: "Please sign in to manage your organisation logo." });
    res.locals.settingsOwner = userId;
    next();
  });
  app.get("/api/settings", async (_req, res) => {
    try {
      res.json(await store.get(res.locals.settingsOwner));
    } catch {
      res.status(500).json({ error: "Failed to fetch organisation settings." });
    }
  });
  app.post("/api/settings", async (req, res) => {
    const parsed = organizationSettingsSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid organisation settings." });
    const settings = parsed.data;
    if (settings.logo) {
      try {
        // Validate with the exact-logo decoder but retain the original compressed
        // bytes. Converting JPEG/WebP to PNG here can exceed generation's upload
        // limit. Exact mode applies rotation/alpha-preserving decoding on reuse.
        await prepareExactLogo(settings.logo);
      } catch (error) {
        return res.status(400).json({ error: (error as Error).message });
      }
    }
    try {
      res.json(await store.update(res.locals.settingsOwner, settings));
    } catch {
      res.status(500).json({ error: "Failed to save organisation settings." });
    }
  });
}
