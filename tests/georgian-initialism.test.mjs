import test from "node:test";
import assert from "node:assert/strict";
import { composeGeorgianInitialism } from "../src/georgian-initialism.js";

test("joins spoken English letter names without internal hyphens", () => {
  assert.equal(composeGeorgianInitialism(["პი", "ეიჩ", "პი"]), "პიეიჩპი");
  assert.equal(composeGeorgianInitialism(["სი", "ენ", "ენ"]), "სიენენ");
});

test("rejects empty, Latin-script, and pre-hyphenated components", () => {
  assert.throws(() => composeGeorgianInitialism([]), TypeError);
  assert.throws(() => composeGeorgianInitialism(["C", "ენ"]), TypeError);
  assert.throws(() => composeGeorgianInitialism(["სი-", "ენ"]), TypeError);
});
