"use client";

import { useEffect, useState, useCallback } from "react";
import { TOAST_EVENT, ToastDetail, ToastKind } from "@/lib/toast";
import { playSound } from "@/lib/sounds";

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

const MAX_STACK = 4;

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (!detail) return;
      const item: ToastItem = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        message: detail.message,
        kind: detail.kind,
      };
      setItems(prev => {
        const next = [...prev, item];
        // Cap stack height — drop oldest if needed.
        return next.length > MAX_STACK ? next.slice(next.length - MAX_STACK) : next;
      });
      // Auto-play a short synthesized sound matching the toast kind.
      // Respects the global mute preference inside playSound itself.
      if (detail.kind === "success") playSound("success");
      else if (detail.kind === "error") playSound("error");
      else playSound("subtle");
      window.setTimeout(() => dismiss(item.id), detail.duration);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, [dismiss]);

  if (items.length === 0) return null;

  return (
    <div
      className="fixed z-[70] left-3 right-3 sm:left-auto sm:right-4 sm:w-[340px] bottom-20 sm:bottom-4 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      role="status"
    >
      {items.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto t-liquid-glass rounded-xl px-3.5 py-2.5 panel-enter flex items-center gap-2.5 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] ${
            t.kind === "success" ? "!border-brand-400/50"
            : t.kind === "error" ? "!border-error/50"
            : ""
          }`}
          onClick={() => dismiss(t.id)}
        >
          {t.kind === "success" && (
            <span className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-brand-500/30 t-success-check" data-state="in">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17L4 12" />
              </svg>
            </span>
          )}
          {t.kind === "error" && (
            <span className="w-7 h-7 rounded-full bg-error flex items-center justify-center flex-shrink-0 shadow-sm shadow-error/30">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6L18 18" />
              </svg>
            </span>
          )}
          {t.kind === "info" && (
            <span className="w-7 h-7 rounded-full bg-sand-700 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </span>
          )}
          <p className="text-[13px] font-semibold text-sand-900 flex-1 min-w-0 nums-tabular">{t.message}</p>
        </div>
      ))}
    </div>
  );
}
