const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-secret-for-tdd-framework";
process.env.FRONTEND_ORIGIN = "https://compmasone.ru";

const { signToken, verifyToken, signAdminPanelToken, verifyAdminPanelToken } =
  require("../src/utils/jwt");

describe("jwt user tokens", () => {
  it("round-trips sub/login/role", () => {
    const user = { id: 7, login: "admin@example.com", role: "admin" };
    const payload = verifyToken(signToken(user));
    assert.equal(payload.sub, 7);
    assert.equal(payload.login, "admin@example.com");
    assert.equal(payload.role, "admin");
  });

  it("rejects tokens signed with a different secret", () => {
    const jwt = require("jsonwebtoken");
    const forged = jwt.sign({ sub: 7 }, "wrong-secret");
    assert.throws(() => verifyToken(forged));
  });
});

describe("jwt admin-panel tokens", () => {
  it("round-trips the adminPanel flag", () => {
    const payload = verifyAdminPanelToken(signAdminPanelToken({ id: 7 }));
    assert.equal(payload.sub, 7);
    assert.equal(payload.adminPanel, true);
  });

  it("rejects a plain user token that lacks the adminPanel flag", () => {
    const userToken = signToken({ id: 7, login: "a@b.c", role: "admin" });
    assert.throws(() => verifyAdminPanelToken(userToken));
  });
});
