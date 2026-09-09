import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { encryptSecret, decryptSecret, maskSecret } from "../utils/crypto";

describe("crypto", () => {
  it("encrypt -> decrypt roundtrips", () => {
    const payload = encryptSecret("01234567890");
    assert.equal(decryptSecret(payload), "01234567890");
  });

  it("produces unique ciphertext per call (random IV)", () => {
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    assert.notEqual(a, b);
    assert.equal(decryptSecret(a), decryptSecret(b), "same-value");
  });

  it("handles alphanumeric values like passports", () => {
    const payload = encryptSecret("A12345678");
    assert.equal(decryptSecret(payload), "A12345678");
  });

  it("throws on tampered / malformed payloads", () => {
    assert.throws(() => decryptSecret("bad"), /Invalid encrypted payload/);

    const valid = encryptSecret("01234567890");
    const parts = valid.split(":");
    const tampered = [parts[0], "00".repeat(16), parts[2]].join(":");
    assert.throws(() => decryptSecret(tampered));
  });

  it("masks all but the last 4 characters", () => {
    assert.equal(maskSecret("01234567890"), "*******7890");
    assert.equal(maskSecret("abcdef"), "**cdef");
    assert.equal(maskSecret("abcd"), "****");
    assert.equal(maskSecret(""), "");
  });
});