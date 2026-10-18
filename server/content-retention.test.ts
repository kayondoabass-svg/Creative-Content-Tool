import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "./db";
import { RecentContentStore } from "./content-retention";

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
