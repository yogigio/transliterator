import { validateGeneratorRequest } from "./generator-request.js?v=0.10.12";
import { resolveGenerationPolicy } from "./generation-policies.js?v=0.10.12";

export function createTransliterationGenerator({ candidateService } = {}) {
  if (!candidateService || typeof candidateService.suggest !== "function") {
    throw new TypeError("candidateService.suggest is required");
  }

  return Object.freeze({
    async generate(input, options = {}) {
      const request = validateGeneratorRequest(input);
      const policy = resolveGenerationPolicy(request);
      const result = await candidateService.suggest(request.term, {
        ...options,
        generationPolicy: policy.id,
        readingType: policy.strategy.expectedReadingType,
        morphologyProfile: policy.morphologyProfile,
        lexicalClass: request.lexicalClass,
      });
      const warnings = policy.checks.map(({ message }) => message);

      if (result.status !== "not_found" && result.readingType !== policy.strategy.expectedReadingType) {
        warnings.push("The selected pronunciation strategy conflicts with the authoritative pronunciation record.");
        return Object.freeze({
          ...result,
          status: "editor_review",
          suggestions: Object.freeze([]),
          request,
          policy,
          warnings: Object.freeze(warnings),
          reason: "reading_type_mismatch",
        });
      }

      return Object.freeze({
        ...result,
        request,
        policy,
        warnings: Object.freeze(warnings),
      });
    },
  });
}
