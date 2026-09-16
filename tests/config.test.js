const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

function freshConfig() {
  delete require.cache[require.resolve("../src/config")];
  return require("../src/config");
}

function withEnv(vars, fn) {
  const saved = {};
  for (const key of Object.keys(vars)) {
    saved[key] = process.env[key];
    const v = vars[key];
    if (v === undefined) delete process.env[key];
    else process.env[key] = v;
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    delete require.cache[require.resolve("../src/config")];
  }
}

describe("config.frontendOrigin (fail-closed allowlist)", () => {
  it("accepts a single explicit origin", () => {
    withEnv({ FRONTEND_ORIGIN: "https://compmasone.ru" }, () => {
      assert.equal(freshConfig().frontendOrigin, "https://compmasone.ru");
    });
  });

  it("accepts multiple origins preserving order", () => {
    withEnv(
      { FRONTEND_ORIGIN: "https://a.example, https://b.example" },
      () => {
        assert.equal(
          freshConfig().frontendOrigin,
          "https://a.example,https://b.example"
        );
      }
    );
  });

  it("rejects wildcard '*' at startup", () => {
    withEnv({ FRONTEND_ORIGIN: "*" }, () => {
      assert.throws(() => freshConfig(), /not an allowed explicit origin/);
    });
  });

  it("rejects origins with a path suffix", () => {
    withEnv({ FRONTEND_ORIGIN: "https://compmasone.ru/shop" }, () => {
      assert.throws(() => freshConfig(), /not an allowed explicit origin/);
    });
  });

  it("rejects an empty allowlist", () => {
    withEnv({ FRONTEND_ORIGIN: "" }, () => {
      assert.throws(() => freshConfig(), /at least one origin/);
    });
  });
});
