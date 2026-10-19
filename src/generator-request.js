export const GENERATOR_LEXICAL_CLASSES = Object.freeze([
  "ordinary_word",
  "proper_noun",
  "abbreviation",
]);

export const GENERATOR_ENTITY_TYPES = Object.freeze([
  "personal_name",
  "geographic_name",
  "organization",
  "brand_product",
  "work_publication",
  "other",
]);

export const ABBREVIATION_READING_TYPES = Object.freeze([
  "initialism",
  "acronym",
]);

export class GeneratorRequestError extends TypeError {
  constructor(code, message) {
    super(message);
    this.name = "GeneratorRequestError";
    this.code = code;
  }
}

export function validateGeneratorRequest(input) {
  if (!input || typeof input !== "object") {
    throw new GeneratorRequestError("INVALID_REQUEST", "A generator request object is required.");
  }

  const term = String(input.term ?? "").trim();
  if (!term) throw new GeneratorRequestError("TERM_REQUIRED", "Enter an English term.");
  if (!GENERATOR_LEXICAL_CLASSES.includes(input.lexicalClass)) {
    throw new GeneratorRequestError("LEXICAL_CLASS_REQUIRED", "Select a term class.");
  }

  let entityType = "not_applicable";
  let readingType = "ordinary_word";
  if (input.lexicalClass === "proper_noun") {
    if (!GENERATOR_ENTITY_TYPES.includes(input.entityType)) {
      throw new GeneratorRequestError("ENTITY_TYPE_REQUIRED", "Select a proper-noun type.");
    }
    entityType = input.entityType;
  }
  if (input.lexicalClass === "abbreviation") {
    if (!ABBREVIATION_READING_TYPES.includes(input.readingType)) {
      throw new GeneratorRequestError("READING_TYPE_REQUIRED", "Select how the abbreviation is pronounced.");
    }
    readingType = input.readingType;
  }

  return Object.freeze({
    term,
    sourceLanguage: "English",
    lexicalClass: input.lexicalClass,
    entityType,
    readingType,
  });
}
