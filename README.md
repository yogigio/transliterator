# eng.ge Transliterator

An open-source interface for looking up how international names and terms should be written and inflected in Georgian. The project is designed as both a standalone tool and an embeddable component for future use on eng.ge.

This repository implements the agreed interface model, deterministic inflection, and the first reviewed English-IPA transcription layer. It does not publish an approved lexical dataset, pronunciation database, or spelling-only public suggestion engine.

## Current interface

The prototype includes:

- international name and term lookup;
- real-time, keyboard-accessible autocomplete for terms already in the provider;
- separate dictionary-search and explicit transliteration-generator modes;
- classified Georgian candidate generation when a reliable IPA record is available;
- separate lexical class and entity type, displayed together (for example, `Proper noun · Brand`);
- source language, region, and transcription basis stored separately from a person's nationality;
- expanded forms and abbreviation types for abbreviated entries;
- American and British IPA variants;
- approved-entry and clearly differentiated unreviewed-candidate states;
- real-time search filters for lexical class and overlapping entity categories;
- Georgian spelling, stem, ending class, and final-`ი` analysis;
- explicitly reviewed incorrect forms, presented as “Forms to avoid” with text and strikethrough in addition to color;
- Georgian and conditional Latin-script inflection tables;
- whole-expression and component views for composite names;
- provenance and entry metadata;
- correction and missing-entry submission events for host integration, with an optional editorial stem hint;
- responsive light and dark themes.

Editorially approved entries carry a quiet “Editorially approved” badge (with the review date in its tooltip) instead of a confidence label: confidence is the evidence an editor documents before approving, and shown beside an approved entry it would read as the editors doubting their own decision. Candidates keep the confidence label. Preloaded, unconfirmed records are labeled as unreviewed candidates. Dictionary search never silently generates a result: a missing entry offers a prefilled transition to the separate generator. Runtime forms are labeled “Generated candidate,” display their IPA basis, classification, and morphology, and remain explicitly unreviewed. Requests with no reliable or fully resolvable pronunciation record do not receive a public generated form.

The project does not include Georgian-to-Latin romanization. That is outside the current product scope.

## Run locally

The source uses native JavaScript modules and needs no dependency installation:

```sh
python -m http.server 4173
```

Open `http://localhost:4173`, then run checks with:

```sh
npm run check
```

## Architecture

```text
index.html                         standalone public host
app.js                             host-only theme wiring
src/transliterator-element.js      reusable result/search component
src/transliterator-styles.js       isolated component presentation
src/sample-provider.js             public interface fixtures and local search
src/english-ipa-rules.js           reviewed machine-readable IPA mappings and policies
src/ipa-normalizer.js              IPA notation normalization
src/ipa-tokenizer.js               phoneme, stress, and boundary tokenizer
src/english-ipa-engine.js          auditable Georgian candidate generator
src/pronunciation-provider.js      validated in-memory and HTTP provider adapters
src/open-pronunciation-sources.js  Wiktextract, CMUdict, and opt-in machine fallback adapters
src/automatic-candidate-service.js pronunciation-to-candidate orchestration
src/generator-request.js           generator metadata validation
src/generation-policies.js         classification-to-strategy policy registry
src/transliteration-generator.js   classification-aware generator boundary
src/regression-pronunciations.js   small reviewed browser demonstration corpus
src/georgian-inflector.js          deterministic Georgian-script case engine
src/composite-name-inflector.js    multi-component names: which components take endings (configurable rule)
src/latin-inflector.js             deterministic Latin-script case engine
tests/sample-provider.test.mjs     provider contract tests
tests/ipa-tokenizer.test.mjs       IPA normalization and tokenization tests
tests/english-ipa-engine.test.mjs  transcription policy and output tests
tests/pronunciation-provider.test.mjs provider adapter contract tests
tests/open-pronunciation-sources.test.mjs open-data and machine-fallback tests
tests/automatic-candidate-service.test.mjs candidate orchestration tests
tests/generator-request.test.mjs   generator validation and strategy tests
tests/generation-policies.test.mjs classification policy tests
tests/georgian-inflector.test.mjs  Georgian-script inflection regression tests
tests/latin-inflector.test.mjs     Latin-script inflection regression tests
```

The `<eng-transliterator>` component uses Shadow DOM so the standalone shell and a future eng.ge host cannot accidentally override one another. The host can theme it with the documented `--tool-*` custom properties or set `theme="dark"`.

```html
<script type="module" src="/path/to/transliterator-element.js"></script>
<eng-transliterator></eng-transliterator>
```

The component emits these integration events:

