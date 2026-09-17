const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * "Resets 1 <Month>" — `UsageSummary` carries no reset date of its own, but
 * Cygnus's own quota-exceeded message says resets happen "on the 1st", and
 * `Accounts.effective_allowance` is a calendar-month count, so the 1st of
 * next month (UTC, matching how the count itself resets) is exact, not a
 * guess.
 */
export function nextResetLabel(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const nextMonth = (month + 1) % 12;
  const nextYear = month === 11 ? year + 1 : year;
  return `1 ${MONTHS[nextMonth]} ${nextYear}`;
}
