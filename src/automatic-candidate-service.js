import { transcribeEnglishIpa } from "./english-ipa-engine.js?v=0.10.8";

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
        lexicalClass: options.lexicalClass,
      }));
      const publicSuggestions = suggestions.filter(({ publicEligible, candidate }) => publicEligible && candidate);
      const machineSuggestions = suggestions.filter(({ pronunciationSource, candidate }) => (
        pronunciationSource?.reliability === "machine" && candidate
      ));
      const displayedSuggestions = publicSuggestions.length ? publicSuggestions : machineSuggestions;

      return Object.freeze({
        status: publicSuggestions.length ? "candidate" : (machineSuggestions.length ? "machine_candidate" : "editor_review"),
        term: record.term,
        readingType: record.readingType,
        suggestions: Object.freeze(displayedSuggestions),
        editorialResults: Object.freeze(suggestions),
      });
    },
  });
}
