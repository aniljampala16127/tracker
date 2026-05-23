// Lightweight toast bus — no provider/context, just a custom DOM event so
// any client component can fire one without wiring through React tree.
//
//   import { toast } from "@/lib/toast";
//   toast.success("Marked AOR · Apr 15");
//   toast.error("Could not save");
//
// Subscribed to by <Toaster /> in ClientLayout.

export type ToastKind = "success" | "error" | "info";

export interface ToastDetail {
  message: string;
  kind: ToastKind;
  duration: number;
}

export const TOAST_EVENT = "sponsortrack-toast";

function emit(message: string, kind: ToastKind, duration: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastDetail>(TOAST_EVENT, {
      detail: { message, kind, duration },
    })
  );
}

interface ToastFn {
  (message: string, opts?: { kind?: ToastKind; duration?: number }): void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const fn: ToastFn = ((message, opts = {}) => {
  emit(message, opts.kind ?? "info", opts.duration ?? 3500);
}) as ToastFn;

fn.success = (m, d) => emit(m, "success", d ?? 3500);
fn.error = (m, d) => emit(m, "error", d ?? 4500);
fn.info = (m, d) => emit(m, "info", d ?? 3500);

export const toast = fn;
