import React from "react";
import { cn } from "@/lib/utils";

// ============================================
// Button
// ============================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700",
    secondary:
      "bg-white text-sand-900 border border-sand-200 hover:bg-sand-50 active:bg-sand-100",
    danger:
      "bg-white text-error border border-error/30 hover:bg-error-light active:bg-error-light",
    ghost: "text-sand-500 hover:text-sand-900 hover:bg-sand-100",
  };
  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-sm px-6 py-2.5",
  };
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

// ============================================
// Badge
// ============================================
interface BadgeProps {
  variant?: "default" | "success" | "warning" | "error";
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  const variants = {
    default: "bg-sand-100 text-sand-600",
    success: "bg-brand-100 text-brand-600",
    warning: "bg-warn-light text-warn-dark",
    error: "bg-error-light text-error-dark",
  };
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded text-xs font-semibold",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ============================================
// Input
// ============================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          "px-3 py-2 rounded-lg border border-sand-200 text-sm font-sans bg-white",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400",
          "placeholder:text-sand-400",
          error && "border-error focus:ring-error/20",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";

// ============================================
// Select
// ============================================
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className={cn(
          "px-3 py-2 rounded-lg border border-sand-200 text-sm font-sans bg-white",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================
// SearchableSelect (type to filter + pick)
// ============================================
interface SearchableSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Search...",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  const filtered = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const selected = options.find((o) => o.value === value);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      {label && (
        <label className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          className={cn(
            "w-full px-3 py-2 rounded-lg border border-sand-200 text-sm font-sans bg-white",
            "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400",
            "placeholder:text-sand-400"
          )}
          placeholder={selected ? selected.label : placeholder}
          value={open ? search : selected?.label || ""}
          onFocus={() => { setOpen(true); setSearch(""); }}
          onChange={(e) => setSearch(e.target.value)}
        />
        {value && !open && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-600 text-xs"
            onClick={(e) => { e.stopPropagation(); onChange(""); setSearch(""); }}
          >
            ✕
          </button>
        )}
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-sand-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-sand-400">No matches</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-sm hover:bg-brand-50 transition-colors",
                    o.value === value && "bg-brand-50 text-brand-700 font-medium"
                  )}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Card
// ============================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className, onClick, hoverable }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white border border-sand-200 rounded-xl p-4",
        hoverable && "cursor-pointer hover:shadow-md transition-shadow duration-150",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// ProgressBar
// ============================================
interface ProgressBarProps {
  percent: number;
  className?: string;
  size?: "sm" | "md";
}

export function ProgressBar({
  percent,
  className,
  size = "sm",
}: ProgressBarProps) {
  return (
    <div
      className={cn(
        "bg-sand-200 rounded-full overflow-hidden",
        size === "sm" ? "h-1" : "h-2",
        className
      )}
    >
      <div
        className="h-full bg-brand-500 rounded-full transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

// ============================================
// StatCard
// ============================================
interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  className?: string;
}

export function StatCard({ label, value, highlight, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex-1 min-w-[120px] border border-sand-200 rounded-xl p-4 flex flex-col gap-1",
        highlight ? "bg-brand-100" : "bg-white",
        className
      )}
    >
      <span className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">
        {label}
      </span>
      <span
        className={cn(
          "text-2xl font-bold tracking-tight",
          highlight ? "text-brand-600" : "text-sand-900"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================
// Modal
// ============================================
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-sand-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-sand-400 hover:text-sand-700 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18" /><path d="M6 6L18 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================
// Avatar (initials)
// ============================================
interface AvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ initials, size = "md", className }: AvatarProps) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-lg",
  };
  return (
    <div
      className={cn(
        "rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-600 flex-shrink-0",
        sizes[size],
        className
      )}
    >
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
}
