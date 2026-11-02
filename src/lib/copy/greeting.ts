/** Stable fallback used before the browser clock is available. */
export const GREETING_FALLBACK = "Hello";

export function greetingForHour(hour: number): string {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return GREETING_FALLBACK;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function greeting(date = new Date()): string {
  return greetingForHour(date.getHours());
}
