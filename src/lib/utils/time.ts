import { formatDistanceToNowStrict } from 'date-fns';

/** "posted 3 hours ago" / "posted 12 minutes ago" style relative time. */
export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${formatDistanceToNowStrict(d, { addSuffix: true })}`;
}
