/**
 * Format a GeoGebra object label for natural Vietnamese TTS pronunciation.
 *
 * Vietnamese TTS reads "CE" as one syllable ("xê"). We must insert spaces so
 * the synthesizer treats each character as a separate spoken letter.
 *
 * Rules:
 *   "CE"   → "C E"        (uppercase letter run → spaced)
 *   "BCE"  → "B C E"
 *   "t1"   → "t 1"        (letter + digit → spaced)
 *   "f"    → "f"          (single char, fine as-is)
 *   "d"    → "d"          (single char)
 *
 * Intentionally NOT applied to multi-word phrases — only to compact labels.
 */
export function labelForTts(label: string): string {
  const t = label.trim();
  if (t.length <= 1) return t;

  // Insert a space between every pair of chars in sequences that are purely
  // letters / digits — i.e. math object names like "BCE", "t1", "AB".
  // We do this only when ALL characters are letters or digits (no spaces).
  if (/^[A-Za-z0-9]+$/.test(t)) {
    return t.split('').join(' ');
  }

  // For labels like "(2, 3)" or "x^2" — leave untouched.
  return t;
}

/**
 * Rewrite math labels embedded in an explanation string so TTS reads
 * each character separately. Matches uppercase-letter runs of 2+ chars
 * (e.g. "BCE", "ABE") that appear as standalone tokens (bounded by
 * spaces, punctuation, or start/end of string).
 *
 * Used in templates AFTER the full sentence is assembled.
 */
export function formatTextForTts(text: string): string {
  // Match 2–5 uppercase Latin letters standing alone as a token.
  return text.replace(/(?<![A-Za-z])([A-Z]{2,5})(?![A-Za-z])/g, (match) =>
    match.split('').join(' '),
  );
}
