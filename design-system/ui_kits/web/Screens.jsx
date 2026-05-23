/* Screens: Landing (guest), Dashboard, Me, Stats, Community, Detail */

const SAMPLE_APPS = [
  { id: "1", initials: "JK", country: "India",       sponsor: "PR",        stream: "Inland",  submitted: "Aug 14", step: "BIL",        day: 87 },
  { id: "2", initials: "MV", country: "Vietnam",     sponsor: "Citizen",   stream: "Outland", submitted: "Aug 12", step: "AOR",        day: 89 },
  { id: "3", initials: "SR", country: "Philippines", sponsor: "Citizen",   stream: "Outland", submitted: "Aug 15", step: "Medical",    day: 86 },
  { id: "4", initials: "AC", country: "Mexico",      sponsor: "PR",        stream: "Inland",  submitted: "Aug 11", step: "Background", day: 90 },
  { id: "5", initials: "TW", country: "Nigeria",     sponsor: "Citizen",   stream: "Outland", submitted: "Aug 16", step: "AOR",        day: 85 },
  { id: "6", initials: "LP", country: "Brazil",      sponsor: "PR",        stream: "Outland", submitted: "Aug 13", step: "BIL",        day: 88 },
];

const MILESTONES = [
  { initials: "RS", step: "eCoPR",    when: "12m ago" },
  { initials: "DK", step: "Portal 2", when: "1h ago" },
  { initials: "NJ", step: "Medical",  when: "2h ago" },
  { initials: "AB", step: "AOR",      when: "3h ago" },
  { initials: "MK", step: "BIL",      when: "5h ago" },
];

