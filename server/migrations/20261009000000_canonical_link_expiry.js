const { effectiveEnd } = require("../link-deadline");

exports.up = async knex => {
  let cursor = 0;
  // Knex runs this migration transactionally, including validation failures.
  for (;;) {
    const links = await knex("links").select("id", "expire_in", "ends_at")
      .whereNotNull("expire_in").where("id", ">", cursor).orderBy("id").limit(500);
    if (!links.length) break;
    for (const link of links) {
      await knex("links").where({ id: link.id }).update({ ends_at: effectiveEnd(link), expire_in: null });
      cursor = link.id;
    }
  }
};

// Older releases already enforce ends_at. Keep the normalized deadline on
// rollback; reconstructing two old deadlines could extend a link's lifetime.
exports.down = async () => {};
