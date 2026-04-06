"use client";

import { useState } from "react";

const RESOURCES = [
  {
    title: "Find an Immigration Consultant (RCIC)",
    description: "Search the CICC Public Register to verify your consultant is licensed and active",
    url: "https://register.college-ic.ca/Public-Register-EN/Public-Register-EN/RCIC_Search.aspx",
    icon: "search",
    tag: "CICC",
  },
  {
    title: "Find an Immigration Lawyer",
    description: "Provincial law society directories — lawyers authorized to represent you",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative/choose/authorized.html",
    icon: "shield",
    tag: "IRCC",
  },
  {
    title: "How to Choose a Representative",
    description: "IRCC's official guide — what to look for, red flags, and your rights",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative/choose.html",
    icon: "book",
    tag: "Guide",
  },
  {
    title: "Use of a Representative Form (IMM 5476)",
    description: "Official form to authorize someone to represent you with IRCC",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5476.html",
    icon: "file",
    tag: "Form",
  },
];

const TIPS = [
  "Only RCICs, lawyers, and notaries can legally charge fees for immigration advice",
  "Always verify their CICC number or law society membership before paying",
  "Get a written contract listing all services and fees before signing",
  "You don't need a representative — IRCC treats all applications equally",
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    search: "M11 19C15.4 19 19 15.4 19 11S15.4 3 11 3S3 6.6 3 11S6.6 19 11 19ZM21 21L16.7 16.7",
    shield: "M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z",
    book: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 004.5 22H20V2H6.5A2.5 2.5 0 004 4.5V19.5Z",
    file: "M14 2H6C5.4 2 5 2.4 5 3V21C5 21.6 5.4 22 6 22H18C18.6 22 19 21.6 19 21V7L14 2ZM14 2V7H19",
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] || paths.search} />
    </svg>
  );
}

export function FindRepresentativeCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-sand-200 rounded-xl mb-3 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:scale-[0.99] transition-transform"
      >
        <div className="w-8 h-8 rounded-lg bg-sand-100 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-sand-600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21V19C17 16.8 15.2 15 13 15H5C2.8 15 1 16.8 1 19V21"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21V19C23 17.5 22 16.2 20.6 15.8"/><path d="M16.5 3.1C17.9 3.6 19 5 19 6.5C19 8 17.9 9.4 16.5 9.9"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-sand-900">Need an Immigration Representative?</div>
          <div className="text-[10px] text-sand-500">Find verified RCICs and lawyers</div>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-sand-400" strokeWidth="2" strokeLinecap="round"
          style={{ transition: "transform 0.3s ease", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>

      {/* Expandable */}
      <div
        className="grid"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          transition: "grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="overflow-hidden">
          <div
            className="px-4 pb-4"
            style={{
              opacity: expanded ? 1 : 0,
              transition: "opacity 0.25s ease",
              transitionDelay: expanded ? "0.1s" : "0s",
            }}
          >
            {/* Resource links */}
            <div className="space-y-2 mb-3">
              {RESOURCES.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-sand-50 hover:bg-sand-100 transition-colors active:scale-[0.99]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-7 h-7 rounded-md bg-white border border-sand-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-sand-600">
                    <Icon name={r.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-semibold text-sand-900">{r.title}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 font-bold flex-shrink-0">{r.tag}</span>
                    </div>
                    <div className="text-[10px] text-sand-500 mt-0.5 leading-relaxed">{r.description}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-1.5 text-sand-400">
                    <path d="M18 13V19C18 20.1 17.1 21 16 21H5C3.9 21 3 20.1 3 19V8C3 6.9 3.9 6 5 6H11"/>
                    <path d="M15 3H21V9"/><path d="M10 14L21 3"/>
                  </svg>
                </a>
              ))}
            </div>

            {/* Tips */}
            <div className="bg-warn-light/40 rounded-lg px-3 py-2.5">
              <div className="text-[10px] font-semibold text-warn-dark mb-1.5">Before hiring anyone:</div>
              <div className="space-y-1">
                {TIPS.map((tip, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-[9px] text-warn-dark mt-0.5">•</span>
                    <span className="text-[10px] text-warn-dark leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
