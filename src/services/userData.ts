/**
 * Export and restore everything a reader has created.
 *
 * All annotation lives in localStorage. There are no accounts and no sync,
 * which keeps the app private and sign-in free — but it also means clearing
 * browser data silently destroys years of notes with no recovery. Export is
 * the honest safety net for that trade-off.
 *
 * Two formats:
 *   JSON      — complete and re-importable
 *   Markdown  — readable, for keeping somewhere outside the app
 */

const KEYS = {
  highlights: 'bible_highlights',
  notes: 'bible_notes',
  notesMeta: 'bible_notes_meta',
  bookmarks: 'bible_bookmarks',
  recents: 'bibleReader:recents',
  streak: 'aihb_streak',
  lastVisit: 'aihb_last_visit',
  textSize: 'aihb_text_size',
  veil: 'aihb_veil_mode',
  ownQuotes: 'aihb_own_quotes',
  decision: 'aihb_decision',
} as const;

export interface Backup {
  format: 'holy-bible-backup';
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

function readKey(key: string): unknown {
  const raw = localStorage.getItem(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // plain strings like the streak count
  }
}

export function buildBackup(): Backup {
  const data: Record<string, unknown> = {};
  for (const [name, key] of Object.entries(KEYS)) {
    const value = readKey(key);
    if (value !== undefined) data[name] = value;
  }
  return {
    format: 'holy-bible-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

function download(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so Safari has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportJson() {
  download(
    `holy-bible-${stamp()}.json`,
    JSON.stringify(buildBackup(), null, 2),
    'application/json',
  );
}

/** Human-readable export — notes, highlights and bookmarks as Markdown. */
export function exportMarkdown() {
  const { data } = buildBackup();
  const lines: string[] = [
    '# The Holy Bible',
    '',
    `Exported ${new Date().toLocaleDateString()}`,
    '',
  ];

  const notes = data.notes as Record<string, string> | undefined;
  if (notes && Object.keys(notes).length) {
    lines.push('## Notes', '');
    for (const [ref, body] of Object.entries(notes)) {
      if (!body?.trim()) continue;
      lines.push(`### ${ref}`, '', body.trim(), '');
    }
  }

  const highlights = data.highlights as Record<string, string> | undefined;
  if (highlights && Object.keys(highlights).length) {
    lines.push('## Highlights', '');
    for (const [ref, colour] of Object.entries(highlights)) {
      lines.push(`- ${ref} _(${colour})_`);
    }
    lines.push('');
  }

  const bookmarks = data.bookmarks as string[] | undefined;
  if (Array.isArray(bookmarks) && bookmarks.length) {
    lines.push('## Bookmarks', '');
    for (const ref of bookmarks) lines.push(`- ${ref}`);
    lines.push('');
  }

  const own = data.ownQuotes as Array<{ text: string; speaker: string; note?: string }> | undefined;
  if (Array.isArray(own) && own.length) {
    lines.push('## Saved teachings', '');
    for (const q of own) {
      lines.push(`> ${q.text}`, '', `— ${q.speaker}`, '');
      if (q.note) lines.push(q.note, '');
    }
  }

  if (lines.length <= 4) lines.push('_Nothing saved yet._');

  download(`holy-bible-${stamp()}.md`, lines.join('\n'), 'text/markdown');
}

export interface RestoreResult {
  ok: boolean;
  restored: string[];
  error?: string;
}

/**
 * Merge a backup back in. Existing values are overwritten only for keys present
 * in the file, so restoring an old backup never wipes newer work in other areas.
 */
export async function restoreBackup(file: File): Promise<RestoreResult> {
  try {
    const parsed = JSON.parse(await file.text()) as Backup;
    if (parsed?.format !== 'holy-bible-backup') {
      return { ok: false, restored: [], error: 'That does not look like a Holy Bible backup.' };
    }

    const restored: string[] = [];
    for (const [name, key] of Object.entries(KEYS)) {
      const value = parsed.data?.[name];
      if (value === undefined) continue;
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      restored.push(name);
    }
    return { ok: true, restored };
  } catch {
    return { ok: false, restored: [], error: 'That file could not be read.' };
  }
}
