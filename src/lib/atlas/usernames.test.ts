import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidUsername,
  normalizeUsername,
  usernameCandidates,
  usernameFromIdentity,
} from "./usernames.ts";
import { directPairKey } from "./pair.ts";

describe("usernames", () => {
  it("normalizes and validates", () => {
    assert.equal(normalizeUsername("Ada_Lovelace"), "ada_lovelace");
    assert.equal(isValidUsername("ada"), true);
    assert.equal(isValidUsername("Ad"), false);
    assert.equal(isValidUsername("1ada"), false);
    assert.equal(isValidUsername("ok_name"), true);
  });

  it("builds a letter-starting handle from an identity", () => {
    assert.equal(usernameFromIdentity("Élodie Dupont"), "elodiedupont");
    assert.equal(usernameFromIdentity("42"), "atlas");
  });

  it("produces unique-looking candidates", () => {
    const list = usernameCandidates("Ada", "abcd1234ef");
    assert.equal(list[0], "ada");
    assert.ok(list.every(isValidUsername));
    assert.equal(new Set(list).size, list.length);
  });
});

describe("direct pair key", () => {
  it("is order-independent", () => {
    assert.equal(directPairKey("b", "a"), directPairKey("a", "b"));
  });

  it("rejects a self-chat", () => {
    assert.throws(() => directPairKey("x", "x"));
  });
});
