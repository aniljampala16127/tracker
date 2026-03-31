"use client";

import { useState, useRef, useEffect } from "react";
import { Modal } from "./ui";
import { hashPin, isValidPin, isWeakPin, savePinForApp } from "@/lib/pin";

// ============================================
// PIN verification modal (for editing protected entries)
// ============================================
interface PinModalProps {
  open: boolean;
  onClose: () => void;
  expectedHash: string;
  appId: string;
  onVerified: () => void;
  title?: string;
}

export function PinModal({
  open, onClose, expectedHash, appId, onVerified,
  title = "Enter PIN to edit",
}: PinModalProps) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setDigits(["", "", "", ""]);
      setError("");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError("");

    if (digit && index < 3) inputRefs.current[index + 1]?.focus();

    if (digit && index === 3) {
      const pin = newDigits.join("");
      if (isValidPin(pin)) verifyPin(pin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 4) {
      setDigits(pasted.split(""));
      verifyPin(pasted);
    }
  };

  const verifyPin = async (pin: string) => {
    setVerifying(true);
    try {
      const hash = await hashPin(pin);
      if (hash === expectedHash) {
        savePinForApp(appId, hash);
        if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
        onVerified();
        onClose();
      } else {
        setError("Wrong PIN. Try again.");
        setShaking(true);
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
        setTimeout(() => { setShaking(false); setDigits(["", "", "", ""]); inputRefs.current[0]?.focus(); }, 500);
      }
    } catch {
      setError("Verification failed. Try again.");
    }
    setVerifying(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-sand-500 mb-5">
        This entry is protected. Enter the 4-digit PIN set by the creator.
      </p>
      <div className={`flex justify-center gap-3 mb-4 ${shaking ? "shake" : ""}`} onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all
              focus:outline-none focus:ring-2 focus:ring-brand-500/20
              ${error ? "border-error" : digit ? "border-brand-400" : "border-sand-200"}
              ${verifying ? "opacity-50" : ""}`}
            disabled={verifying}
          />
        ))}
      </div>
      {error && <p className="text-center text-sm text-error font-medium mb-3">{error}</p>}
      <p className="text-center text-[11px] text-sand-400">
        Forgot your PIN? Unfortunately it cannot be recovered.
      </p>
    </Modal>
  );
}

// ============================================
// PIN input for Add form
// ============================================
interface PinInputProps {
  value: string;
  onChange: (pin: string) => void;
  label?: string;
}

export function PinInput({ value, onChange, label = "Set a 4-digit PIN *" }: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(4, " ").split("").slice(0, 4).map(d => d.trim());

  const handleChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const current = value.split("");
    while (current.length < 4) current.push("");
    current[index] = digit;
    onChange(current.join("").trim());
    if (digit && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const current = value.split("");
      current[index - 1] = "";
      onChange(current.join("").trim());
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    onChange(pasted);
    if (pasted.length === 4) inputRefs.current[3]?.focus();
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">{label}</label>
      <div className="flex gap-2" onPaste={handlePaste}>
        {[0, 1, 2, 3].map((i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={1}
            value={digits[i] || ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 h-11 text-center text-lg font-bold rounded-lg border border-sand-200 
              focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 bg-white"
          />
        ))}
      </div>
      <p className="text-[10px] text-sand-400">You&apos;ll need this PIN to edit or delete your entry</p>
      {isWeakPin(value) && (
        <p className="text-[10px] text-error font-medium">Too easy to guess — try a less common PIN</p>
      )}
    </div>
  );
}
