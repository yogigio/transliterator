import { createInMemoryPronunciationProvider } from "./pronunciation-provider.js?v=0.10.2";

const editorialSource = Object.freeze({
  label: "Approved IPA regression fixture",
  reliability: "editorial",
});

export const regressionPronunciationRecords = Object.freeze([
  Object.freeze({
    term: "win",
    language: "English",
    readingType: "ordinary_word",
    pronunciations: Object.freeze([
      Object.freeze({ ipa: "/wɪn/", variety: "General American", source: editorialSource }),
    ]),
  }),
  Object.freeze({
    term: "city",
    language: "English",
    readingType: "ordinary_word",
    pronunciations: Object.freeze([
      Object.freeze({ ipa: "/ˈsɪti/", variety: "General American", source: editorialSource }),
    ]),
  }),
  Object.freeze({
    term: "Lee",
    language: "English",
    readingType: "ordinary_word",
    pronunciations: Object.freeze([
      Object.freeze({ ipa: "/liː/", variety: "General English", source: editorialSource }),
    ]),
  }),
  Object.freeze({
    term: "PHP",
    language: "English",
    readingType: "initialism",
    pronunciations: Object.freeze([
      Object.freeze({ ipa: "/piːeɪtʃpiː/", variety: "General English", source: editorialSource }),
    ]),
  }),
  Object.freeze({
    term: "CNN",
    language: "English",
    readingType: "initialism",
    pronunciations: Object.freeze([
      Object.freeze({ ipa: "/siːɛnɛn/", variety: "General English", source: editorialSource }),
    ]),
  }),
]);

export const regressionPronunciationProvider = createInMemoryPronunciationProvider(regressionPronunciationRecords);
