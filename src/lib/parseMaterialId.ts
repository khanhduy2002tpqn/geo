/**
 * Extract a GeoGebra material ID from a share URL or a bare ID string.
 *
 * Supported formats:
 *   https://www.geogebra.org/classic/jyvesbjk
 *   https://www.geogebra.org/m/jyvesbjk
 *   https://www.geogebra.org/graphing/jyvesbjk
 *   https://geogebra.org/m/jyvesbjk
 *   jyvesbjk  (bare ID)
 *
 * Returns null if the input does not contain a recognizable material ID.
 */
export function parseMaterialId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Bare ID: only alphanumeric characters (typically 8 chars).
  if (/^[a-zA-Z0-9]{4,16}$/.test(trimmed)) return trimmed.toLowerCase();

  try {
    const url = new URL(trimmed);
    const isGeoGebra =
      url.hostname === 'www.geogebra.org' || url.hostname === 'geogebra.org';
    if (!isGeoGebra) return null;

    // Match /m/<id>, /classic/<id>, /graphing/<id>, /geometry/<id>, /suite/<id>
    const match = url.pathname.match(
      /^\/(m|classic|graphing|geometry|suite)\/([a-zA-Z0-9]{4,16})/,
    );
    return match?.[2]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}
