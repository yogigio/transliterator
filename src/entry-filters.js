export const ENTRY_FILTER_GROUPS = Object.freeze([
  Object.freeze({
    key: "lexicalClasses",
    label: "Lexical class",
    options: Object.freeze([
      Object.freeze({ value: "Proper noun", label: "Proper nouns" }),
      Object.freeze({ value: "Common noun", label: "Common nouns" }),
      Object.freeze({ value: "Abbreviation", label: "Abbreviations" }),
    ]),
  }),
  Object.freeze({
    key: "entityCategories",
    label: "Entity type",
    options: Object.freeze([
      Object.freeze({ value: "person", label: "Personal names" }),
      Object.freeze({ value: "place", label: "Geographical names" }),
      Object.freeze({ value: "organization", label: "Organizations" }),
      Object.freeze({ value: "brand_product", label: "Brands and products" }),
      Object.freeze({ value: "software_project", label: "Software and projects" }),
      Object.freeze({ value: "technical_term", label: "Technical terms" }),
      Object.freeze({ value: "other", label: "Other terms" }),
    ]),
  }),
]);

const allowedValues = Object.fromEntries(
  ENTRY_FILTER_GROUPS.map((group) => [group.key, new Set(group.options.map((option) => option.value))]),
);

export function normalizeEntryFilters(filters = {}) {
  return Object.fromEntries(ENTRY_FILTER_GROUPS.map((group) => {
    const supplied = Array.isArray(filters[group.key]) ? filters[group.key] : [];
    const values = [...new Set(supplied.filter((value) => allowedValues[group.key].has(value)))];
    return [group.key, values];
  }));
}

export function hasActiveEntryFilters(filters = {}) {
  const normalized = normalizeEntryFilters(filters);
  return ENTRY_FILTER_GROUPS.some((group) => normalized[group.key].length > 0);
}

export function filterEntries(entries, filters = {}) {
  const normalized = normalizeEntryFilters(filters);
  return entries.filter((entry) => {
    const lexicalMatch = normalized.lexicalClasses.length === 0
      || normalized.lexicalClasses.includes(entry.lexicalClass);
    const categories = Array.isArray(entry.entityCategories) ? entry.entityCategories : [];
    const entityMatch = normalized.entityCategories.length === 0
      || normalized.entityCategories.some((category) => categories.includes(category));
    return lexicalMatch && entityMatch;
  });
}
