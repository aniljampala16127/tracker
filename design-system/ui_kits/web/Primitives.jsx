/* SponsorTrack Web UI Kit — direct port of the live product's chrome */
const { useState, useEffect, useRef } = React;

// ────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────
const cls = (...xs) => xs.filter(Boolean).join(" ");

function Button({ variant = "primary", size = "md", className = "", children, ...p }) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const v = {
    primary: "bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]",
    primaryCta: "bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)] shadow-[0_8px_24px_rgba(45,106,79,0.2)] rounded-xl",
    secondary: "bg-white text-[var(--sand-900)] border border-[var(--sand-200)] hover:bg-[var(--sand-50)]",
    danger: "bg-white text-[var(--error)] border border-[rgba(192,87,70,0.3)] hover:bg-[var(--error-light)]",
    ghost: "text-[var(--sand-500)] hover:text-[var(--sand-900)] hover:bg-[var(--sand-100)]",
  };
  const s = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2", lg: "text-sm px-6 py-3" };
  return <button className={cls(base, v[variant], s[size], className)} {...p}>{children}</button>;
}

function Badge({ variant = "default", children, className = "" }) {
  const v = {
    default: "bg-[var(--sand-100)] text-[var(--sand-600)]",
    success: "bg-[var(--brand-100)] text-[var(--brand-600)]",
    warning: "bg-[var(--warn-light)] text-[var(--warn-dark)]",
    error: "bg-[var(--error-light)] text-[var(--error-dark)]",
  };
  return <span className={cls("inline-block px-2 py-0.5 rounded text-xs font-semibold", v[variant], className)}>{children}</span>;
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--brand-100)] text-[var(--brand-700)] text-[11px] font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-500)] animate-pulse" />
      {children}
    </span>
  );
}

function Avatar({ initials, size = "md", variant = "muted" }) {
  const sz = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" }[size];
  const v = variant === "brand"
    ? "bg-[var(--brand-500)] text-white rounded-2xl shadow-[0_4px_12px_rgba(45,106,79,0.2)]"
    : variant === "soft"
    ? "bg-[var(--brand-100)] text-[var(--brand-600)] rounded-full"
    : "bg-[var(--sand-100)] text-[var(--sand-600)] rounded-lg";
  return <div className={cls("flex items-center justify-center font-bold flex-shrink-0", sz, v)}>{(initials || "").slice(0,2).toUpperCase()}</div>;
}

function Card({ children, className = "", onClick, hoverable }) {
  return (
    <div onClick={onClick}
      className={cls(
        "bg-white border border-[var(--sand-200)] rounded-xl p-4",
        hoverable && "cursor-pointer hover:shadow-md transition-shadow duration-150 active:scale-[0.99]",
        onClick && "cursor-pointer",
        className
      )}>
      {children}
    </div>
  );
}

function Eyebrow({ children, xs }) {
  return (
    <div className={cls(
      "font-bold uppercase",
      xs ? "text-[10px] text-[var(--sand-400)] tracking-[0.08em]" : "text-[11px] text-[var(--sand-500)] tracking-[0.06em]"
    )}>{children}</div>
  );
}

function StatCard({ label, value, suffix = "", highlight, icon }) {
  return (
    <div className={cls(
      "border border-[var(--sand-200)] rounded-xl p-4 text-center",
      highlight ? "bg-[var(--brand-100)] border-transparent" : "bg-white"
    )}>
      {icon && (
        <div className={cls("w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2",
          highlight ? "bg-[var(--brand-200)]" : "bg-[var(--brand-100)]")}>
          {icon}
        </div>
      )}
      <div className={cls("text-2xl font-bold tracking-tight",
        highlight ? "text-[var(--brand-600)]" : "text-[var(--sand-900)]")}>
        {value}{suffix}
      </div>
      <div className="text-[10px] text-[var(--sand-400)] font-medium uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

// Expose
Object.assign(window, { cls, Button, Badge, Pill, Avatar, Card, Eyebrow, StatCard });