- `entrysearch` with `{ query, filters }`;
- `entryselect` with `{ entry }`;
- `submissionrequest` with either a `correction` payload (`entryId`, `englishTerm`, `spelling`, optional `stem`, and `note`) or a `new-entry` payload (`englishTerm`, `category`, optional `spelling`, optional `stem`, and optional `note`).

The submission UI treats a stem as optional supporting information. It is hidden behind an “Add stem” disclosure, reviewed by editors, and never accepted as an authoritative form merely because a contributor supplied it.

Searches are reflected in the `?q=` URL parameter. Generator views add `?mode=generator`, so both modes can be bookmarked and browser Back/Forward navigation restores the corresponding interface. Theme preference is stored locally in the browser.

The sample entry provider and pronunciation provider are deliberately replaceable. The standalone host now requests the same-origin `GET /transcription/v1/pronunciations` endpoint before generation. The endpoint receives `term` and the selected `readingType` as query parameters and must return a validated pronunciation record such as:

```json
{
  "term": "Wimbledon",
  "language": "English",
  "readingType": "ordinary_word",
  "pronunciations": [
    {
      "ipa": "/ˈwɪmbəldən/",
      "variety": "British English",
      "source": { "label": "Licensed editorial dictionary", "reliability": "verified" }
    }
  ]
}
```

Return `404` when no suitable record exists. Invalid records and provider failures are not converted into spelling guesses. The public client sends no provider credential: production eng.ge must keep third-party keys and licensed-source integration behind this endpoint.

The standalone `index.html` explicitly enables the small reviewed regression corpus as a fallback so the static demonstration remains usable when the endpoint is absent. A production host can omit the `eng-ge-pronunciation-fallback` meta tag. Forks can change `eng-ge-pronunciation-endpoint` or implement the same validated provider contract. The regression corpus is not a general English pronunciation database.

### HTTP API contract

The component talks to two read-only `GET` endpoints. Both are replaceable: point the `eng-ge-entry-search-endpoint` and `eng-ge-pronunciation-endpoint` meta tags (see `index.html`) at your own server, or leave them out and the standalone page runs on its built-in sample and regression data.

`GET /transcription/v1/entries?q=<text>&limit=<1-20>` returns `{ "entries": [...] }`, best match first, empty when nothing matches. Only entries an editor has published (approved or automatic status, never drafts or private notes) are returned; a missing `q` is `400`, a backend fault `503`. Each entry carries both scripts' inflection tables:

```json
{
  "id": "db-12",
  "headword": "Microsoft",
  "lexicalClass": "Proper noun",
  "entityType": "Brand or product",
  "status": "approved",
  "pronunciations": { "en-US": { "label": "en-US", "ipa": "/ˈmaɪkɹoʊˌsɔft/", "source": "…" } },
  "georgian": { "spelling": "მაიკროსოფტი", "stem": "მაიკროსოფტ", "ending": "ი", "endingClass": "Consonant" },
  "inflection": {
    "georgianScript": "regular",
    "latinScript": "regular",
    "scopes": ["whole"],
    "whole": { "nominative": "მაიკროსოფტი", "ergative": "მაიკროსოფტმა", "…": "…" },
    "latin": { "paradigm": {
      "nominative": "Microsoft / Microsoft-ი",
      "ergative": "Microsoft-მა",
      "vocative": "Microsoft / Microsoft-ო"
    } }
  }
}
```

A multi-word name lists its parts in `components`. Each part carries its own paradigm, in the same shape as `inflection.whole` — all seven cases, `null` where nothing is confirmed:

```json
"inflection": { "scopes": ["whole", "components"], "…": "…" },
"components": [
  { "source": "Steve", "georgian": "სტივ", "role": "Given name",
    "stem": "სტივ", "endingClass": "Consonant-final",
    "paradigm": { "nominative": "სტივი", "ergative": "სტივმა", "…": "…" } },
  { "source": "Jobs", "georgian": "ჯობსი", "role": "Surname", "paradigm": { "nominative": null, "…": null } }
]
```

`stem` and `endingClass` are optional. A component whose cases are all `null` shows "Paradigm awaiting confirmed rule"; the "By component" view appears whenever `scopes` includes `"components"`.

A case with several accepted forms is one string, `"A / B"`. A case the editors have not confirmed is `null`, and the component shows "Awaiting confirmed rule" rather than inventing a form. Generated candidates are different: the component builds both tables itself from IPA, so an unseen term still gets Georgian and Latin-script forms (clearly labelled as an unreviewed candidate).

`GET /transcription/v1/pronunciations?term=<text>&readingType=<ordinary_word|initialism|acronym|traditional_name>` returns the validated pronunciation record shown above, or `404`. Every pronunciation carries its source, licence and dataset version.

