/**
 * Build stamp. Shown at the bottom of Settings so you can tell at a glance
 * which build is actually running — file dates and browser caches lie.
 */
export const BUILD = {
  /** Public version, shown to readers and sent to the support form. */
  version: '1.0',
  /** Internal build id, for pinning down which code someone is running. */
  id: 'HB-35',
  date: '2026-08-23',
  translations: 17,
  features: [
    'Library hub',
    'Full-text search',
    'Cross-references',
    'Bible dictionary',
    'Places, then and now',
    'Matthew Henry commentary',
    'Spurgeon devotional',
    'Hymns',
    'Parallel reading',
    'Sleep timer',
    'Apocrypha and ancient writings',
    '365-day lectionary',
    'Coming to Christ',
    'Wisdom and teaching',
    'Backup and restore',
    'Colour themes',
    'Lock-screen audio controls',
    'Share a verse as an image',
    'Reading progress and history',
    'Prayer list',
    'Reading plans',
    'Four-part hymn tunes played in the browser',
    "Strong's Hebrew and Greek",
    'Projection with spoken verse detection',
    "Nave's Topical Bible",
    'Hebrew and Greek letter origins',
  ],
} as const;
