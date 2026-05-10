/**
 * Get the CSS class name for a game result badge.
 */
export function resultClass(result: string | undefined): string {
  if (result === '1-0') return 'result-white';
  if (result === '0-1') return 'result-black';
  return 'result-draw';
}

/**
 * Extract SAN moves from PGN movetext, stripping comments/variations/NAGs.
 */
export function extractSanMoves(pgn: string): string[] {
  return pgn
    .replace(/\{[^}]*\}/g, '') // strip comments
    .replace(/\([^)]*\)/g, '') // strip variations (non-nested)
    .replace(/\$\d+/g, '') // strip NAGs
    .replace(/(1-0|0-1|1\/2-1\/2|\*)$/g, '') // strip result
    .replace(/\d+\.{1,3}/g, '') // strip move numbers
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0 && /^[A-Za-z]/.test(t));
}

/**
 * Parse the first [%ts M:SS] annotation into seconds.
 */
export function parseFirstTimestamp(pgn: string): number {
  const match = pgn.match(/\[%ts\s+(\d+):(\d+)\]/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}
