const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isUuid } = require("../src/utils/uuid");

// The shared 22P02 guard: every uuid-column lookup in routes/* must reject
// non-UUID input before it reaches PostgreSQL (crash class of 2026-09-22,
// originally found on reviews/product/:id, then closed across
// products/orders/users/reviews).
describe("isUuid", () => {
  it("accepts canonical UUIDs regardless of version or case", () => {
    assert.equal(isUuid("bfea65e9-7d1d-4da2-b44e-25736b9b01ac"), true);
    assert.equal(isUuid("BFEA65E9-7D1D-4DA2-B44E-25736B9B01AC"), true);
    assert.equal(isUuid("11111111-1111-1111-1111-111111111111"), true); // v1-shape
  });

  it("rejects arbitrary strings, empties and non-strings", () => {
    for (const bad of ["not-a-uuid", "", " ", "123e4567", null, undefined, 42, {}, []]) {
      assert.equal(isUuid(bad), false, `expected false for ${JSON.stringify(bad)}`);
    }
  });

  it("rejects injection-shaped and padded values", () => {
    assert.equal(isUuid("bfea65e9-7d1d-4da2-b44e-25736b9b01ac' OR '1'='1"), false);
    assert.equal(isUuid(" bfea65e9-7d1d-4da2-b44e-25736b9b01ac"), false);
    assert.equal(isUuid("bfea65e9-7d1d-4da2-b44e-25736b9b01ac\n"), false);
    assert.equal(isUuid("zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz"), false);
  });
});
