import { inflectLatinStem } from "./latin-inflector.js?v=0.8.3";

/**
 * Whether an entry's inflection table has a Latin-script column, and what is in it.
 *
 * A Latin-script term with a Georgian ending ("GitHub-ის") is a real form for most
 * terms and meaningless for others (a name that is already written in Georgian, a
 * term the editors never gave a Latin stem). The column used to appear for every
 * entry and say "Awaiting confirmed rule" in each cell when nothing was stored. It
 * now appears only when it has something to show.
 *
 * The Latin rules are mechanical - a case ending chosen by the final pronounced
 * sound - so a form is never "awaiting a rule". When an editor recorded the stem
 * and the final sound but stored no rows, the forms are generated here from them.
 */

export const LATIN_COLUMN_MODES = Object.freeze(["auto", "always", "never"]);

/** The editorial sound classes, as eng.ge stores them, mapped onto the inflector's arguments. */
const SOUND_CLASSES = Object.freeze({
  consonant: Object.freeze({ finalSoundClass: "consonant", finalVowelClass: null }),
  vowel_i: Object.freeze({ finalSoundClass: "vowel", finalVowelClass: "i" }),
  vowel_other: Object.freeze({ finalSoundClass: "vowel", finalVowelClass: "other" }),
});

/**
 * States in which the stored stem and sound are a statement of how the term inflects.
 * `irregular` and `invariable` are an editor saying "do not generate"; `component_only`
 * says the whole name is not inflected as one piece.
 */
const GENERATABLE_STATES = Object.freeze(["unknown", "regular", "automatic"]);

export function normalizeLatinColumnMode(value) {
  const mode = String(value ?? "").trim().toLowerCase();
  return LATIN_COLUMN_MODES.includes(mode) ? mode : "auto";
}

const hasForm = (value) => typeof value === "string" && value.trim() !== "";

function storedForms(latin) {
  const paradigm = latin?.paradigm;
  return paradigm && typeof paradigm === "object" ? paradigm : {};
}

function generatedForms(inflection, cases) {
  const latin = inflection?.latin;
  const state = String(inflection?.latinScript ?? "unknown");
  const sound = SOUND_CLASSES[latin?.soundClass];
  const stem = typeof latin?.stem === "string" ? latin.stem.trim() : "";
  if (!sound || !stem || !GENERATABLE_STATES.includes(state)) return null;
  try {
    const result = inflectLatinStem({ stem, ...sound });
    return Object.fromEntries(cases.map((key) => [key, result.cases[key]?.display ?? null]));
  } catch {
    return null; // a stem the inflector refuses (no Latin letters, Georgian letters) has no Latin paradigm
  }
}

/**
 * @param {object} inflection the entry's `inflection` block
 * @param {string[]} cases    the case keys the table lists
 * @param {string}   mode     "auto" (default), "always" (legacy: column whenever the entry is not
 *                            marked not_applicable) or "never"
 * @returns {{paradigm: object, generated: boolean} | null} null means: draw no Latin column
 */
export function resolveLatinColumn(inflection, cases, mode = "auto") {
  const chosen = normalizeLatinColumnMode(mode);
  if (chosen === "never") return null;
  if (inflection?.latinScript === "not_applicable") return null;

  const stored = storedForms(inflection?.latin);
  if (cases.some((key) => hasForm(stored[key]))) {
    return { paradigm: Object.fromEntries(cases.map((key) => [key, hasForm(stored[key]) ? stored[key] : null])), generated: false };
  }
  const generated = generatedForms(inflection, cases);
  if (generated) return { paradigm: generated, generated: true };
  if (chosen === "always") return { paradigm: Object.fromEntries(cases.map((key) => [key, null])), generated: false };
  return null;
}
