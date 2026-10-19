/**
 * Spelling-guided vowel choice.
 *
 * The engine's source of truth is the IPA record. A few English vowels cannot be
 * told apart by IPA alone, although Georgian spelling distinguishes them by how
 * the word is written: an unstressed schwa, /oʊ/, and the back /ɑ/ vowels. For
 * those the written vowel letters are lined up with the IPA vowel nuclei and
 * the letter decides.
 *
 * The alignment is deliberately cautious. It only speaks when the surface
 * spelling can be divided into exactly as many vowel units as the IPA has
 * nuclei, and when every possible division agrees. Anything else returns null
 * and the engine keeps its ordinary behaviour (an unresolved schwa goes to an
 * editor; /oʊ/ and /ɑː/ keep their IPA defaults).
 */

const SINGLE_UNITS = new Set(["a", "e", "i", "o", "u", "y"]);
const DIGRAPH_UNITS = new Set([
  "ea", "ee", "oo", "ai", "ay", "ei", "ey", "ie", "oa", "ow", "ou",
  "au", "aw", "ew", "eu", "ue", "oi", "oy", "ui", "ae", "oe",
]);
const VOWEL_LETTERS = new Set(["a", "e", "i", "o", "u"]);
const MAX_PARSES = 64;

const SCHWA_BY_LETTER = Object.freeze({ a: "ა", e: "ე", i: "ი", o: "ო", u: "ა", y: "ი" });

/**
 * Endings of English-origin proper names whose unstressed vowel is written ე
 * although it is spelled with an a. The vowel unit must be the last one of the
 * word, so -man in "Freeman" matches but the a in "Manchester" does not.
 * -man is the least certain: names of German origin keep მან, which neither the
 * IPA nor the spelling can show, so it is reported with low confidence.
 */
const NAME_SUFFIXES = Object.freeze([
  Object.freeze({ ending: "land", after: "nd", id: "land", confidence: "medium" }),
  Object.freeze({ ending: "ham", after: "m", id: "ham", confidence: "medium" }),
  Object.freeze({ ending: "man", after: "n", id: "man", confidence: "low" }),
]);

function nameSuffixOf(unit) {
  if (unit.text !== "a" || !unit.word) return null;
  return NAME_SUFFIXES.find(({ ending, after }) => (
    unit.word.length > ending.length && unit.word.endsWith(ending) && unit.after === after
  )) ?? null;
}

/**
 * r-coloured vowels. The written vowel letter decides, and the r written after
 * it (a coda r: "er" in Twitter, not the r of "Carol") becomes რ. British
 * non-rhotic IPA has no /ɹ/ in these words, but the spelling still does.
 * Letters that Georgian practice treats inconsistently (ir, an unstressed ur or
 * yr, ar under stress) are left out on purpose and stay with an editor.
 */
const RHOTIC_BY_LETTER = Object.freeze({
  unstressed: Object.freeze({ e: "ერ", o: "ორ", a: "არ" }),
  stressed: Object.freeze({ e: "ერ", u: "ერ", y: "ერ", ea: "ერ", o: "ორ" }),
});

const KINDS = Object.freeze({
  /** An unstressed schwa takes the Georgian vowel of the letter that spells it. */
  schwa: (unit, options) => {
    if (options.properName && nameSuffixOf(unit)) return "ე";
    // Non-rhotic IPA: "Twitter" /ˈtwɪtə/ has no /ɹ/ but is written with an r.
    if (unit.codaR && !options.followedByR) return RHOTIC_BY_LETTER.unstressed[unit.text] ?? null;
    return SCHWA_BY_LETTER[unit.text] ?? null;
  },
  /** /ɚ/, unstressed r-coloured schwa. */
  rhoticUnstressed: (unit) => (unit.codaR ? RHOTIC_BY_LETTER.unstressed[unit.text] ?? null : null),
  /** /ɝ/ and British /ɜː/, stressed r-coloured vowel. */
  rhoticStressed: (unit) => (unit.codaR ? RHOTIC_BY_LETTER.stressed[unit.text] ?? null : null),
  /** /oʊ/: a plain o is ო; o+silent e, oa, ow and ou are ოუ. */
  ou: (unit) => {
    if (unit.text === "o") return unit.silentE ? "ოუ" : "ო";
    if (["oa", "ow", "ou"].includes(unit.text)) return "ოუ";
    if (unit.text === "oe") return "ო";
    return null;
  },
  /** Back unrounded /ɑ(ː)/: spelled a is ა, spelled o is ო. */
  back: (unit) => {
    if (unit.text === "a") return "ა";
    if (unit.text === "o") return "ო";
    return null;
  },
});

