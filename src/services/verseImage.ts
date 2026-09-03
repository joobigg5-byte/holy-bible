/**
 * Render a verse as a shareable image, in whichever theme the reader is using.
 *
 * Drawn on a canvas rather than fetched, so it works offline and costs nothing.
 * Uses the Web Share API where available (a real share sheet on phones) and
 * falls back to a download on desktop.
 */

interface Options {
  text: string;
  reference: string;
  translation?: string;
  /** Square suits Instagram and WhatsApp status; portrait suits stories. */
  shape?: 'square' | 'portrait';
}

function themeColours() {
  const style = getComputedStyle(document.documentElement);
  const hsl = (name: string, fallback: string) => {
    const v = style.getPropertyValue(name).trim();
    return v ? `hsl(${v})` : fallback;
  };
  return {
    bg: hsl('--sacred-black', '#000000'),
    text: hsl('--gold-metallic', '#caa444'),
    accent: hsl('--gold-bright', '#ffd800'),
    faint: hsl('--gold-veil', '#6d5721'),
    line: hsl('--gold-dark', '#332400'),
  };
}

/** Greedy wrap. Returns the lines and the font size that made them fit. */
function layout(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  startSize: number,
) {
  for (let size = startSize; size >= 24; size -= 2) {
    ctx.font = `${size}px Georgia, "Times New Roman", serif`;
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= maxLines) return { lines, size };
  }
  return { lines: [text], size: 24 };
}

export async function renderVerseImage({
  text, reference, translation, shape = 'square',
}: Options): Promise<Blob | null> {
  const W = 1080;
  const H = shape === 'portrait' ? 1920 : 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const c = themeColours();

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  // Soft glow behind the text, echoing the app icon
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  glow.addColorStop(0, c.line);
  glow.addColorStop(1, c.bg);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  const margin = W * 0.12;
  const maxWidth = W - margin * 2;

  const { lines, size } = layout(ctx, `"${text}"`, maxWidth, shape === 'portrait' ? 14 : 9, 62);
  const lineHeight = size * 1.6;
  const blockHeight = lines.length * lineHeight;
  let y = H / 2 - blockHeight / 2 + lineHeight * 0.35;

  ctx.textAlign = 'center';
  ctx.fillStyle = c.text;
  ctx.font = `${size}px Georgia, "Times New Roman", serif`;
  for (const line of lines) {
    ctx.fillText(line, W / 2, y);
    y += lineHeight;
  }

  // Rule and reference
  y += lineHeight * 0.5;
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 90, y);
  ctx.lineTo(W / 2 + 90, y);
  ctx.stroke();

  y += lineHeight * 0.9;
  ctx.fillStyle = c.accent;
  ctx.font = `36px Georgia, "Times New Roman", serif`;
  ctx.fillText(translation ? `${reference} · ${translation}` : reference, W / 2, y);

  // Quiet mark at the foot
  ctx.fillStyle = c.faint;
  ctx.font = '24px Georgia, serif';
  ctx.fillText('The Holy Bible', W / 2, H - margin * 0.55);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.95));
}

/** Share the verse, or download it if the browser has no share sheet. */
export async function shareVerseImage(opts: Options): Promise<'shared' | 'downloaded' | 'failed'> {
  const blob = await renderVerseImage(opts);
  if (!blob) return 'failed';

  const file = new File([blob], `${opts.reference.replace(/[^\w]+/g, '-')}.png`, {
    type: 'image/png',
  });

  const nav = navigator as Navigator & {
    canShare?: (d: ShareData) => boolean;
    share?: (d: ShareData) => Promise<void>;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], text: `${opts.text}\n\n— ${opts.reference}` });
      return 'shared';
    } catch {
      return 'failed'; // user cancelled, or the share sheet refused
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