Browsers only allow a page to call another origin's API if that server sends CORS headers. A deployment serving its own API from the same origin needs nothing. eng.ge's hosted read-only endpoints (`https://eng.ge/transcription/v1/entries` and `https://eng.ge/transcription/v1/pronunciations`, `GET` only) send `Access-Control-Allow-Origin: *` and never allow credentials, so a page on your own site or on `localhost` can point the two meta tags at them without a key. Responses are cacheable and the service has no uptime guarantee, so cache what you fetch. Requests are limited per client address (120 a minute for entries, 60 for pronunciations); beyond that the server answers `429` with a `Retry-After` header, which the response exposes to browsers. The write and account endpoints are not open to other origins.

### Treat API data as untrusted

The component renders every API-supplied string through `escapeHtml()` before it reaches `innerHTML`, and only same-site paths or `https:` URLs may become a link (`javascript:` and `data:` links are dropped). It does this because the data comes from a network and, upstream, from community-edited sources such as Wiktionary. If you add rendering code, keep to the same rule: no API field goes into markup unescaped.

### Open pronunciation source pipeline

The production endpoint should resolve pronunciation evidence in this order:

1. editorially reviewed records and overrides;
2. English Wiktionary data imported through Wiktextract/Kaikki;
3. CMUdict General American records converted deterministically from ARPAbet to IPA;
4. an optional machine or AI estimate only when every stored source misses.

`src/open-pronunciation-sources.js` provides adapters and a composed pipeline for these tiers. Wiktextract data is labeled `community`, CMUdict conversion is labeled `converted`, and machine output is labeled `machine`. Dataset version, source URL, and license metadata travel with the pronunciation record.

See [DATA_SOURCES.md](DATA_SOURCES.md) for source selection, attribution, update, and redistribution requirements.

Machine fallback is disabled unless the server passes `allowMachineFallback: true`. The provider caches by normalized term and reading type, so a repeated request does not spend more inference tokens. A machine pronunciation can produce a visibly low-confidence last-resort draft, but it remains ineligible for the trusted public-candidate tier and always requires editorial review. The callback is vendor-neutral: a small local G2P model can be used without tokens, or a low-cost language model can return one short structured IPA response only after the open datasets miss.

## Linguistic rule boundary

Transcription and inflection behavior must not be inferred from generic conventions. Each rule needs an owner-approved description, examples, exceptions, and counterexamples. Approved examples become golden regression fixtures before an engine generates public results.

The IPA engine requires authoritative reading-type metadata and pronunciation reliability. It retains stress and boundaries in its token stream, returns a rule trace, treats final `/ɪ/`, `/i/`, and `/iː/` as root-final Georgian `ი`, and withholds a candidate when contextual phonemes such as unresolved schwa cannot be mapped responsibly. Candidates based on unverified pronunciation remain editor-only. Spelling-only fallback is also editor-only by policy.

Inflection is also entity-aware. Foreign brands and ordinary terms ending in Georgian `ა` or `ე` preserve that vowel before genitive `-ს` and instrumental `-თი` (`ფიგმას`, `ფიგმათი`). Geographical names ending in `ა` or `ე` use the dedicated truncating class before genitive `-ის` and instrumental `-ით` (`კუბის`, `კუბით`). Names ending in `ო` or `უ` continue to preserve the final vowel.

```js
import { transcribeEnglishIpa } from "./src/english-ipa-engine.js";

const suggestion = transcribeEnglishIpa({
  surface: "GitHub",
  language: "English",
  variety: "General American",
  readingType: "ordinary_word",
  ipa: "/ˈɡɪt.hʌb/",
  pronunciationSource: { label: "Editorial dictionary", reliability: "verified" },
});

console.log(suggestion.candidate.georgianForm); // გიტჰაბი
```

The first back-end rule module is available independently of the interface. It
requires a preserved Latin-script stem and its final pronounced sound class; it
does not infer pronunciation from spelling.

```js
import { inflectLatinStem } from "./src/latin-inflector.js";

const result = inflectLatinStem({
  stem: "Codex",
  finalSoundClass: "consonant",
});

console.log(result.cases.nominative.display); // Codex / Codex-ი
console.log(result.cases.genitive.display);   // Codex-ის
```

### Names made of several components

A personal name such as "Steve Jobs" is a list of components, each with its own stem and declension class. Which of them take a case ending when the **whole** name is inflected is a linguistic rule the project owner has not yet confirmed, so it is a parameter of `src/composite-name-inflector.js` rather than a hard-coded behaviour:

| `policy` | Components that take endings | Ergative of "Steve Jobs" |
|---|---|---|
| `last` (default) | the final component only | სტივ ჯობსმა |
| `flagged` | components whose `inflects` flag is set | per component |
| `all` | every component | სტივმა ჯობსმა |