function words(surface) {
  return String(surface ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .split(/[^a-z]+/u)
    .filter(Boolean);
}

function isVowelAt(word, index) {
  const letter = word[index];
  if (VOWEL_LETTERS.has(letter)) return true;
  if (letter === "y") return !(index === 0 && VOWEL_LETTERS.has(word[1]));
  return false;
}

/** Maximal vowel runs of one word; a w after a vowel belongs to the run (ow, aw, ew). */
function vowelRuns(word) {
  const runs = [];
  let current = null;
  for (let index = 0; index < word.length; index += 1) {
    const vowel = isVowelAt(word, index);
    const glide = word[index] === "w" && current && isVowelAt(word, index - 1);
    if (vowel || glide) {
      if (!current) {
        current = { start: index, text: "" };
        runs.push(current);
      }
      current.text += word[index];
    } else {
      current = null;
    }
  }
  return runs;
}

/** Every way to cut one vowel run into single letters and accepted digraphs. */
function partitions(run) {
  if (!run) return [[]];
  const result = [];
  if (SINGLE_UNITS.has(run[0])) {
    partitions(run.slice(1)).forEach((rest) => result.push([run[0], ...rest]));
  }
  if (run.length >= 2 && DIGRAPH_UNITS.has(run.slice(0, 2))) {
    partitions(run.slice(2)).forEach((rest) => result.push([run.slice(0, 2), ...rest]));
  }
  return result;
}

/** Unit sequences for one word, with and without a silent final e. */
function wordVariants(word) {
  const runs = vowelRuns(word);
  if (!runs.length) return [[]];
  const cuts = runs.map((run) => partitions(run.text).map((parts) => {
    let offset = run.start;
    return parts.map((text) => {
      offset += text.length;
      const after = word.slice(offset);
      return { text, silentE: false, word, after, codaR: /^r(?:[^aeiouy]|$)/u.test(after) };
    });
  }));
  if (cuts.some((options) => !options.length)) return [];
  let sequences = [[]];
  for (const options of cuts) {
    const next = [];
    for (const sequence of sequences) {
      for (const option of options) {
        next.push([...sequence, ...option]);
        if (next.length > MAX_PARSES) return [];
      }
    }
    sequences = next;
  }
  const variants = [...sequences];
  const lastRun = runs.at(-1).text;
  const endsInSilentE = word.endsWith("e") && lastRun === "e" && runs.length > 1 && !VOWEL_LETTERS.has(word.at(-2));
  if (endsInSilentE) {
    sequences.forEach((sequence) => {
      const trimmed = sequence.slice(0, -1).map((unit) => ({ ...unit }));
      trimmed.at(-1).silentE = true;
      variants.push(trimmed);
    });
  }
  return variants;
}

function enumerateParses(surface, nucleusCount) {
  const perWord = words(surface).map(wordVariants);
  if (!perWord.length || perWord.some((variants) => !variants.length)) return [];
  let parses = [[]];
  for (const variants of perWord) {
    const next = [];
    for (const parse of parses) {
      for (const variant of variants) {
        if (parse.length + variant.length <= nucleusCount) next.push([...parse, ...variant]);
        if (next.length > MAX_PARSES * 4) return [];
      }
    }
    parses = next;
  }
  return parses.filter((parse) => parse.length === nucleusCount);
}

/**
 * @param {string} surface the written form of the term
 * @param {number} nucleusCount number of vowel nuclei in the IPA
 * @returns {null | {decide(ordinal: number, kind: "schwa"|"ou"|"back"|"rhoticUnstressed"|"rhoticStressed", options?: {properName?: boolean, followedByR?: boolean}): null | {output: string, letters: string, suffix?: string, confidence: string}}}
 */
export function createSpellingGuide(surface, nucleusCount) {
  if (!Number.isInteger(nucleusCount) || nucleusCount < 1) return null;
  const parses = enumerateParses(surface, nucleusCount);
  if (!parses.length) return null;
  return Object.freeze({
    decide(ordinal, kind, options = {}) {
      const rule = KINDS[kind];
      if (!rule || ordinal < 0 || ordinal >= nucleusCount) return null;
      const outputs = parses.map((parse) => rule(parse[ordinal], options));
      if (outputs.some((output) => output === null) || new Set(outputs).size !== 1) return null;
      const letters = [...new Set(parses.map((parse) => parse[ordinal].text))].join("/");
      const suffixes = parses.map((parse) => (kind === "schwa" && options.properName ? nameSuffixOf(parse[ordinal]) : null));
      const suffix = suffixes.every((item) => item && item.id === suffixes[0]?.id) ? suffixes[0] : null;
      return Object.freeze({
        output: outputs[0],
        letters,
        confidence: suffix?.confidence ?? "medium",
        ...(suffix ? { suffix: suffix.id } : {}),
      });
    },
  });
}
