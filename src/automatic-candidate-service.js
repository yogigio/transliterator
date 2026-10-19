import { transcribeEnglishIpa } from "./english-ipa-engine.js";

export function createAutomaticCandidateService({ pronunciationProvider } = {}) {
  if (!pronunciationProvider || typeof pronunciationProvider.lookup !== "function") {
    throw new TypeError("pronunciationProvider.lookup is required");
  }

  return Object.freeze({
    async suggest(surface, options = {}) {
      const term = String(surface ?? "").trim();
      if (!term) return Object.freeze({ status: "not_found", term, suggestions: Object.freeze([]) });

      const record = await pronunciationProvider.lookup(term, options);
      if (!record) return Object.freeze({ status: "not_found", term, suggestions: Object.freeze([]) });

      const suggestions = record.pronunciations.map((pronunciation) => transcribeEnglishIpa({
        surface: record.term,
        language: record.language,
        readingType: record.readingType,
        variety: pronunciation.variety,
        ipa: pronunciation.ipa,
        pronunciationSource: pronunciation.source,
        morphologyProfile: options.morphologyProfile,
      }));
      const publicSuggestions = suggestions.filter(({ publicEligible, candidate }) => publicEligible && candidate);

      return Object.freeze({
        status: publicSuggestions.length ? "candidate" : "editor_review",
        term: record.term,
        readingType: record.readingType,
        suggestions: Object.freeze(publicSuggestions),
        editorialResults: Object.freeze(suggestions),
      });
    },
  });
}
