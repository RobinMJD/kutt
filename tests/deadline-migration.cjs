const assert = require("node:assert/strict");
const { legacyTimestamp, effectiveEnd } = require("../server/link-deadline");

module.exports = async knex => {
  const migration = require("../server/migrations/20261009000000_canonical_link_expiry");
  const old = "2030-04-05 12:34:56", deadline = Date.parse("2030-04-05T12:34:56Z");
  assert.equal(legacyTimestamp(new Date(deadline)), deadline, "PostgreSQL/MySQL Date values");
  assert.equal(legacyTimestamp(old), deadline, "SQLite UTC values");
  assert.equal(legacyTimestamp("2030-04-05T14:34:56+02:00"), deadline);
  assert.throws(() => legacyTimestamp("2030-02-30 12:00:00"));
  assert.equal(effectiveEnd({ expire_in: old, ends_at: deadline - 1000 }), deadline - 1000);
  const db = knex;
  // An isolated populated table proves data conversion and transactional refusal.
  await db.schema.createTable("deadline_fixture", table => {
    table.increments("id"); table.string("expire_in"); table.bigInteger("ends_at"); table.string("payload");
  });
  const migrate = () => db.transaction(tx => migration.up(name => {
    assert.equal(name, "links"); return tx("deadline_fixture");
  }));
  await db("deadline_fixture").insert([
    { expire_in: old, ends_at: null, payload: "legacy" },
    { expire_in: old, ends_at: deadline + 1000, payload: "later" },
    { expire_in: old, ends_at: deadline - 1000, payload: "earlier" },
    { expire_in: null, ends_at: deadline + 2000, payload: "absolute" },
    { expire_in: null, ends_at: null, payload: "unlimited" }
  ]);
  await migrate();
  const rows = await db("deadline_fixture").orderBy("id");
  assert.deepEqual(rows.map(row => Number(row.ends_at) || row.ends_at), [deadline, deadline, deadline - 1000, deadline + 2000, null]);
  assert(rows.every(row => row.expire_in === null));
  await migrate(); await migration.down();
  assert.deepEqual(await db("deadline_fixture").orderBy("id"), rows, "Idempotent and downgrade-safe");
  for (let offset = 0; offset < 501; offset += 100) {
    await db("deadline_fixture").insert(Array.from({ length: Math.min(100, 501 - offset) }, () => ({ expire_in: old, payload: "batch" })));
  }
  await migrate();
  assert.equal(Number((await db("deadline_fixture").where({ payload: "batch", ends_at: deadline }).whereNull("expire_in").count("id as n").first()).n), 501, "All migration batches retain their deadlines");
  await db("deadline_fixture").insert([{ expire_in: old, payload: "valid" }, { expire_in: "broken", payload: "invalid" }]);
  const before = await db("deadline_fixture").orderBy("id");
  await assert.rejects(db.transaction(async tx => migration.up(name => tx(name === "links" ? "deadline_fixture" : name))));
  assert.deepEqual(await db("deadline_fixture").orderBy("id"), before, "Bad stored deadlines roll back all normalization");
  await db.schema.dropTable("deadline_fixture");
  console.log("PASS: expiry migration preserves earliest deadline, payloads, nulls, retries and transactional rollback");
};
