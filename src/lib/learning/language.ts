/**
 * Multilingual intelligence foundation.
 * Sirius must not hard-code English-only assumptions forever.
 * Current runtime tokenizers remain Latin-script oriented; this module
 * defines the interfaces and honest limitations for Amharic / Afaan Oromo.
 */

export type SupportedLanguageCode = "en" | "am" | "om" | "und";

export interface LanguageMeta {
  code: SupportedLanguageCode;
  label: string;
  /** True when tokenization and comparison are production-ready for this language */
  processingReady: boolean;
  notes: string;
}

export const LANGUAGE_REGISTRY: LanguageMeta[] = [
  {
    code: "en",
    label: "English",
    processingReady: true,
    notes: "Primary offline heuristic language.",
  },
  {
    code: "am",
    label: "Amharic",
    processingReady: false,
    notes:
      "Ethiopic script. Whitespace-based fallback only; do not claim accurate stemming or synonym matching until language-specific tests exist.",
  },
  {
    code: "om",
    label: "Afaan Oromo",
    processingReady: false,
    notes:
      "Latin orthography common in education materials, but morphology differs from English. Heuristic overlap is a weak signal only.",
  },
  {
    code: "und",
    label: "Undetermined",
    processingReady: false,
    notes: "Preserve original text; avoid aggressive normalization.",
  },
];

export interface TextNormalizer {
  language: SupportedLanguageCode;
  normalize(text: string): string;
  tokenize(text: string): string[];
}

/**
 * Default normalizer — suitable for English / Latin-script text.
 * For Amharic and Oromo, callers should supply a specialized implementation
 * once language resources and tests are available.
 */
export function createDefaultNormalizer(language: SupportedLanguageCode = "en"): TextNormalizer {
  return {
    language,
    normalize(text: string) {
      if (language === "am") {
        // Preserve Ethiopic characters; only collapse whitespace
        return text.replace(/\s+/g, " ").trim();
      }
      return text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\u1200-\u137F\s'-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    },
    tokenize(text: string) {
      const n = this.normalize(text);
      if (!n) return [];
      if (language === "am") {
        // Character n-grams would be more appropriate; space split is a placeholder.
        return n.split(/\s+/).filter(Boolean);
      }
      return n.split(/\s+/).filter((t) => t.length > 1);
    },
  };
}

export function languageLimitationsSummary(): string {
  return LANGUAGE_REGISTRY.filter((l) => !l.processingReady)
    .map((l) => `${l.label}: ${l.notes}`)
    .join(" ");
}
