"use client";

import { useState } from "react";
import { Modal, Button } from "./ui";
import { generatePin, hashPin, savePinForApp, getSavedPinHash } from "@/lib/pin";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = createClient();

  const handleClaim = async () => {
    setClaiming(true);
    setError("");
    const newPin = generatePin();
    const hash = await hashPin(newPin);

    // Atomic claim — only succeeds if pin_hash is still NULL
    const { data, error: rpcErr } = await supabase.rpc("claim_application", {
      app_id: appId,
      new_pin_hash: hash,
    });

    if (rpcErr) {
      setError("Failed to claim. Try again.");
      setClaiming(false);
      return;
    }

    if (data === false) {
      setError("Someone else already claimed this entry.");
      setClaiming(false);
      return;
    }

    // Success — save locally and show the PIN
    savePinForApp(appId, hash);
    setPin(newPin);
    setStep("reveal");
    setClaiming(false);
    // Don't call onClaimed yet — wait for user to see the PIN
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
    // If PIN was revealed, still call onClaimed so the app updates
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
          <div className="bg-warn-light/50 border border-warn/30 rounded-xl p-4 mb-4">
            <p className="text-sm text-sand-700">
              <strong>{appInitials}</strong> doesn&apos;t have a PIN yet. Claiming it will
              generate a <strong>4-digit PIN</strong> that only you will see.
            </p>
            <p className="text-xs text-sand-500 mt-2">
              After claiming, only someone with the PIN can edit or delete this entry.
              The PIN is shown <strong>once</strong> — save it somewhere safe.
            </p>
          </div>
          {error && (
            <p className="text-sm text-error font-medium mb-3">{error}</p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleClaim} disabled={claiming} className="flex-1">
              {claiming ? "Claiming..." : "Claim & Generate PIN"}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-sand-500 mb-4">
            Here is your PIN for <strong>{appInitials}</strong>. Save it now — it won&apos;t be shown again.
          </p>
          <div className="bg-brand-50 border-2 border-brand-200 rounded-2xl p-6 flex flex-col items-center mb-4">
            <div className="flex gap-3 mb-3">
              {pin.split("").map((d, i) => (
                <div key={i} className="w-14 h-14 rounded-xl bg-white border-2 border-brand-300 flex items-center justify-center text-2xl font-bold text-brand-700">
                  {d}
                </div>
              ))}
            </div>
            <button
              onClick={handleCopy}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1 transition-colors"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12L10 17L19 8" /></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  Copy PIN
                </>
              )}
            </button>
          </div>
          <div className="bg-error-light/50 border border-error/20 rounded-lg p-3 mb-4">
            <p className="text-xs text-error-dark font-medium">
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