// ────────────────────────────────────────────────────────────
// Landing — guest view
// ────────────────────────────────────────────────────────────
function LandingScreen({ onAdd, onReconnect }) {
  const [pin, setPin] = useState("");
  return (
    <div className="-mt-6">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-500)]/[0.05] via-transparent to-[var(--warn)]/[0.05]" />
        <div className="max-w-5xl mx-auto px-4 pt-12 pb-10 relative">
          <div className="text-center max-w-lg mx-auto">
            <div className="inline-flex items-center mb-4"><Pill>312 applications tracking live</Pill></div>
            <h1 className="text-[30px] sm:text-[36px] font-bold text-[var(--sand-900)] mb-3 leading-[1.05] tracking-tight">
              Track your Canada<br />
              <span className="text-[var(--brand-600)]">spousal sponsorship</span>
            </h1>
            <p className="text-sm text-[var(--sand-500)] mb-6 leading-relaxed max-w-sm mx-auto">
              See real processing times from the community. Know where you stand. Get predicted dates for every step.
            </p>
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <Button variant="primaryCta" size="lg" onClick={onAdd}>Add Your Application</Button>

              <div className="px-4 py-3 bg-white border border-[var(--sand-200)] rounded-xl">
                <p className="text-[11px] font-semibold text-[var(--sand-600)] mb-2">Already tracking? Enter your PIN</p>
                <div className="flex items-center gap-2">
                  <input type="tel" inputMode="numeric" maxLength={4} placeholder="PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g,"").slice(0,4))}
                    className="flex-1 px-3 py-2 text-sm text-center rounded-lg border border-[var(--sand-200)] bg-[var(--sand-50)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]/20 focus:border-[var(--brand-400)] tracking-[0.3em] font-mono" />
                  <Button onClick={() => onReconnect(pin)} disabled={pin.length !== 4}>Reconnect</Button>
                </div>
              </div>

              <button className="text-[var(--sand-500)] hover:text-[var(--sand-800)] font-medium text-xs">View Analytics →</button>
            </div>
          </div>
        </div>
      </section>

      {/* Live stats */}
      <section className="max-w-5xl mx-auto px-4 -mt-2 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Applications" value="312" icon={<AorIcon size={14} className="text-[var(--brand-600)]" />} />
          <StatCard label="Countries"    value="48"  icon={<UsersIcon size={14} className="text-[var(--brand-600)]" />} />
          <StatCard label="Avg AOR"      value="87" suffix="d" icon={<ClockIcon size={14} className="text-[var(--brand-600)]" />} />
          <StatCard label="Got AOR"      value="214" icon={<CheckIcon size={14} className="text-[var(--brand-600)]" />} />
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 mb-8">
        <h2 className="text-lg font-bold text-[var(--sand-900)] text-center mb-5">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Add your app", desc: "Enter initials, country, stream, and submission date. Protected by a 4-digit PIN.", color: "bg-[var(--brand-500)]" },
            { step: "2", title: "Track progress", desc: "Update each step as IRCC processes your application. See how long each stage takes.", color: "bg-[var(--warn)]" },
            { step: "3", title: "Get predictions", desc: "See where you stand vs the community, your queue position, and estimated completion dates.", color: "bg-[var(--brand-600)]" },
          ].map((item) => (
            <Card key={item.step} className="p-5">
              <div className={cls("w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm mb-3", item.color)}>{item.step}</div>
              <h3 className="text-sm font-bold text-[var(--sand-900)] mb-1">{item.title}</h3>
              <p className="text-xs text-[var(--sand-500)] leading-relaxed">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Milestones */}
      <section className="max-w-5xl mx-auto px-4 mb-8">
        <h2 className="text-lg font-bold text-[var(--sand-900)] text-center mb-4">Recent milestones</h2>
        <Card className="p-4 space-y-2">
          {MILESTONES.slice(0,6).map((m, i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <div className="w-6 h-6 rounded-full bg-[var(--brand-100)] flex items-center justify-center flex-shrink-0">
                <CheckIcon size={10} className="text-[var(--brand-600)]" />
              </div>
              <span className="text-[var(--sand-900)]">
                <span className="font-semibold">{m.initials}</span>
                <span className="text-[var(--sand-500)]"> reached </span>
                <span className="font-semibold text-[var(--brand-600)]">{m.step}</span>
              </span>
              <span className="text-[var(--sand-400)] ml-auto flex-shrink-0">{m.when}</span>
            </div>
          ))}
        </Card>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-5xl mx-auto px-4 mb-8">
        <div className="bg-[var(--brand-500)] rounded-2xl p-6 text-center">
          <h2 className="text-lg font-bold text-white mb-1">Join 312+ applicants</h2>
          <p className="text-xs text-white/70 mb-4">Free forever. No sign-up. Takes 30 seconds.</p>
          <button onClick={onAdd}
            className="inline-block px-6 py-2.5 bg-white text-[var(--brand-600)] font-semibold text-sm rounded-xl hover:bg-[var(--sand-50)] transition-all active:scale-[0.98]">
            Add Your Application
          </button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-8">
        <div className="text-center text-[10px] text-[var(--sand-400)] space-y-1">
          <p>SponsorTrack is a free community tool. Not affiliated with IRCC or the Government of Canada.</p>
          <p>All data is community-reported. No personal information is collected.</p>
        </div>
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Dashboard — shared spreadsheet
// ────────────────────────────────────────────────────────────
function DashboardScreen({ onOpen, onAdd }) {
  const [filter, setFilter] = useState("all");
  const apps = filter === "inland" ? SAMPLE_APPS.filter(a => a.stream === "Inland")
              : filter === "outland" ? SAMPLE_APPS.filter(a => a.stream === "Outland")
              : SAMPLE_APPS;
  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-3 flex items-baseline justify-between">
        <div>
          <Eyebrow>Tracker</Eyebrow>
          <h1 className="text-2xl font-bold text-[var(--sand-900)] tracking-tight mt-0.5">All applications</h1>
        </div>
        <Button variant="primary" onClick={onAdd}><PlusIcon size={14} />Add yours</Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 mb-3 flex items-center gap-2">
        {[
          { id: "all",     label: "All · 312" },
          { id: "inland",  label: "Inland · 108" },
          { id: "outland", label: "Outland · 204" },
        ].map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={cls(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
              filter === t.id ? "bg-[var(--brand-500)] text-white"
                              : "bg-white border border-[var(--sand-200)] text-[var(--sand-600)] hover:bg-[var(--sand-50)]"
            )}>{t.label}</button>
        ))}
        <div className="ml-auto text-[11px] text-[var(--sand-500)]">Submitted last 4 weeks</div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-2 bg-[var(--sand-50)] border-b border-[var(--sand-100)] flex items-center justify-between">
            <Eyebrow xs>Cohort · same week</Eyebrow>
            <button className="text-[10px] text-[var(--brand-600)] font-semibold">See all →</button>
          </div>
          {apps.map((a, i) => (
            <ApplicantRow key={a.id} app={a} isYou={a.id === "1"} onClick={() => onOpen(a.id)} isLast={i === apps.length - 1} />
          ))}
        </Card>

        <div className="mt-3 mb-8 text-center text-[10px] text-[var(--sand-400)]">
          Showing {apps.length} of {SAMPLE_APPS.length} · scroll for more
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Me — personalized timeline
// ────────────────────────────────────────────────────────────
function MeScreen({ onOpen }) {
  const me = SAMPLE_APPS[0];
  return (
    <div>
      <section className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <Avatar initials={me.initials} size="lg" variant="brand" />
          <div>
            <h1 className="text-xl font-bold text-[var(--sand-900)]">Welcome back, {me.initials}</h1>
            <p className="text-xs text-[var(--sand-500)]">{me.country} · {me.stream} · {me.sponsor}</p>
          </div>
        </div>

        <Card hoverable onClick={() => onOpen(me.id)} className="mb-3 hover:border-[var(--brand-300)]">
          <div className="flex items-center justify-between mb-2">
            <Eyebrow xs>Your application</Eyebrow>
            <span className="text-[10px] text-[var(--brand-600)] font-semibold">View details →</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--sand-900)]">Waiting for {me.step}</p>
              <p className="text-[11px] text-[var(--sand-500)]">Submitted {me.submitted} · Day {me.day}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[var(--brand-600)]">2</p>
              <p className="text-[9px] text-[var(--sand-400)]">steps done</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "My App",    Icon: UserIcon },
            { label: "Tracker",   Icon: PlaneIcon },
            { label: "Stats",     Icon: BarChartIcon },
            { label: "Estimator", Icon: ClockIcon },
          ].map(q => (
            <button key={q.label} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white border border-[var(--sand-200)] hover:bg-[var(--sand-50)] transition-colors active:scale-[0.97]">
              <q.Icon size={16} className="text-[var(--brand-600)]" />
              <span className="text-[10px] font-semibold text-[var(--sand-600)]">{q.label}</span>
            </button>
          ))}
        </div>

        <Card>
          <div className="flex items-baseline justify-between mb-3">
            <Eyebrow>Your timeline</Eyebrow>
            <span className="text-[10px] text-[var(--sand-400)]">7 steps · 2 done</span>
          </div>
          <StepTimelineDetailed currentStep="bil" events={{ submitted: "Aug 14", aor: "Nov 9" }} />
        </Card>
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Detail screen — one application
// ────────────────────────────────────────────────────────────
function DetailScreen({ id, onBack }) {
  const app = SAMPLE_APPS.find(a => a.id === id) || SAMPLE_APPS[0];
  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-8">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sand-500)] hover:text-[var(--sand-900)] mb-4">
        <ArrowLeftIcon size={14} /> Back to tracker
      </button>

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar initials={app.initials} size="lg" variant="brand" />
          <div>
            <h1 className="text-xl font-bold text-[var(--sand-900)]">{app.initials}</h1>
            <p className="text-xs text-[var(--sand-500)]">{app.country} · {app.sponsor} · {app.stream}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">Compare →</Button>
          <Button variant="ghost" size="sm">Share</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="Submitted" value={app.submitted} />
        <StatCard label="Days in queue" value={app.day} />
        <StatCard label="Current step" value={app.step} highlight />
      </div>

      <Card>
        <div className="flex items-baseline justify-between mb-3">
          <Eyebrow>Timeline</Eyebrow>
          <span className="text-[10px] text-[var(--sand-400)]">Tap a step to update</span>
        </div>
        <StepTimelineDetailed currentStep="bil" events={{ submitted: app.submitted, aor: "Nov 9" }} />
      </Card>

      <div className="mt-3"><Card>
        <Eyebrow>Notes from {app.initials}</Eyebrow>
        <p className="text-sm text-[var(--sand-700)] mt-2 leading-relaxed">
          Got my BIL request via portal this morning. Going for biometrics next Tuesday — fingers crossed for a quick turnaround.
        </p>
      </Card></div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Stats — light recharts-style mock
// ────────────────────────────────────────────────────────────
function StatsScreen() {
  const bars = [
    { label: "Submitted → AOR",   days: 87,  cohort: 312 },
    { label: "AOR → BIL",         days: 32,  cohort: 240 },
    { label: "BIL → Medical",     days: 18,  cohort: 198 },
    { label: "Medical → BG",      days: 41,  cohort: 156 },
    { label: "BG → Portal 1",     days: 64,  cohort: 102 },
    { label: "Portal 1 → eCoPR",  days: 28,  cohort: 67  },
  ];
  const max = Math.max(...bars.map(b => b.days));
  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-8">
      <div className="mb-4">
        <Eyebrow>Stats</Eyebrow>
        <h1 className="text-2xl font-bold text-[var(--sand-900)] tracking-tight mt-0.5">Processing times</h1>
        <p className="text-xs text-[var(--sand-500)] mt-1">Median days between steps · last 12 months · community-reported</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total apps"   value="312" />
        <StatCard label="Avg AOR"      value="87" suffix="d" highlight />
        <StatCard label="Got eCoPR"    value="67" />
        <StatCard label="Inland share" value="35" suffix="%" />
      </div>

      <Card>
        <Eyebrow>Median days per step</Eyebrow>
        <div className="mt-4 space-y-3">
          {bars.map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-32 text-[11px] text-[var(--sand-600)] font-medium">{b.label}</div>
              <div className="flex-1 h-5 bg-[var(--sand-100)] rounded overflow-hidden relative">
                <div className="h-full bg-[var(--brand-500)] rounded transition-all" style={{ width: `${(b.days / max) * 100}%` }} />
              </div>
              <div className="w-12 text-right text-xs font-bold text-[var(--sand-900)] tabular-nums">{b.days}d</div>
              <div className="w-14 text-right text-[10px] text-[var(--sand-400)]">n={b.cohort}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Community — threaded comments
// ────────────────────────────────────────────────────────────
function CommunityScreen() {
  const threads = [
    { author: "JK", when: "12m", text: "Anyone else from India submitted in mid-Aug still waiting on BIL? Day 87 and no change.", replies: 3 },
    { author: "MV", when: "1h",  text: "Got my AOR yesterday — submitted Aug 12, so exactly 89 days. Hope this helps the cohort.", replies: 7 },
    { author: "SR", when: "3h",  text: "Outland · Manila VO · medical request came in this morning. Anyone else from PH?", replies: 12 },
  ];
  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-8">
      <div className="mb-4">
        <Eyebrow>Community</Eyebrow>
        <h1 className="text-2xl font-bold text-[var(--sand-900)] tracking-tight mt-0.5">Cohort chat</h1>
      </div>
      <div className="space-y-2">
        {threads.map((t, i) => (
          <Card hoverable key={i}>
            <div className="flex items-start gap-3">
              <Avatar initials={t.author} size="sm" variant="soft" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-bold text-[var(--sand-900)]">{t.author}</span>
                  <span className="text-[10px] text-[var(--sand-400)]">{t.when}</span>
                </div>
                <p className="text-sm text-[var(--sand-700)] leading-relaxed">{t.text}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--sand-500)]">
                  <button className="hover:text-[var(--brand-600)]">{t.replies} replies</button>
                  <button className="hover:text-[var(--brand-600)]">Reply</button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  LandingScreen, DashboardScreen, MeScreen, DetailScreen, StatsScreen, CommunityScreen,
  SAMPLE_APPS, MILESTONES,
});
