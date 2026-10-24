/** Minute precision for the editor; campaignInstant preserves untouched seconds. */
export function localDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function validCampaignDates(start: string, end: string, originalStart?: string, originalEnd?: string): boolean {
  const from = new Date(originalStart && start === localDateTime(originalStart) ? originalStart : start).getTime();
  const to = new Date(originalEnd && end === localDateTime(originalEnd) ? originalEnd : end).getTime();
  return Number.isFinite(from) && to > from;
}

export function campaignInstant(value: string, original?: string): string {
  // A repeated local hour at the autumn DST change can represent two instants.
  // An untouched field must retain the originally stored one.
  if (original && value === localDateTime(original)) return original;
  return new Date(value).toISOString();
}
