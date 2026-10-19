const rule = (output, confidence = "high") => Object.freeze({ output, confidence });

export const ENGLISH_READING_TYPES = Object.freeze([
  "ordinary_word",
  "initialism",
  "acronym",
  "traditional_name",
]);

export const PRONUNCIATION_RELIABILITY = Object.freeze([
  "verified",
  "editorial",
  "unverified",
]);

export const IPA_DIRECT_RULES = Object.freeze({
  "iː": rule("ი"), i: rule("ი"), ɪ: rule("ი"),
  ɛ: rule("ე"), æ: rule("ე", "medium"), "ɑː": rule("ა"),
  ɒ: rule("ო", "medium"), ɑ: rule("ო", "medium"), "ɔː": rule("ო"),
  ʊ: rule("უ"), "uː": rule("უ"), ʌ: rule("ა"),
  "eɪ": rule("ეი"), "aɪ": rule("აი"), "ɔɪ": rule("ოი"),
  "aʊ": rule("აუ"), "oʊ": rule("ოუ"),
  p: rule("პ"), b: rule("ბ"), t: rule("ტ"), d: rule("დ"),
  k: rule("კ"), ɡ: rule("გ"), f: rule("ფ"), v: rule("ვ"),
  θ: rule("თ"), ð: rule("ზ"), s: rule("ს"), z: rule("ზ"),
  ʃ: rule("შ"), ʒ: rule("ჟ"), "tʃ": rule("ჩ"), "dʒ": rule("ჯ"),
  m: rule("მ"), n: rule("ნ"), ŋ: rule("ნგ"), l: rule("ლ"),
  ɹ: rule("რ"), h: rule("ჰ"), j: rule("ი"),
});

export const IPA_CONTEXTUAL_RULES = Object.freeze({
  w: Object.freeze({ ruleId: "english.ipa.w.position", confidence: "high" }),
  ə: Object.freeze({ ruleId: "english.ipa.schwa.context", confidence: "low" }),
  "ɜː": Object.freeze({ ruleId: "english.ipa.rhotic-vowel.context", confidence: "medium" }),
  ɝ: Object.freeze({ ruleId: "english.ipa.rhotic-vowel.context", confidence: "medium" }),
  ɚ: Object.freeze({ ruleId: "english.ipa.rhotic-vowel.context", confidence: "medium" }),
  "ɪə": Object.freeze({ ruleId: "english.ipa.near-diphthong.context", confidence: "medium" }),
  "ɛə": Object.freeze({ ruleId: "english.ipa.square-diphthong.context", confidence: "medium" }),
  "ʊə": Object.freeze({ ruleId: "english.ipa.cure-diphthong.context", confidence: "low" }),
});

export const IPA_VOWEL_TOKENS = Object.freeze([
  "iː", "i", "ɪ", "ɛ", "æ", "ɑː", "ɒ", "ɑ", "ɔː", "ʊ", "uː", "ʌ",
  "ə", "ɜː", "ɝ", "ɚ", "eɪ", "aɪ", "ɔɪ", "aʊ", "oʊ", "ɪə", "ɛə", "ʊə",
]);

export const IPA_TOKEN_INVENTORY = Object.freeze(
  [...new Set([
    ...Object.keys(IPA_DIRECT_RULES),
    ...Object.keys(IPA_CONTEXTUAL_RULES),
  ])].sort((left, right) => right.length - left.length),
);

export const ORTHOGRAPHIC_FALLBACK_POLICY = Object.freeze({
  visibility: "editor_only",
  confidence: "low",
  publicCandidateAllowed: false,
});
