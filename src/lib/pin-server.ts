import { createHash, randomInt } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidPinFormat, randomPinCandidate } from "./pin-core";

export function hashPinSync(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

function generatePinSync(): string {
  for (let i = 0; i < 50; i++) {
    const pin = String(randomInt(1000, 10000));
    if (isValidPinFormat(pin)) return pin;
  }
  return randomPinCandidate();
}

/** Pick a PIN hash not already used by another application. */
export async function allocateUniquePinHash(
  supabase: SupabaseClient,
  maxAttempts = 30
): Promise<{ pin: string; hash: string } | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const pin = generatePinSync();
    const hash = hashPinSync(pin);
    const { data } = await supabase
      .from("applications")
      .select("id")
      .eq("pin_hash", hash)
      .limit(1);
    if (!data?.length) return { pin, hash };
  }
  return null;
}
