# eng.ge Transliterator

An open-source interface for looking up how international names and terms should be written and inflected in Georgian. The project is designed as both a standalone tool and an embeddable component for future use on eng.ge.

This repository currently implements the agreed interface model with public sample fixtures. It does **not** yet implement English-to-Georgian linguistic rules or publish an approved dataset.

## Current interface

The prototype includes:

- international name and term lookup;
- real-time, keyboard-accessible autocomplete for terms already in the provider;
- separate lexical class and entity type, displayed together (for example, `Proper noun · Brand`);
- source language, region, and transcription basis stored separately from a person's nationality;
- expanded forms and abbreviation types for abbreviated entries;
- American and British IPA variants;
- approved-entry and clearly differentiated automatic-suggestion states;
- Georgian spelling, stem, ending class, and final-`ი` analysis;
- explicitly reviewed incorrect forms, presented as “Forms to avoid” with text and strikethrough in addition to color;
- Georgian and conditional Latin-script inflection tables;
- whole-expression and component views for composite names;
- provenance and entry metadata;
- correction and missing-entry submission events for host integration, with an optional editorial stem hint;
- responsive light and dark themes.

Approved entries are the unmarked default. Exceptional states such as automatic suggestions are explicitly labeled. Unconfirmed linguistic forms remain visibly pending rather than being invented.

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
tests/sample-provider.test.mjs     provider contract tests
```

The `<eng-transliterator>` component uses Shadow DOM so the standalone shell and a future eng.ge host cannot accidentally override one another. The host can theme it with the documented `--tool-*` custom properties or set `theme="dark"`.

```html
<script type="module" src="/path/to/transliterator-element.js"></script>
<eng-transliterator></eng-transliterator>
```

The component emits these integration events:

- `entrysearch` with `{ query }`;
- `entryselect` with `{ entry }`;
- `submissionrequest` with either a `correction` payload (`entryId`, `englishTerm`, `spelling`, optional `stem`, and `note`) or a `new-entry` payload (`englishTerm`, `category`, optional `spelling`, optional `stem`, and optional `note`).

The submission UI treats a stem as optional supporting information. It is hidden behind an “Add stem” disclosure, reviewed by editors, and never accepted as an authoritative form merely because a contributor supplied it.

Searches are reflected in the `?q=` URL parameter, so results can be bookmarked and browser Back/Forward navigation restores the corresponding result. Theme preference is stored locally in the browser.

The sample provider is deliberately replaceable. Production eng.ge can connect the component to the versioned `/transcription/v1` API, while forks can implement a local provider or another compatible API.

## Linguistic rule boundary

Transcription and inflection behavior must not be inferred from generic conventions. Each future rule needs an owner-approved description, examples, exceptions, and counterexamples. Approved examples should become golden regression fixtures before an engine begins generating public results.

The current inflection tables therefore show the intended case structure and script capabilities without filling unapproved forms.

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

The source code is available under the [Apache License 2.0](LICENSE). This software license does not grant rights to the eng.ge name, logo, or other brand identifiers. Any font files added later must retain their own license and attribution files.

No private eng.ge backend code, database records, user submissions, moderation notes, secrets, or licensed third-party pronunciation assets belong in this repository.
