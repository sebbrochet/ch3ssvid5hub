const CH3SSVID5_PROD = 'https://ch3ssvid5.sebbrochet.com/';

/**
 * Get the Ch3ssVid5 base URL.
 * In dev mode, uses the same host as the Hub but on port 5173 (Ch3ssVid5 dev server).
 * In production, uses the deployed Ch3ssVid5 domain.
 */
export function getCh3ssVid5Url(): string {
  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:5173/`;
  }
  return CH3SSVID5_PROD;
}

/**
 * Build the absolute PGN file URL from a relative path.
 * In dev mode uses the current origin; in production uses the deployed Hub domain.
 */
export function buildPgnFileUrl(pgnPath: string): string {
  const base = window.location.origin + import.meta.env.BASE_URL;
  return `${base}${pgnPath}`;
}

/**
 * Build the one-click import URL for Ch3ssVid5.
 * Opens the game in Ch3ssVid5 with the PGN pre-loaded into the specified library folder.
 */
export function buildImportUrl(pgnPath: string, folder: string): string {
  const pgnFileUrl = buildPgnFileUrl(pgnPath);
  const ch3ssvid5Base = getCh3ssVid5Url();
  return `${ch3ssvid5Base}?pgn=${encodeURIComponent(pgnFileUrl)}&folder=${encodeURIComponent(folder)}`;
}

/**
 * Build the library folder path from youtuber handle + playlist name.
 */
export function buildFolder(youtuber: string, playlist: string): string {
  return `${youtuber}/${playlist}`;
}
