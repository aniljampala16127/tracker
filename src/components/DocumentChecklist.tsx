"use client";

import { useState, useEffect } from "react";
import { StepId } from "@/lib/types";

const STORAGE_KEY = "sponsortrack-checklist";

interface ChecklistItem {
  id: string;
  label: string;
  detail?: string;
  link?: string;
}

const STEP_CHECKLISTS: Record<string, { title: string; items: ChecklistItem[] }> = {
  aor: {
    title: "Preparing While You Wait",
    items: [
      { id: "aor-passport", label: "Check passport validity", detail: "Must be valid for the entire processing period — renew early if expiring", link: "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports.html" },
      { id: "aor-dmp", label: "Find your nearest panel physician", detail: "For the medical exam later — popular DMPs book weeks out", link: "https://secure.cic.gc.ca/pp-md/pp-list.aspx" },
      { id: "aor-police", label: "Get police clearance certificates ready", detail: "Some countries take months — start now", link: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/medical-police/police-certificates.html" },
      { id: "aor-photos", label: "Take new photos (if older than 6 months)", detail: "IRCC may request updated photos at any step" },
      { id: "aor-checklist", label: "Review IRCC spousal document checklist", detail: "Official guide — IMM 5289", link: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5289-sponsor-your-spouse-common-law-partner-conjugal-partner-dependent-child-complete-guide.html" },
    ],
  },
  bil: {
    title: "Biometrics (BIL) Preparation",
    items: [
      { id: "bil-appt", label: "Book biometrics appointment", detail: "Service Canada (inland) or VAC office (outland)", link: "https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/biometrics/where-to-give-biometrics.html" },
      { id: "bil-letter", label: "Print BIL letter", detail: "Bring the original biometrics instruction letter" },
      { id: "bil-passport", label: "Bring valid passport", detail: "Must match passport used in application" },
      { id: "bil-fee", label: "Confirm biometrics fee paid ($85)", detail: "May already be included in your initial payment" },
      { id: "bil-done", label: "Complete biometrics within 30 days", detail: "Deadline is 30 days from BIL date — don't wait" },
    ],
  },
  sponsor_eligibility: {
    title: "Sponsor Eligibility Stage",
    items: [
      { id: "se-income", label: "Review income documentation", detail: "NOA, T4s, pay stubs may be requested" },
      { id: "se-status", label: "Confirm sponsor's PR/citizen status", detail: "Keep citizenship or PR card accessible" },
      { id: "se-rfe", label: "Watch for RFE (Request for Evidence)", detail: "Check IRCC account regularly — respond promptly if received" },
      { id: "se-update", label: "Report any changes to IRCC", detail: "Address, marriage status, or employment changes", link: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/change-address.html" },
    ],
  },
  medical: {
    title: "Medical Exam Preparation",
    items: [
      { id: "med-dmp", label: "Find a Designated Medical Practitioner", detail: "Use IRCC's panel physician finder", link: "https://secure.cic.gc.ca/pp-md/pp-list.aspx" },
      { id: "med-book", label: "Book medical appointment", detail: "Book early — popular DMPs have long wait times" },
      { id: "med-passport", label: "Bring valid passport + photos", detail: "2 passport-size photos and valid ID" },
      { id: "med-form", label: "Bring IMM 1017B form (if received)", detail: "IRCC may send this or your DMP can pull it online" },
      { id: "med-records", label: "Bring previous medical records", detail: "Vaccination history, TB test results, any chronic conditions" },
      { id: "med-fast", label: "Fasting may be required", detail: "Check with your DMP — some blood tests require fasting" },
      { id: "med-results", label: "Confirm results uploaded to IRCC", detail: "DMP uploads directly — ask for confirmation" },
    ],
  },
  pa_eligibility: {
    title: "PA Eligibility Stage",
    items: [
      { id: "pa-police", label: "Updated police clearance certificates", detail: "May need new ones if originals are older than 12 months" },
      { id: "pa-watch", label: "Monitor IRCC account for updates", detail: "Check weekly — PA eligibility can take 4-12 weeks" },
      { id: "pa-rfe", label: "Respond to any RFE promptly", detail: "Delayed responses can slow processing significantly" },
    ],
  },
  background: {
    title: "Background Check Stage",
    items: [
      { id: "bg-police", label: "Ensure police clearances are current", detail: "Some countries require updated certificates" },
      { id: "bg-travel", label: "Report any new travel", detail: "New travel history must be disclosed to IRCC" },
      { id: "bg-wait", label: "Be patient — this step can take weeks", detail: "Security screening is done by CSIS/RCMP, no way to speed up" },
    ],
  },
  portal1: {
    title: "Portal 1 — First Invitation",
    items: [
      { id: "p1-login", label: "Log into PR portal within deadline", detail: "You'll receive a link to create your PR portal account" },
      { id: "p1-photo", label: "Upload digital photo", detail: "Must meet IRCC photo specifications — use a photo service" },
      { id: "p1-address", label: "Confirm current address", detail: "This address will be used for your PR card" },
      { id: "p1-docs", label: "Upload any requested documents", detail: "Follow the portal instructions carefully" },
    ],
  },
  portal2: {
    title: "Portal 2 — Final Documents",
    items: [
      { id: "p2-passport", label: "Upload passport copy", detail: "Scan of passport bio page — must be clear and legible" },
      { id: "p2-photo", label: "Upload updated photo if needed", detail: "If more than 6 months since Portal 1 photo" },
      { id: "p2-landing", label: "Prepare landing plans (outland)", detail: "Book flights, arrange temporary accommodation" },
    ],
  },
  pre_arrival: {
    title: "Pre-Arrival Preparation",
    items: [
      { id: "pre-sin", label: "Apply for SIN number", detail: "Can apply online before landing", link: "https://www.canada.ca/en/employment-social-development/services/sin/apply.html" },
      { id: "pre-health", label: "Register for provincial health insurance", detail: "OHIP (ON), RAMQ (QC), etc. — may have 3-month wait" },
      { id: "pre-bank", label: "Open Canadian bank account", detail: "Most banks allow pre-arrival account opening online" },
      { id: "pre-flight", label: "Book travel (outland)", detail: "COPR has an expiry date — land before it expires" },
      { id: "pre-docs", label: "Prepare landing documents packet", detail: "COPR, passport, proof of funds, and supporting docs" },
      { id: "pre-settle", label: "Register with free settlement services", detail: "Free government-funded help for newcomers", link: "https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants/new-life-canada/pre-arrival-services.html" },
    ],
  },
  ecopr: {
    title: "eCoPR — Final Steps",
    items: [
      { id: "ecopr-save", label: "Download and save your eCoPR", detail: "Save digital copy and print a physical backup" },
      { id: "ecopr-land", label: "Complete landing (outland)", detail: "Enter Canada before COPR expiry date" },
      { id: "ecopr-pr", label: "Wait for PR card in mail", detail: "Takes 4-8 weeks after landing — sent to Canadian address", link: "https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants/pr-card.html" },
      { id: "ecopr-sin", label: "Get your SIN number", detail: "Visit Service Canada office with your COPR and passport", link: "https://www.canada.ca/en/employment-social-development/services/sin/apply.html" },
      { id: "ecopr-celebrate", label: "Celebrate! 🎉", detail: "You made it through the entire process!" },
    ],
  },
};

function getChecked(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}

function saveChecked(data: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function DocumentChecklist({ currentStep, completedSteps }: {
  currentStep: StepId | null;
  completedSteps: StepId[];
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setChecked(getChecked());
  }, []);

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    saveChecked(next);
  };

  // Determine which checklists to show: current step + next step
  const allStepIds = Object.keys(STEP_CHECKLISTS);
  const relevantSteps: string[] = [];

  // Add current waiting step
  if (currentStep && STEP_CHECKLISTS[currentStep]) {
    relevantSteps.push(currentStep);
  }

  // Add next step after current
  if (currentStep) {
    const stepOrder = ["aor", "bil", "sponsor_eligibility", "medical", "pa_eligibility", "background", "portal1", "portal2", "pre_arrival", "ecopr"];
    const idx = stepOrder.indexOf(currentStep);
    if (idx >= 0 && idx < stepOrder.length - 1) {
      const next = stepOrder[idx + 1];
      if (STEP_CHECKLISTS[next]) relevantSteps.push(next);
    }
  }

  // If no current step, show AOR checklist (user just submitted)
  if (relevantSteps.length === 0) {
    relevantSteps.push("aor");
  }

  // Auto-expand first relevant step
  useEffect(() => {
    if (relevantSteps.length > 0 && !expanded) {
      setExpanded(relevantSteps[0]);
    }
  }, []);

  return (
    <div className="bg-white border border-sand-200 rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-sand-900">📋 Document Checklist</h3>
        <span className="text-[10px] text-sand-400">Tap to check off</span>
      </div>

      <div className="space-y-2">
        {relevantSteps.map(stepId => {
          const section = STEP_CHECKLISTS[stepId];
          if (!section) return null;
          const isExpanded = expanded === stepId;
          const checkedCount = section.items.filter(i => checked[i.id]).length;
          const totalCount = section.items.length;
          const allDone = checkedCount === totalCount;
          const isCurrent = stepId === currentStep || (currentStep === null && stepId === "aor");

          return (
            <div key={stepId} className={`rounded-xl border overflow-hidden ${
              isCurrent ? "border-brand-200 bg-brand-50/30" : "border-sand-100"
            }`}>
              {/* Section header */}
              <button
                onClick={() => setExpanded(isExpanded ? null : stepId)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  allDone ? "bg-brand-500 text-white" : isCurrent ? "bg-brand-100 text-brand-700" : "bg-sand-100 text-sand-500"
                }`}>
                  {allDone ? "✓" : `${checkedCount}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-sand-900">{section.title}</div>
                  <div className="text-[10px] text-sand-400">{checkedCount}/{totalCount} complete</div>
                </div>
                {isCurrent && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-brand-500 text-white font-bold flex-shrink-0">NEXT</span>
                )}
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0ADA6" strokeWidth="2" strokeLinecap="round"
                  className={`flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                >
                  <path d="M6 9L12 15L18 9" />
                </svg>
              </button>

              {/* Progress bar */}
              {!isExpanded && totalCount > 0 && (
                <div className="px-3 pb-2">
                  <div className="bg-sand-200 rounded-full h-1 overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all duration-500"
                      style={{ width: `${(checkedCount / totalCount) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Items */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-1 animate-in">
                  {section.items.map(item => {
                    const isDone = !!checked[item.id];
                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-all ${
                          isDone ? "bg-brand-50/50" : "bg-white hover:bg-sand-50"
                        }`}
                      >
                        <button
                          onClick={() => toggle(item.id)}
                          className={`mt-0.5 rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                            isDone
                              ? "bg-brand-500 border-brand-500"
                              : "border-sand-300 bg-white"
                          }`} style={{ width: 18, height: 18 }}
                        >
                          {isDone && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                              <path d="M20 6L9 17L4 12" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0" onClick={() => toggle(item.id)}>
                          <div className={`text-[11px] font-medium ${isDone ? "text-sand-400 line-through" : "text-sand-900"}`}>
                            {item.label}
                          </div>
                          {item.detail && (
                            <div className={`text-[9px] mt-0.5 ${isDone ? "text-sand-300" : "text-sand-400"}`}>
                              {item.detail}
                            </div>
                          )}
                        </div>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-md bg-brand-50 flex items-center justify-center"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show all steps toggle */}
      <button
        onClick={() => {
          // Toggle showing all steps
          const allShowing = relevantSteps.length === allStepIds.length;
          if (!allShowing) {
            setExpanded(null);
          }
        }}
        className="w-full mt-3 text-[10px] text-brand-600 font-medium text-center"
      >
        {relevantSteps.length <= 2 ? "Showing next steps only" : ""}
      </button>
    </div>
  );
}
