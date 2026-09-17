const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

process.env.FRONTEND_ORIGIN = "https://compmasone.ru";

const { requireRole } = require("../src/middleware/auth");

function fakeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("middleware.requireRole", () => {
  it("calls next() when the user role is allowed", () => {
    const res = fakeRes();
    let nextCalled = false;
    requireRole(["admin", "manager"])({ user: { role: "manager" } }, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
  });

  it("responds 403 when the user role is not allowed", () => {
    const res = fakeRes();
    let nextCalled = false;
    requireRole(["admin"])({ user: { role: "user" } }, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });

  it("responds 403 when there is no authenticated user", () => {
    const res = fakeRes();
    let nextCalled = false;
    requireRole(["admin"])({}, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });
});
