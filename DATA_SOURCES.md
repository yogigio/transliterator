# Pronunciation data sources

No bulk third-party pronunciation dataset is committed to this repository. Production deployments should import permitted data into their own pronunciation store and expose only the validated record contract documented in `README.md`.

## Resolution order

1. eng.ge editorial records and overrides
2. English Wiktionary extracted with Wiktextract or downloaded from Kaikki
3. CMU Pronouncing Dictionary, converted deterministically from ARPAbet to IPA
4. optional machine-generated pronunciation, only after every stored source misses

An editorial record always wins. Imported records must retain the source URL, source license, dataset version or snapshot date, English variety, and import timestamp. Do not merge pronunciations while discarding their individual provenance.

## Wiktionary and Wiktextract

- Extractor: <https://github.com/tatuylonen/wiktextract>
- Pre-extracted data: <https://kaikki.org/dictionary/rawdata.html>
- Source terms: <https://en.wiktionary.org/wiki/Wiktionary:Copyrights>
- Record reliability label: `community`

Wiktextract software is MIT-licensed. Extracted entry content retains the applicable Wiktionary CC BY-SA/GFDL terms. A deployment that redistributes imported content must provide the required attribution, license notice, and share-alike treatment where applicable. Audio files may carry separate licenses and are outside the current import scope.

## CMU Pronouncing Dictionary

- Repository: <https://github.com/cmusphinx/cmudict>
- License and attribution terms: <https://github.com/cmusphinx/cmudict/blob/master/LICENSE>
- Record reliability label: `converted`

CMUdict covers North American English and uses ARPAbet. The included converter produces IPA deterministically and preserves the CMUdict origin in every record. Converted output is pronunciation evidence, not an approved Georgian spelling.

## Machine fallback

Machine fallback is not an authoritative source. It is disabled by default and runs only when the server explicitly passes `allowMachineFallback: true`. Its output:

- is cached by normalized term and reading type;
- is labeled `machine` with model/version metadata;
- is displayed as a low-confidence machine estimate;
- cannot enter the trusted public-candidate tier;
- always requires editorial review.

A local grapheme-to-phoneme model is preferred because it has no per-request token cost. If a language model is used, request one compact structured response containing IPA and variety, use the smallest model that passes evaluation, and never request explanations or chain-of-thought. Do not send user identity, account data, or submission notes with the term.
