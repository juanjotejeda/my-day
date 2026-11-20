// Run: pnpm test
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";

process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");

const { encrypt, decrypt } = await import("./crypto.ts");

test("round trips a refresh token", () => {
  const token = "1//abcDEF_refresh-token-example";
  assert.equal(decrypt(encrypt(token)), token);
});

test("ciphertext differs every time", () => {
  assert.notEqual(encrypt("same"), encrypt("same"));
});

test("a tampered payload does not decrypt", () => {
  const payload = Buffer.from(encrypt("secret"), "base64");
  payload[payload.length - 1] ^= 0xff;
  assert.throws(() => decrypt(payload.toString("base64")));
});
