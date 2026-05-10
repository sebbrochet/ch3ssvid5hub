export default {
  /** Ch3ssVid5 instance for import URLs */
  ch3ssvid5: {
    baseUrl: 'https://ch3ssvid5.sebbrochet.com/',
  },

  /** PGN source directory (relative to project root) */
  pgnDir: 'pgn',

  /** Catalog output directory (relative to project root) */
  catalogDir: 'public/catalog',

  /** PGN output directory (copied for serving, relative to project root) */
  pgnPublicDir: 'public/pgn',

  /** Required PGN headers (build warns if missing) */
  requiredHeaders: ['Event', 'White', 'Black', 'Result', 'VideoURL'],
};
