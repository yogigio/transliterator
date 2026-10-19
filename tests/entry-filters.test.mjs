import test from "node:test";
import assert from "node:assert/strict";
import {
  ENTRY_FILTER_GROUPS,
  filterEntries,
  hasActiveEntryFilters,
  normalizeEntryFilters,
} from "../src/entry-filters.js";

test("normalizes supported filters and drops duplicates and unknown values", () => {
  assert.deepEqual(normalizeEntryFilters({
    lexicalClasses: ["Proper noun", "Proper noun", "Unknown"],
    entityCategories: ["person", "unsupported"],
  }), {
    lexicalClasses: ["Proper noun"],
    entityCategories: ["person"],
  });
});

test("matches any selected value within a group and all active groups", () => {
  const entries = [
    { lexicalClass: "Proper noun", entityCategories: ["person"] },
    { lexicalClass: "Proper noun", entityCategories: ["place"] },
    { lexicalClass: "Abbreviation", entityCategories: ["organization"] },
  ];

  assert.equal(filterEntries(entries, { entityCategories: ["person", "place"] }).length, 2);
  assert.deepEqual(filterEntries(entries, {
    lexicalClasses: ["Abbreviation"],
    entityCategories: ["organization", "place"],
  }), [entries[2]]);
});

test("reports active filters and exposes stable checkbox groups", () => {
  assert.equal(hasActiveEntryFilters(), false);
  assert.equal(hasActiveEntryFilters({ entityCategories: ["person"] }), true);
  assert.deepEqual(ENTRY_FILTER_GROUPS.map((group) => group.key), ["lexicalClasses", "entityCategories"]);
});
