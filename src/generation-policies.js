const STRATEGIES = Object.freeze({
  ordinaryWord: Object.freeze({
    id: "english_word_ipa",
    label: "English word from IPA",
    expectedReadingType: "ordinary_word",
  }),
  properNoun: Object.freeze({
    id: "english_proper_noun_ipa",
    label: "English proper noun from IPA",
    expectedReadingType: "ordinary_word",
  }),
  initialism: Object.freeze({
    id: "english_initialism_letter_names",
    label: "English letter names",
    expectedReadingType: "initialism",
  }),
  acronym: Object.freeze({
    id: "english_acronym_word",
    label: "English acronym pronunciation",
    expectedReadingType: "acronym",
  }),
});

const check = (code, message, severity = "warning") => Object.freeze({ code, message, severity });

const ENTITY_POLICIES = Object.freeze({
  personal_name: Object.freeze({
    label: "Personal name",
    checks: Object.freeze([
      check("confirm_source_pronunciation", "Confirm the person's source-language pronunciation before publication."),
    ]),
  }),
  geographic_name: Object.freeze({
    label: "Geographic name",
    checks: Object.freeze([
      check("check_established_exonym", "Check for an established Georgian exonym or conventional spelling before publication."),
    ]),
  }),
  organization: Object.freeze({
    label: "Organization",
    checks: Object.freeze([
      check("check_official_georgian_form", "Check whether the organization publishes an established Georgian form."),
    ]),
  }),
  brand_product: Object.freeze({
    label: "Brand or product",
    checks: Object.freeze([
      check("check_owner_pronunciation", "Check the owner's published pronunciation and established Georgian usage."),
    ]),
  }),
  work_publication: Object.freeze({
    label: "Work or publication",
    checks: Object.freeze([
      check("check_bibliographic_usage", "Check established Georgian bibliographic usage before publication."),
    ]),
  }),
  other: Object.freeze({
    label: "Other proper noun",
    checks: Object.freeze([
      check("check_established_usage", "Check established Georgian usage before publication."),
    ]),
  }),
});

const INITIALISM_CHECKS = Object.freeze([
  check("confirm_letter_by_letter_reading", "Confirm that the abbreviation is pronounced letter by letter."),
]);

const ACRONYM_CHECKS = Object.freeze([
  check("confirm_word_reading", "Confirm that the abbreviation is pronounced as a word."),
  check("check_conventional_acronym_form", "Check whether established Georgian usage overrides strict English-IPA transcription."),
]);

export function resolveGenerationPolicy(request) {
  if (!request || typeof request !== "object") throw new TypeError("A validated generator request is required.");

  if (request.lexicalClass === "ordinary_word") {
    return Object.freeze({
      id: "ordinary_word.english_ipa",
      label: "Ordinary word",
      strategy: STRATEGIES.ordinaryWord,
      morphologyProfile: "foreign_term",
      checks: Object.freeze([]),
    });
  }

  if (request.lexicalClass === "proper_noun") {
    const entityPolicy = ENTITY_POLICIES[request.entityType];
    if (!entityPolicy) throw new TypeError(`Unsupported proper-noun entity type: ${request.entityType}`);
    return Object.freeze({
      id: `proper_noun.${request.entityType}.english_ipa`,
      label: entityPolicy.label,
      strategy: STRATEGIES.properNoun,
      morphologyProfile: request.entityType === "geographic_name" ? "geographic_name" : "foreign_term",
      checks: entityPolicy.checks,
    });
  }

  if (request.lexicalClass === "abbreviation") {
    const initialism = request.readingType === "initialism";
    if (!initialism && request.readingType !== "acronym") {
      throw new TypeError(`Unsupported abbreviation reading type: ${request.readingType}`);
    }
    return Object.freeze({
      id: `abbreviation.${request.readingType}.english_ipa`,
      label: initialism ? "Abbreviation · Initialism" : "Abbreviation · Acronym",
      strategy: initialism ? STRATEGIES.initialism : STRATEGIES.acronym,
      morphologyProfile: "foreign_term",
      checks: initialism ? INITIALISM_CHECKS : ACRONYM_CHECKS,
    });
  }

  throw new TypeError(`Unsupported lexical class: ${request.lexicalClass}`);
}

