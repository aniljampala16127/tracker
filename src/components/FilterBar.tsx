"use client";

import { useState, useRef, useEffect } from "react";
import { STREAMS, SPONSOR_STATUSES, COMMON_COUNTRIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface Filters {
  stream: string;
  country: string;
  sponsor_status: string;
  subcategory: string;
}

export const EMPTY_FILTERS: Filters = {
  stream: "",
  country: "",
  sponsor_status: "",
  subcategory: "",
};

interface FilterBarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  availableCountries?: string[];
  availableSubcategories?: string[];
  // Vertical mode stacks each filter as a full-width row, used by the
  // dashboard's xl+ sidebar revamp. Horizontal stays the default for
  // mobile/lg-and-below + any caller not specifying.
  orientation?: "horizontal" | "vertical";
}

export function FilterBar({
  filters, onChange,
  availableCountries,
  orientation = "horizontal",
}: FilterBarProps) {
  const activeCount = [filters.stream, filters.country, filters.sponsor_status].filter(Boolean).length;

  const countries = availableCountries && availableCountries.length > 0
    ? availableCountries.sort()
    : COMMON_COUNTRIES;

  const update = (key: keyof Filters, val: string) =>
    onChange({ ...filters, [key]: val });

  if (orientation === "vertical") {
    return (
      <div className="bg-white border border-sand-200 rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[10px] font-bold text-sand-500 uppercase tracking-[0.08em]">Filters</p>
          {activeCount > 0 && (
            <button
              onClick={() => onChange(EMPTY_FILTERS)}
              className="text-[10px] text-error hover:text-error-dark font-bold uppercase tracking-wider transition-colors nums-tabular"
            >
              Clear · {activeCount}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <FilterPill
            label="Stream"
            value={filters.stream}
            options={["", ...STREAMS]}
            optionLabels={["All Streams", ...STREAMS]}
            onChange={(v) => update("stream", v)}
            active={!!filters.stream}
            className="w-full"
          />
          <FilterDropdown
            label="Country"
            value={filters.country}
            options={countries}
            onChange={(v) => update("country", v)}
            active={!!filters.country}
            fullWidth
          />
          <FilterPill
            label="Sponsor Status"
            value={filters.sponsor_status}
            options={["", ...SPONSOR_STATUSES]}
            optionLabels={["All", ...SPONSOR_STATUSES]}
            onChange={(v) => update("sponsor_status", v)}
            active={!!filters.sponsor_status}
            className="w-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Stream */}
        <FilterPill
          label="Stream"
          value={filters.stream}
          options={["", ...STREAMS]}
          optionLabels={["All Streams", ...STREAMS]}
          onChange={(v) => update("stream", v)}
          active={!!filters.stream}
        />

        {/* Country */}
        <FilterDropdown
          label="Country"
          value={filters.country}
          options={countries}
          onChange={(v) => update("country", v)}
          active={!!filters.country}
        />

        {/* Sponsor Status */}
        <FilterPill
          label="Sponsor Status"
          value={filters.sponsor_status}
          options={["", ...SPONSOR_STATUSES]}
          optionLabels={["All", ...SPONSOR_STATUSES]}
          onChange={(v) => update("sponsor_status", v)}
          active={!!filters.sponsor_status}
        />

        {activeCount > 0 && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-[10px] text-error hover:text-error-dark font-bold uppercase tracking-wider px-2 py-1 rounded-md hover:bg-error/10 transition-colors nums-tabular"
          >
            Clear · {activeCount}
          </button>
        )}
      </div>
    </div>
  );
}

function FilterPill({
  label, value, options, optionLabels, onChange, active, className,
}: {
  label: string; value: string; options: string[];
  optionLabels: string[]; onChange: (v: string) => void; active: boolean;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "text-[12px] px-3 py-2 rounded-lg border transition-all cursor-pointer appearance-none font-semibold",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/20",
        "pr-7 bg-[length:12px] bg-[right_8px_center] bg-no-repeat",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238A8880%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
        active
          ? "border-brand-400 bg-brand-500/12 text-brand-700"
          : "border-sand-200 bg-white text-sand-700 hover:bg-sand-50",
        className
      )}
    >
      {options.map((opt, i) => (
        <option key={opt} value={opt}>
          {optionLabels[i]}
        </option>
      ))}
    </select>
  );
}

function FilterDropdown({
  label, value, options, onChange, active, fullWidth,
}: {
  label: string; value: string; options: string[];
  onChange: (v: string) => void; active: boolean;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={ref} className={cn("relative", fullWidth && "w-full")}>
      <button
        onClick={() => { setOpen(!open); setSearch(""); }}
        className={cn(
          "text-[12px] px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5 font-semibold",
          active
            ? "border-brand-400 bg-brand-500/12 text-brand-700"
            : "border-sand-200 text-sand-700 bg-white hover:bg-sand-50",
          fullWidth && "w-full justify-between"
        )}
      >
        {value || `All ${label === "Country" ? "countries" : label.toLowerCase() + "s"}`}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={cn("transition-transform", open && "rotate-180")}>
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1.5 bg-white border border-sand-200 rounded-xl shadow-xl w-60 max-h-64 overflow-hidden flex flex-col dropdown-enter">
          <div className="p-2 border-b border-sand-100">
            <input
              type="text" autoFocus placeholder={`Search ${label.toLowerCase()}…`}
              className="w-full px-2.5 py-1.5 text-[12px] rounded-md border border-sand-200 bg-sand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 focus:bg-white transition-colors"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            <button
              className={cn(
                "w-full text-left px-3 py-1.5 text-[12px] transition-colors",
                !value ? "bg-brand-500/12 text-brand-700 font-bold" : "text-sand-700 hover:bg-sand-50"
              )}
              onClick={() => { onChange(""); setOpen(false); }}
            >
              All {label.toLowerCase()}s
            </button>
            {filtered.map((opt) => (
              <button
                key={opt}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-[12px] transition-colors",
                  opt === value ? "bg-brand-500/12 text-brand-700 font-bold" : "text-sand-700 hover:bg-sand-50"
                )}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {opt}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-sand-400 italic">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
