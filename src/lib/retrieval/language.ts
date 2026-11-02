/**
 * Language-aware text processing foundations for en / am / om.
 * Experimental — not production-grade NLP or translation.
 */

export type ContentLanguage = "en" | "am" | "om" | "mixed" | "unknown";

const ETHIOPIC = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/;
const LATIN_LETTER = /[A-Za-z\u00C0-\u024F]/;

export function detectScriptLanguage(text: string): ContentLanguage {
  if (!text || !text.trim()) return "unknown";
  const eth = (text.match(new RegExp(ETHIOPIC.source, "g")) || []).length;
  const latin = (text.match(new RegExp(LATIN_LETTER.source, "g")) || []).length;
  if (eth > 0 && latin > eth * 2) return "mixed";
  if (eth > latin) return "am";
  if (latin > 0) return "en";
  return "unknown";
}

/** Prefer explicit user language when script detection is ambiguous. */
export function resolveLanguage(text: string, preferred?: ContentLanguage | null): ContentLanguage {
  if (preferred && preferred !== "unknown" && preferred !== "mixed") {
    const detected = detectScriptLanguage(text);
    if (detected === "unknown" || detected === preferred) return preferred;
    if (detected === "am" && preferred === "am") return "am";
    if (detected === "en" && (preferred === "en" || preferred === "om")) return preferred;
    if (detected === "mixed") return "mixed";
  }
  return detectScriptLanguage(text);
}

export function normalizeForSearch(text: string, language: ContentLanguage = "unknown"): string {
  const nfc = text.normalize("NFC");
  if (language === "am" || ETHIOPIC.test(nfc)) {
    return nfc.replace(/\s+/g, " ").trim();
  }
  return nfc.toLowerCase().replace(/\s+/g, " ").trim();
}

export function tokenizeLanguageAware(text: string, language: ContentLanguage = "unknown"): string[] {
  const normalized = normalizeForSearch(text, language);
  if (language === "am" || ETHIOPIC.test(text)) {
    return normalized
      .split(/[^\u1200-\u137F\u1380-\u139FA-Za-z0-9]+/)
      .filter((t) => t.length > 0);
  }
  return normalized
    .split(/[^a-z0-9'\u00C0-\u024F]+/i)
    .map((t) => t.replace(/^'+|'+$/g, ""))
    .filter((t) => t.length > 1);
}

/** Lightweight sentence split — preserves original text; experimental for Ethiopic. */
export function segmentSentences(text: string, language: ContentLanguage = "unknown"): string[] {
  const nfc = text.normalize("NFC").trim();
  if (!nfc) return [];
  if (language === "am" || ETHIOPIC.test(nfc)) {
    return nfc
      .split(/(?<=[።!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return nfc
    .split(/(?<=[.!?])\s+(?=[A-Z\u00C0-\u024F])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function segmentParagraphs(text: string): string[] {
  return text
    .normalize("NFC")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  en: "English",
  am: "Amharic",
  om: "Afaan Oromo",
  mixed: "Mixed",
  unknown: "Unknown",
};
