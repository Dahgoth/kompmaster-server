const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// NOTE: process.env must be set BEFORE require("../src/config") is loaded,
// because config.js reads env at module load time.
process.env.FRONTEND_ORIGIN = "https://compmasone.ru";

describe("hash.verifyPassword", () => {
  it("rejects null or undefined plaintext instead of throwing", async () => {
    const { hashPassword, verifyPassword } = require("../src/utils/hash");
    const hash = await hashPassword("correct-horse");

    assert.equal(await verifyPassword(null, hash), false);
    assert.equal(await verifyPassword(undefined, hash), false);
  });

  it("rejects wrong passwords and accepts the right one", async () => {
    const { hashPassword, verifyPassword } = require("../src/utils/hash");
    const hash = await hashPassword("correct-horse");

    assert.equal(await verifyPassword("correct-horse", hash), true);
    assert.equal(await verifyPassword("wrong-password", hash), false);
  });
});
