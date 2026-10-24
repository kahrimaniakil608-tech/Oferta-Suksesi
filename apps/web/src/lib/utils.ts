const IMG_BASE = (process.env.NEXT_PUBLIC_IMAGE_URL ?? 'http://localhost:4001').replace(/\/$/, '');

export function imgSrc(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.replace(/^\//, '');
  const prefix = clean.startsWith('uploads/') ? '' : 'uploads/';
  return `${IMG_BASE}/${prefix}${clean}`;
}

export function timeAgo(dateString: string | Date): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60)    return 'Tani';
  if (seconds < 3600)  return `${Math.floor(seconds / 60)} min më parë`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} orë më parë`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} ditë më parë`;
  return `${Math.floor(seconds / 604800)} javë më parë`;
}

export function formatPrice(price: number): string {
  return `${price.toLocaleString('de-DE')} €`;
}

/** Sanitize a user-supplied URL to prevent javascript: and data: XSS. */
export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^mailto:/i.test(trimmed)) return trimmed;
  if (/^tel:/i.test(trimmed)) return trimmed;
  return undefined;
}
