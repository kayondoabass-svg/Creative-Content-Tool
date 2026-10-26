import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./db";
import { RecentContentStore } from "./content-retention";
import sharp from "sharp";
import { recomposeExactLogo } from "./exactLogoService";
import { generateEducationalImage } from "./educationalImageService";

after(async () => { await pool.end(); });
test("recent creations persist across store instances, stay private, and expire at 24 hours", async () => {
  const owner = `retention-fixture-${randomUUID()}`;
  const other = `retention-other-${randomUUID()}`;
  const first = new RecentContentStore();
  try {
    const created = await first.createContent({ userId: owner, type: "text", title: "Retention fixture", prompt: "fixture", content: "Synthetic test only" });
    const restarted = new RecentContentStore();
    assert.equal((await restarted.getContentByUser(owner))[0].id, created.id);
    assert.equal((await restarted.getContentByUser(other)).length, 0);
    await restarted.deleteContent(created.id, other);
    assert.equal((await restarted.getContent(created.id))?.content, "Synthetic test only");
    await pool.query("UPDATE generated_content SET created_at=(now() AT TIME ZONE 'UTC')-interval '23 hours 59 minutes' WHERE id=$1 AND user_id=$2", [created.id, owner]);
    assert.ok(await restarted.getContent(created.id));
    await pool.query("UPDATE generated_content SET created_at=(now() AT TIME ZONE 'UTC')-interval '24 hours 1 minute' WHERE id=$1 AND user_id=$2", [created.id, owner]);
    assert.equal(await restarted.getContent(created.id), undefined);
    assert.equal((await restarted.getContentByUser(owner)).length, 0);
  } finally {
    // Only remove this test's own synthetic rows, never anyone's account/content.
    await pool.query("DELETE FROM generated_content WHERE user_id=$1", [owner]);
  }
});

test("editable sources are private, durable, bounded, and deleted with their design", async () => {
  const owner = `logo-fixture-${randomUUID()}`;
  const first = new RecentContentStore();
  const image = (await sharp({ create: { width: 40, height: 40, channels: 4, background: "#ffffff" } }).png().toBuffer()).toString("base64");
  const sources = { backgrounds: [image], logo: `data:image/png;base64,${image}` };
  const insert = { userId: owner, type: "image", title: "Logo fixture", prompt: "fixture", content: JSON.stringify({ b64_json: image, options: { logoMode: "exact" } }) };
  try {
    const created = await first.createContent(insert, sources);
    assert.equal(JSON.parse(created.content).logoEditable, true);
    assert.equal(JSON.parse(created.content).logoSources, undefined);
    const restarted = new RecentContentStore();
    assert.deepEqual(await restarted.getLogoSources(created.id, owner), sources);
    assert.equal(await restarted.getLogoSources(created.id, "other-owner"), undefined);
    assert.equal(await restarted.updateLogoComposition(created.id, "other-owner", "{}"), undefined);
    const composed = await recomposeExactLogo(sources, { logoPosition: "bottom-left", logoWidthPercent: 30, logoMarginPercent: 0 });
    const saved = await restarted.updateLogoComposition(created.id, owner, JSON.stringify({ b64_json: composed.b64_json, options: { logoMode: "exact" }, logoEditable: true }));
    assert.equal(saved?.createdAt.getTime(), created.createdAt.getTime());
    assert.equal(JSON.parse((await new RecentContentStore().getContent(created.id))!.content).b64_json, composed.b64_json);
    await restarted.deleteContent(created.id, "other-owner");
    assert.ok(await restarted.getLogoSources(created.id, owner));
    // Simulate accumulated source sizes without writing hundreds of MB of assets.
    await pool.query("UPDATE exact_logo_sources SET byte_size=$2 WHERE content_id=$1", [created.id, 128 * 1024 * 1024]);
    const newer = await first.createContent(insert, sources);
    assert.equal(await restarted.getLogoSources(created.id, owner), undefined);
    assert.equal(JSON.parse((await restarted.getContent(created.id))!.content).logoEditable, false);
    assert.ok(await restarted.getContent(created.id)); // finished image survives eviction
    assert.ok(await restarted.getLogoSources(newer.id, owner));
    await restarted.deleteContent(newer.id, owner);
    assert.equal((await pool.query("SELECT content_id FROM exact_logo_sources WHERE content_id=$1", [newer.id])).rowCount, 0);
    const expired = await first.createContent(insert, sources);
    await pool.query("UPDATE generated_content SET created_at=(now() AT TIME ZONE 'UTC')-interval '25 hours' WHERE id=$1", [expired.id]);
    assert.equal(await restarted.getLogoSources(expired.id, owner), undefined);
    assert.equal(await restarted.updateLogoComposition(expired.id, owner, "{}"), undefined);
    await restarted.purgeExpired();
    assert.equal((await pool.query("SELECT content_id FROM exact_logo_sources WHERE content_id=$1", [expired.id])).rowCount, 0);
  } finally {
    await pool.query("DELETE FROM generated_content WHERE user_id=$1", [owner]);
  }
});

test("an oversized generated grid is still delivered and saved without editable sources", async () => {
  const owner = `oversized-logo-fixture-${randomUUID()}`;
  const store = new RecentContentStore();
  const png = await sharp({ create: { width: 80, height: 40, channels: 4, background: "#ffffff" } }).png().toBuffer();
  // Valid PNG with trailing data models large provider images without allocating
  // enormous decoded canvases. Sharp reads the PNG; original source bytes remain
  // large enough for four tiles to exceed the editing-only storage budget.
  const largeBackground = Buffer.concat([png, Buffer.alloc(10 * 1024 * 1024)]).toString("base64");
  let calls = 0;
  try {
    const { logoSources, ...finishedImage } = await generateEducationalImage(
      "Synthetic oversized grid", "", "Oversized grid", { logoMode: "exact", layout: "grid" },
      `data:image/png;base64,${png.toString("base64")}`,
      async () => { calls++; return { data: [{ b64_json: largeBackground }] }; },
    );
    assert.equal(calls, 4);
    const saved = await store.createContent({
      userId: owner, type: "image", prompt: "fixture", title: "Oversized grid",
      content: JSON.stringify(finishedImage),
    }, logoSources);
    const returned = JSON.parse(saved.content);
    assert.equal(returned.b64_json, finishedImage.b64_json);
    assert.deepEqual(returned.images, finishedImage.images);
    assert.equal(returned.logoEditable, false);
    assert.equal(returned.logoSources, undefined);
    assert.equal(await store.getLogoSources(saved.id, owner), undefined);
    assert.equal((await pool.query("SELECT content_id FROM exact_logo_sources WHERE content_id=$1", [saved.id])).rowCount, 0);
    const reloaded = await new RecentContentStore().getContent(saved.id);
    assert.equal(reloaded?.content, saved.content);
  } finally {
    await pool.query("DELETE FROM generated_content WHERE user_id=$1", [owner]);
  }
});
