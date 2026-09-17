const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

process.env.FRONTEND_ORIGIN = "https://compmasone.ru";

const { adminPanelVerifyLimiter, adminLimiter } = require("../src/middleware/rateLimit");

function fakeReq(user) {
  return { ip: "203.0.113.7", user };
}

function fakeRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    getHeader(name) {
      return this.headers[name];
    },
  };
}

async function invoke(middleware, req) {
  const res = fakeRes();
  let nextCalled = false;
  await middleware(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

describe("middleware.rateLimit admin limiters", () => {
  it("adminPanelVerifyLimiter blocks brute force after max attempts per user", async () => {
    const req = fakeReq({ id: "verify-user" });
    for (let i = 0; i < 10; i++) {
      const { nextCalled } = await invoke(adminPanelVerifyLimiter, req);
      assert.equal(nextCalled, true, `attempt ${i + 1} should pass`);
    }
    const { res, nextCalled } = await invoke(adminPanelVerifyLimiter, req);
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 429);
  });

  it("adminLimiter keys per authenticated user, not per IP", async () => {
    const userA = fakeReq({ id: "admin-a" });
    const userB = fakeReq({ id: "admin-b" });

    for (let i = 0; i < 300; i++) {
      const { nextCalled } = await invoke(adminLimiter, userA);
      assert.equal(nextCalled, true, `admin-a request ${i + 1} should pass`);
    }
    const blocked = await invoke(adminLimiter, userA);
    assert.equal(blocked.nextCalled, false);
    assert.equal(blocked.res.statusCode, 429);

    const other = await invoke(adminLimiter, userB);
    assert.equal(other.nextCalled, true, "admin-b must not be affected by admin-a's quota");
  });
});
