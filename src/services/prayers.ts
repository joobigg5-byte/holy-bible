/**
 * Prayer list.
 *
 * Requests, the date they were made, and a record when they are answered.
 * Looking back over answered prayers is the part people find most meaningful,
 * so answered entries are kept rather than deleted.
 *
 * Device only. Never transmitted. Included in the backup export.
 */

const KEY = 'aihb_prayers';

export interface Prayer {
  id: string;
  text: string;
  /** Optional — who or what it concerns. */
  about?: string;
  createdAt: string;
  answeredAt?: string;
  /** What happened, written when marking it answered. */
  answerNote?: string;
}

function read(): Prayer[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Prayer[];
  } catch {
    return [];
  }
}

function write(list: Prayer[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

export function getPrayers(): Prayer[] {
  return read();
}

export function addPrayer(text: string, about?: string): Prayer[] {
  const list = read();
  list.unshift({
    id: String(Date.now()),
    text: text.trim(),
    about: about?.trim() || undefined,
    createdAt: new Date().toISOString(),
  });
  return write(list);
}

export function markAnswered(id: string, answerNote?: string): Prayer[] {
  return write(
    read().map((p) =>
      p.id === id
        ? { ...p, answeredAt: new Date().toISOString(), answerNote: answerNote?.trim() || undefined }
        : p,
    ),
  );
}

export function reopenPrayer(id: string): Prayer[] {
  return write(
    read().map((p) =>
      p.id === id ? { ...p, answeredAt: undefined, answerNote: undefined } : p,
    ),
  );
}

export function deletePrayer(id: string): Prayer[] {
  return write(read().filter((p) => p.id !== id));
}

/** Days a request has been carried, for a quiet note beside it. */
export function daysCarried(p: Prayer): number {
  const end = p.answeredAt ? new Date(p.answeredAt) : new Date();
  return Math.max(0, Math.floor((end.getTime() - new Date(p.createdAt).getTime()) / 86_400_000));
}
