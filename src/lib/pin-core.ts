/** Shared PIN rules (safe for client and server bundles). */

export const WEAK_PINS = new Set([
  "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999",
  "1234", "4321", "1122", "1212", "0123", "3210", "9876", "6789",
  "0007", "2580", "1004", "2023", "2024", "2025", "2026",
]);

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin) && !WEAK_PINS.has(pin);
}

/** Random 4-digit PIN candidate (may still be weak — caller should filter). */
export function randomPinCandidate(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
