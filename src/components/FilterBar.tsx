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
}

export function FilterBar({
  filters, onChange,
  availableCountries,
}: FilterBarProps) {
  const activeCount = [filters.stream, filters.country, filters.sponsor_status].filter(Boolean).length;

  const countries = availableCountries && availableCountries.length > 0
    ? availableCountries.sort()
    : COMMON_COUNTRIES;

  const update = (key: keyof Filters, val: string) =>
    onChange({ ...filters, [key]: val });

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
            className="text-[11px] text-error hover:text-error-dark font-medium px-2 py-1 rounded transition-colors"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}

function FilterPill({
  label, value, options, optionLabels, onChange, active,
}: {
  label: string; value: string; options: string[];
  optionLabels: string[]; onChange: (v: string) => void; active: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer appearance-none",
        "bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20",
        "pr-7 bg-[length:12px] bg-[right_8px_center] bg-no-repeat",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238A8880%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
        active
          ? "border-brand-400 bg-brand-50 text-brand-700 font-semibold"
          : "border-sand-200 text-sand-600"
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
  label, value, options, onChange, active,
}: {
  label: string; value: string; options: string[];
  onChange: (v: string) => void; active: boolean;
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
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setSearch(""); }}
        className={cn(
          "text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5",
          active
            ? "border-brand-400 bg-brand-50 text-brand-700 font-semibold"
            : "border-sand-200 text-sand-600 bg-white hover:bg-sand-50"
        )}
      >
        {value || `All ${label === "Country" ? "Countries" : label + "s"}`}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={cn("transition-transform", open && "rotate-180")}>
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-sand-200 rounded-lg shadow-lg w-56 max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-sand-100">
            <input
              type="text" autoFocus placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full px-2 py-1.5 text-xs rounded border border-sand-200 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            <button
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs hover:bg-brand-50 transition-colors",
                !value && "bg-brand-50 text-brand-700 font-medium"
              )}
              onClick={() => { onChange(""); setOpen(false); }}
            >
              All {label}s
            </button>
            {filtered.map((opt) => (
              <button
                key={opt}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs hover:bg-brand-50 transition-colors",
                  opt === value && "bg-brand-50 text-brand-700 font-medium"
                )}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {opt}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-sand-400">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
