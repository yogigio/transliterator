const GEORGIAN_LETTER_NAME = /^[\u10A0-\u10FF]+$/u;

/**
 * Joins already-transcribed English letter names into one Georgian word.
 * Internal hyphens and spaces are deliberately not inserted.
 */
export function composeGeorgianInitialism(letterNames) {
  if (!Array.isArray(letterNames) || letterNames.length === 0) {
    throw new TypeError("letterNames must be a non-empty array");
  }

  letterNames.forEach((letterName) => {
    if (typeof letterName !== "string" || !GEORGIAN_LETTER_NAME.test(letterName)) {
      throw new TypeError("Each letter name must contain Georgian letters only");
    }
  });

  return letterNames.join("");
}
