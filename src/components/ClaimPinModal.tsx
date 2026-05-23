"use client";

import { useState } from "react";
import { Modal, Button } from "./ui";
import { generatePin, hashPin, savePinForApp, getSavedPinHash } from "@/lib/pin";

interface ClaimPinModalProps {
  open: boolean;
  onClose: () => void;
  appId: string;
  appInitials: string;
  onClaimed: (pinHash: string) => void;
}

export function ClaimPinModal({
  open, onClose, appId, appInitials, onClaimed,
}: ClaimPinModalProps) {
  const [step, setStep] = useState<"confirm" | "reveal">("confirm");
  const [pin, setPin] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleClaim = async () => {
    setClaiming(true);
    setError("");
    const newPin = generatePin();
    const hash = await hashPin(newPin);

    const res = await fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: appId, claim_pin_hash: hash }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to claim. Try again.");
      setClaiming(false);
      return;
    }

    // Success — save locally and show the PIN
    savePinForApp(appId, hash);
    setPin(newPin);
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    setStep("reveal");
    setClaiming(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavedPin = () => {
    const hash = getSavedPinHash(appId);
    setStep("confirm");
    setPin("");
    setCopied(false);
    setError("");
    onClaimed(hash || "");
  };

  const handleClose = () => {
    if (step === "reveal") {
      handleSavedPin();
      return;
    }
    setStep("confirm");
    setPin("");
    setCopied(false);
    setError("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={step === "confirm" ? "Claim this entry?" : "Your PIN"}>
      {step === "confirm" ? (
        <div>
          <div className="bg-warn/12 border border-warn/30 rounded-xl p-4 mb-4">
            <p className="text-[10px] font-bold text-warn-dark uppercase tracking-[0.08em] mb-1.5">Heads up</p>
            <p className="text-[13px] text-warn-dark leading-relaxed">
              <strong className="font-bold">{appInitials}</strong> doesn&apos;t have a PIN yet. Claiming it will
              generate a <strong className="font-bold">4-digit PIN</strong> that only you will see.
            </p>
            <p className="text-[11px] text-warn-dark/85 mt-2 leading-relaxed">
              After claiming, only someone with the PIN can edit or delete this entry.
              The PIN is shown <strong className="font-bold">once</strong> — save it somewhere safe.
            </p>
          </div>
          {error && (
            <p className="text-[12px] text-error font-medium mb-3">{error}</p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleClaim} disabled={claiming} className="flex-1">
              {claiming ? "Claiming…" : "Claim & generate PIN"}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-[13px] text-sand-700 mb-4 leading-relaxed">
            Here is your PIN for <strong className="font-bold text-sand-900">{appInitials}</strong>. Save it now — it won&apos;t be shown again.
          </p>
          <div className="bg-brand-500/[0.08] border border-brand-500/25 rounded-2xl p-5 flex flex-col items-center mb-4">
            <p className="text-[10px] font-bold text-brand-700 uppercase tracking-[0.08em] mb-3">Your PIN</p>
            <div className="flex gap-3 mb-3 nums-tabular">
              {pin.split("").map((d, i) => (
                <div key={i} className="w-14 h-14 rounded-xl bg-white border border-brand-500/30 flex items-center justify-center text-2xl font-bold text-brand-700 shadow-sm">
                  {d}
                </div>
              ))}
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] text-brand-700 hover:text-brand-800 hover:bg-brand-500/15 font-bold uppercase tracking-wider transition-colors"
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12L10 17L19 8" /></svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  Copy PIN
                </>
              )}
            </button>
          </div>
          <div className="bg-error/10 border border-error/30 rounded-lg p-3 mb-4">
            <p className="text-[10px] font-bold text-error-dark uppercase tracking-[0.08em] mb-1">Important</p>
            <p className="text-[11px] text-error-dark font-medium leading-relaxed">
              This PIN will NOT be shown again. If you lose it, you will not be able to edit this entry.
            </p>
          </div>
          <Button onClick={handleSavedPin} className="w-full">
            I&apos;ve saved my PIN
          </Button>
        </div>
      )}
    </Modal>
  );
}
