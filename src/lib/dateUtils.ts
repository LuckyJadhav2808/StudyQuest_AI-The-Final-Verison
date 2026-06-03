/**
 * Returns the current date in YYYY-MM-DD format based on local system time.
 * This ensures daily logins, habit checks, and daily quests align with
 * the user's actual local calendar days regardless of timezone.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the local date string for yesterday.
 * Uses Date.setDate to safely handle month/year rollbacks and DST changes.
 */
export function getLocalYesterdayDateString(date: Date = new Date()): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday);
}