```js
import { inflectCompositeName } from "./src/composite-name-inflector.js";

const result = inflectCompositeName({
  components: [
    { key: "given", stem: "სტივ", declensionClass: "consonant" },
    { key: "surname", stem: "ჯობს", declensionClass: "consonant" },
  ],
  policy: "last",
});

console.log(result.cases.ergative.display); // სტივ ჯობსმა
```

The default reproduces exactly what inflecting the single stem `სტივ ჯობს` produces, so adopting components changes no existing form. An unknown `policy` throws (`INVALID_POLICY`) instead of guessing; `normalizeCompositePolicy()` is the lenient entry point for values that arrive from a form or a stored setting. A component's own paradigm is simply `inflectGeorgianStem()` on its own stem and class, independent of the rule.

### Spelling-guided vowels

IPA stays the source of truth, but a few English vowels cannot be told apart by IPA alone although Georgian spelling distinguishes them by how the word is written: an unstressed schwa, `/oʊ/`, and back `/ɑ/`. `src/spelling-guided-vowels.js` lines the written vowel letters up with the IPA vowel nuclei, and the aligned letter picks the Georgian vowel (a schwa spelled `a` is `ა`, spelled `e` is `ე`; `/oʊ/` is `ო` for a plain `o` and `ოუ` for `oa`, `ow`, `ou` or `o`+silent `e`).

The alignment is cautious by design. It only speaks when the surface spelling divides into exactly as many vowel units as the IPA has nuclei **and** every possible division agrees. Otherwise the earlier behavior stands: an unresolved schwa goes to an editor, `/oʊ/` is `ოუ`, `/ɑː/` is `ა`. Initialisms are exempt because they are read letter by letter. For proper names only, an unstressed vowel spelled `a` in a final `-land`, `-ham` or `-man` is written `ე` (`Portland` → `პორტლენდი`); `-man` is reported with low confidence because names of German origin keep `მან`, which neither IPA nor spelling can show. The generator passes `lexicalClass` to the engine for this reason.

R-coloured vowels (`/ɚ/`, `/ɝ/`, British `/ɜː/`, and a British schwa written with a coda `r`) are written as the aligned vowel letter plus `რ` (`Twitter` → `ტვიტერი`, `Doctor` → `დოქტორი`; American and British IPA agree because the spelling supplies the r). Letters whose Georgian treatment is inconsistent — `ir`, an unstressed `ur` or `yr`, and `ar` under stress — are deliberately left to an editor. An unstressed schwa before a word-final `l` is a syllabic `l` and writes no vowel (`apple` → `ეპლი`). The rules carry their own rule ids in the trace (`english.ipa.schwa.spelling`, `english.ipa.ou.spelling`, `english.ipa.back.spelling`).

## Source-language policy

Nationality must not be used as a shortcut for pronunciation. Each entry records the language, regional variety, optional country or region, and the evidence used for transcription. For example, Linus Torvalds is Finnish, while his name is handled from the Finland-Swedish variety and displayed compactly as `Swedish (Finland)`.

A name from a language that does not yet have a general rules engine may still be included as an individually researched and editorially approved entry. Such an entry must be labeled as a curated case; it does not imply support for arbitrary input in that language. A future Polish rules engine can therefore coexist with previously reviewed Polish personal names without changing their provenance.

## Repository metadata

Recommended GitHub repository description:

> Open-source English-to-Georgian transliteration interface with IPA, morphology, and inflection.

The repository website field should point to the deployed standalone tool until the tool is integrated at `https://eng.ge/transliterator`.

The standalone navigation keeps **eng.ge Dictionary** linked to the working dictionary homepage. That label should not point to `/transliterator`; once the production route exists, the product-name link can point there instead.

## Branding and public assets

The standalone host contains no eng.ge logo, proprietary font, or private website asset. It includes ordinary links to eng.ge and keeps branding as a host-level concern. A future eng.ge integration should supply the production header, logo, navigation, authentication, and theme without copying those private assets into this public repository.

The component's olive palette and typography hierarchy intentionally harmonize with eng.ge, but they are exposed as CSS custom properties rather than hard-coded integration dependencies. The public defaults may be reused by forks; the production eng.ge host remains free to override them. The component currently uses a system font stack and references `Noto Sans Georgian` only when it is already available on the visitor's device—it does not redistribute a font file.

Open-sourcing the interface code does not automatically license the eng.ge name, logo, or other brand identifiers. Before the first public release, add an explicit software license and a short trademark policy that distinguishes reusable code and theme tokens from eng.ge brand assets. Any font files added later must retain their own license and attribution files.

No private eng.ge backend code, database records, user submissions, moderation notes, secrets, or licensed third-party pronunciation assets belong in this repository.
