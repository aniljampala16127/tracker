/* Step timeline + applicant row */

const STEPS = [
  { id: "submitted", label: "Submitted", Icon: SubmittedIcon },
  { id: "aor",       label: "AOR",       Icon: AorIcon },
  { id: "bil",       label: "BIL",       Icon: BilIcon },
  { id: "medical",   label: "Medical",   Icon: MedicalIcon },
  { id: "background",label: "Background",Icon: BackgroundIcon },
  { id: "portal1",   label: "Portal 1",  Icon: PortalIcon },
  { id: "ecopr",     label: "eCoPR",     Icon: EcoprIcon },
];

function StepTimeline({ currentStep = "bil", compact }) {
  const idx = STEPS.findIndex(s => s.id === currentStep);
  return (
    <div className="flex items-center gap-1 flex-1">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={s.id}>
            <div className={cls(
              "rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all",
              compact ? "w-4 h-4" : "w-6 h-6",
              done && "bg-[var(--brand-500)] border-[var(--brand-500)] text-white",
              active && "bg-white border-[var(--brand-500)] text-[var(--brand-500)] shadow-[0_0_0_4px_rgba(45,106,79,0.12)]",
              !done && !active && "bg-white border-[var(--sand-200)] text-[var(--sand-400)]"
            )}>
              {done
                ? <CheckIcon size={compact ? 8 : 10} className="text-white" />
                : <span className={compact ? "text-[8px] font-bold" : "text-[10px] font-bold"}>{i+1}</span>}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cls("flex-1 h-[2px]", i < idx ? "bg-[var(--brand-500)]" : "bg-[var(--sand-200)]")} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StepTimelineDetailed({ currentStep = "bil", events = {} }) {
  const idx = STEPS.findIndex(s => s.id === currentStep);
  return (
    <ol className="space-y-3">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.id} className="flex items-start gap-3">
            <div className={cls(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
              done && "bg-[var(--brand-100)] text-[var(--brand-600)]",
              active && "bg-[var(--brand-500)] text-white shadow-[0_4px_12px_rgba(45,106,79,0.25)]",
              !done && !active && "bg-[var(--sand-100)] text-[var(--sand-400)]"
            )}>
              <s.Icon size={18} />
            </div>
            <div className="flex-1 pt-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className={cls("text-sm font-bold",
                  active ? "text-[var(--brand-700)]" : done ? "text-[var(--sand-900)]" : "text-[var(--sand-500)]")}>
                  {s.label}
                </span>
                <span className="text-[11px] text-[var(--sand-400)]">
                  {events[s.id] || (done ? "—" : active ? "in progress" : "")}
                </span>
              </div>
              {active && (
                <div className="text-[11px] text-[var(--sand-500)] mt-0.5">Cohort avg: 87 days · You're on day 87</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ApplicantRow({ app, isYou, onClick, isLast }) {
  const stream = app.stream;
  return (
    <button onClick={onClick}
      className={cls(
        "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left",
        isYou ? "bg-[var(--brand-500)]/5 hover:bg-[var(--brand-500)]/10 border-b-2 border-[var(--brand-200)]"
              : "hover:bg-[var(--sand-50)] active:bg-[var(--sand-100)]",
        !isYou && !isLast && "border-b border-[var(--sand-100)]"
      )}>
      <div className={cls(
        "rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs",
        isYou ? "w-10 h-10 bg-[var(--brand-500)] text-white"
              : "w-9 h-9 bg-[var(--sand-100)] text-[var(--sand-600)]"
      )}>
        {app.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-[var(--sand-900)] truncate">{app.initials}</span>
          {isYou && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--brand-100)] text-[var(--brand-700)]">YOU</span>}
          <span className={cls("text-[9px] font-bold px-1.5 py-0.5 rounded-full",
            stream === "Inland" ? "bg-[var(--brand-100)] text-[var(--brand-700)]" : "bg-[var(--warn)]/10 text-[var(--warn-dark)]"
          )}>{stream}</span>
        </div>
        <p className="text-[10px] text-[var(--sand-500)] truncate">
          {app.country} · {app.sponsor} · Sub {app.submitted}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[10px] font-bold text-[var(--brand-600)] leading-tight">{app.step}</p>
        <p className="text-[9px] text-[var(--sand-400)]">Day {app.day}</p>
      </div>
    </button>
  );
}

Object.assign(window, { STEPS, StepTimeline, StepTimelineDetailed, ApplicantRow });
