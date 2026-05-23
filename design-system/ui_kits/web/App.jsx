/* App — root, hosts the simulated session + modal */

function AddAppModal({ open, onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ initials: "", country: "India", stream: "Inland", sponsor: "PR", submitted: "", pin: "" });

  useEffect(() => { if (open) { setStep(0); setData({ initials: "", country: "India", stream: "Inland", sponsor: "PR", submitted: "", pin: "" }); } }, [open]);

  if (!open) return null;
  const canNext = step === 0 ? data.initials.length >= 1 :
                  step === 1 ? !!data.submitted :
                  data.pin.length === 4;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
         onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-auto"
           onClick={e => e.stopPropagation()}
           style={{ animation: "modal-slide-up 0.3s cubic-bezier(0.22,1,0.36,1)" }}>
        <div className="sm:hidden flex justify-center mb-3 -mt-1"><div className="w-9 h-1 rounded-full bg-[var(--sand-300)]" /></div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[var(--sand-900)]">Add your application</h2>
          <button onClick={onClose} className="text-[var(--sand-400)] hover:text-[var(--sand-700)] p-1 -mr-1 rounded-lg hover:bg-[var(--sand-100)] active:scale-90">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1 mb-5">
          {[0,1,2].map(i => (
            <div key={i} className={cls("flex-1 h-1 rounded-full", i <= step ? "bg-[var(--brand-500)]" : "bg-[var(--sand-200)]")} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--sand-500)] uppercase tracking-wider">Initials</label>
              <input maxLength={3} value={data.initials} onChange={e => setData({...data, initials: e.target.value.toUpperCase()})}
                placeholder="e.g. JK"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--sand-200)] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]/20 focus:border-[var(--brand-400)]" />
              <p className="text-[10px] text-[var(--sand-400)] mt-1">Just 2–3 letters. No personal info is collected.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[var(--sand-500)] uppercase tracking-wider">Country</label>
                <select value={data.country} onChange={e => setData({...data, country: e.target.value})}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--sand-200)] text-sm bg-white">
                  <option>India</option><option>Philippines</option><option>Mexico</option><option>Vietnam</option><option>Nigeria</option><option>Brazil</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--sand-500)] uppercase tracking-wider">Sponsor</label>
                <select value={data.sponsor} onChange={e => setData({...data, sponsor: e.target.value})}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--sand-200)] text-sm bg-white">
                  <option>Citizen</option><option>PR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[var(--sand-500)] uppercase tracking-wider">Stream</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {["Inland", "Outland"].map(s => (
                  <button key={s} onClick={() => setData({...data, stream: s})}
                    className={cls("py-2 rounded-lg text-sm font-semibold transition-all border",
                      data.stream === s
                        ? "bg-[var(--brand-500)] text-white border-[var(--brand-500)]"
                        : "bg-white text-[var(--sand-700)] border-[var(--sand-200)] hover:border-[var(--brand-300)]"
                    )}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--sand-500)] uppercase tracking-wider">Submission date</label>
              <input type="date" value={data.submitted} onChange={e => setData({...data, submitted: e.target.value})}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--sand-200)] text-sm bg-white" />
              <p className="text-[10px] text-[var(--sand-400)] mt-1">The date you mailed or uploaded the application.</p>
            </div>
            <Card className="bg-[var(--brand-50)] border-[var(--brand-200)]">
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-[var(--brand-500)] flex items-center justify-center flex-shrink-0">
                  <CheckIcon size={10} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--brand-700)]">You'll join 14 others submitted that week</p>
                  <p className="text-[11px] text-[var(--brand-600)] mt-0.5">Compare your timeline against the same-week cohort.</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--sand-500)] uppercase tracking-wider">4-digit PIN</label>
              <input type="tel" inputMode="numeric" maxLength={4} value={data.pin}
                onChange={e => setData({...data, pin: e.target.value.replace(/\D/g,"").slice(0,4)})}
                placeholder="••••"
                className="mt-1 w-full px-3 py-3 text-center rounded-lg border border-[var(--sand-200)] text-lg bg-[var(--sand-50)] font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]/20 focus:border-[var(--brand-400)]" />
              <p className="text-[10px] text-[var(--sand-400)] mt-1">Used to re-open and update your entry. Anyone with the PIN can edit.</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}
          <Button variant="primary" disabled={!canNext}
            onClick={() => step < 2 ? setStep(step + 1) : onSave(data)}
            className="flex-1">
            {step < 2 ? "Continue" : "Save application"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [message]);
  if (!message) return null;
  return (
    <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[var(--sand-900)] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg"
         style={{ animation: "modal-slide-up 0.25s cubic-bezier(0.22,1,0.36,1)" }}>
      {message}
    </div>
  );
}

function App() {
  const [route, setRoute] = useState("landing"); // landing | tracker | stats | community | me
  const [detailId, setDetailId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const nav = (id) => { setDetailId(null); setRoute(id); window.scrollTo(0, 0); };

  const onSave = (data) => {
    setAddOpen(false);
    setLoggedIn(true);
    setToast(`Welcome, ${data.initials || "JK"} — entry saved.`);
    setRoute("me");
  };

  const onReconnect = (pin) => {
    if (pin === "1234" || pin.length === 4) {
      setLoggedIn(true);
      setToast("PIN matched · welcome back");
      setRoute("me");
    } else {
      setToast("No entries found with this PIN");
    }
  };

  // Active nav highlight (only meaningful after login or when not on landing)
  const activeNav = route === "landing" ? "tracker" : route;

  return (
    <>
      <Header active={activeNav} onChange={nav} />

      {/* Spacer to clear sticky header padding */}
      <div className="min-h-[calc(100vh-48px-64px)] pb-24 sm:pb-8 pt-6">
        {detailId
          ? <DetailScreen id={detailId} onBack={() => setDetailId(null)} />
          : route === "landing"   ? <LandingScreen onAdd={() => setAddOpen(true)} onReconnect={onReconnect} />
          : route === "tracker"   ? <DashboardScreen onOpen={(id) => setDetailId(id)} onAdd={() => setAddOpen(true)} />
          : route === "me"        ? <MeScreen onOpen={(id) => setDetailId(id)} />
          : route === "stats"     ? <StatsScreen />
          : route === "community" ? <CommunityScreen />
          : <DashboardScreen onOpen={(id) => setDetailId(id)} onAdd={() => setAddOpen(true)} />}
      </div>

      <footer className="border-t border-[var(--sand-200)] py-4">
        <div className="max-w-5xl mx-auto px-4 text-center text-[10px] text-[var(--sand-400)]">
          SponsorTrack · Not affiliated with IRCC · Community-reported data
        </div>
      </footer>

      <MobileBottomNav active={activeNav} onChange={nav} />
      <AddAppModal open={addOpen} onClose={() => setAddOpen(false)} onSave={onSave} />
      <Toast message={toast} onDone={() => setToast("")} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
