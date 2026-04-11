"use client";

import { useState } from "react";

export function PostAORGuide() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"gckey" | "tracker">("gckey");

  const GCKEY_STEPS: { text: string; link?: string; highlight?: boolean }[] = [
    { text: "Go to the IRCC account page and click \"Sign in with GCKey\"", link: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/account.html" },
    { text: "Create an account using PA's or representative's email" },
    { text: "Log in and complete all security questions" },
    { text: "Under the applications table (shows no active application), click \"Link Application\"" },
    { text: "Select \"Application number and family name\" as the method" },
    { text: "Enter PA's family name exactly as in application — add a space in front", highlight: true },
    { text: "Enter application number" },
    { text: "Enter PA's place of birth and all other requested details" },
    { text: "Enter 2 under \"number of people under the application\"" },
    { text: "Submit — it should show \"account found\", then click \"Link account\"" },
  ];

  const TRACKER_STEPS: { text: string; link?: string; highlight?: boolean }[] = [
    { text: "Go to the IRCC Tracker registration page", link: "https://ircc-tracker-suivi.apps.cic.gc.ca/en/register" },
    { text: "Enter PA's UCI (found on your GCKey account after linking)" },
    { text: "Enter Application Number" },
    { text: "Enter PA's Given Names & Last Name exactly as in application" },
    { text: "Enter PA's Date of Birth and Country of Birth" },
    { text: "Submit — it should link your application to the tracker" },
  ];

  const steps = activeTab === "gckey" ? GCKEY_STEPS : TRACKER_STEPS;

  return (
    <div className="bg-gradient-to-r from-brand-50 to-brand-100/50 border border-brand-200 rounded-xl mb-3 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:scale-[0.99] transition-transform"
      >
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22C17.5 22 22 17.5 22 12S17.5 2 12 2S2 6.5 2 12S6.5 22 12 22Z"/>
            <path d="M12 16V12"/><path d="M12 8H12.01"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-brand-800">Next: Set up GCKey & IRCC Tracker</div>
          <div className="text-[10px] text-brand-600">Link your application to track progress on IRCC</div>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round"
          style={{ transition: "transform 0.3s ease", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M6 9L12 15L18 9" />
        </svg>
      </button>

      {/* Expandable content */}
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
            {/* Tab switcher */}
            <div className="flex gap-1.5 mb-3">
              <button
                onClick={() => setActiveTab("gckey")}
                className={`flex-1 text-[11px] font-semibold py-2 rounded-lg transition-all ${
                  activeTab === "gckey"
                    ? "bg-brand-500 text-white shadow-sm"
                    : "bg-white/60 text-brand-700 hover:bg-white"
                }`}
              >
                1. GCKey Setup
              </button>
              <button
                onClick={() => setActiveTab("tracker")}
                className={`flex-1 text-[11px] font-semibold py-2 rounded-lg transition-all ${
                  activeTab === "tracker"
                    ? "bg-brand-500 text-white shadow-sm"
                    : "bg-white/60 text-brand-700 hover:bg-white"
                }`}
              >
                2. IRCC Tracker
              </button>
            </div>

            {/* Steps */}
            <div className="bg-white rounded-xl p-3 space-y-2.5">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold mt-0.5 ${
                    step.highlight ? "bg-warn text-white" : "bg-brand-100 text-brand-700"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[12px] leading-relaxed ${step.highlight ? "text-warn-dark font-semibold" : "text-sand-700"}`}>
                      {step.text}
                    </div>
                    {step.link && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-brand-600 font-medium mt-0.5 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open link
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13V19C18 20.1 17.1 21 16 21H5C3.9 21 3 20.1 3 19V8C3 6.9 3.9 6 5 6H11"/>
                          <path d="M15 3H21V9"/><path d="M10 14L21 3"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tip */}
            <div className="mt-2.5 bg-warn-light/50 rounded-lg px-3 py-2">
              <div className="text-[10px] text-warn-dark">
                {activeTab === "gckey"
                  ? "💡 Tip: Add a space before your family name when linking. This is a known quirk with the IRCC system."
                  : "💡 Tip: Use the UCI and Application Number from your GCKey account. These appear after you link your application."
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
