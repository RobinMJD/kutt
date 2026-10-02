const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const path = require("node:path");

assert.equal(process.env.KUTT_DATABASE_DISPOSABLE, "1");
assert.equal(process.env.DB_HOST, "127.0.0.1");
assert.equal(process.env.DB_NAME, "kutt_search_regression");
assert(["pg", "mysql2"].includes(process.env.DB_CLIENT));

const knex = require("../server/knex");
const { createAdminUser } = require("../server/handlers/auth.handler");
const { ROLES } = require("../server/consts");

async function bootstrap(email) {
  const response = {
    status(code) { this.code = code; return this; },
    send(body) { this.body = body; return this; }
  };
  await createAdminUser({ body: { email, password: randomBytes(32).toString("hex") }, isHTML: false }, response);
  return response;
}

(async () => {
  assert.equal(await knex.schema.hasTable("users"), false, "Refuse any initialized database");
  await knex.migrate.latest({ directory: path.join(__dirname, "../server/migrations") });
  const attempts = await Promise.allSettled([
    bootstrap("bootstrap-one@example.invalid"),
    bootstrap("bootstrap-two@example.invalid")
  ]);
  assert.equal(attempts.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(attempts.find(result => result.status === "fulfilled").value.code, 201);
  assert.equal(attempts.find(result => result.status === "rejected").reason.statusCode, 400);
  const users = await knex("users").select("email", "role", "verified");
  assert.equal(users.length, 1);
  assert.equal(users[0].role, ROLES.ADMIN);
  assert.equal(Boolean(users[0].verified), true);
  await assert.rejects(bootstrap("bootstrap-third@example.invalid"), error => error.statusCode === 400);
  console.log(`PASS: ${process.env.DB_CLIENT} concurrent bootstrap creates exactly one administrator`);
})().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(() => knex.destroy());
