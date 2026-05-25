// ============================================
// PIN utilities — hash, localStorage, generation
// ============================================

import { isValidPinFormat, WEAK_PINS, randomPinCandidate } from "./pin-core";

const STORAGE_KEY = "sponsortrack-pins";

/**
 * Hash a 4-digit PIN using SHA-256 (browser-native).
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a random 4-digit PIN.
 */
export function generatePin(): string {
  for (let i = 0; i < 20; i++) {
    const pin = randomPinCandidate();
    if (isValidPinFormat(pin)) return pin;
  }
  return randomPinCandidate();
}

function getPinStore(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePinStore(store: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Save a PIN hash for an application after creating / claiming. */
export function savePinForApp(appId: string, pinHash: string) {
  const store = getPinStore();
  store[appId] = pinHash;
  savePinStore(store);
}

/** Get saved PIN hash (returns null if not stored locally). */
export function getSavedPinHash(appId: string): string | null {
  return getPinStore()[appId] || null;
}

/** Remove saved PIN (after deletion). */
export function removeSavedPin(appId: string) {
  const store = getPinStore();
  delete store[appId];
  savePinStore(store);
}

/** Check if user has the correct PIN saved. */
export function hasValidPin(appId: string, expectedHash: string): boolean {
  return getSavedPinHash(appId) === expectedHash;
}

/** Validate PIN format: exactly 4 digits and not a common weak PIN. */
export function isValidPin(pin: string): boolean {
  return isValidPinFormat(pin);
}

/** Check if a PIN is weak (for showing warnings). */
export function isWeakPin(pin: string): boolean {
  return /^\d{4}$/.test(pin) && WEAK_PINS.has(pin);
}
