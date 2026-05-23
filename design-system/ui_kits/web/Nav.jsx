/* Nav — sticky desktop header + fixed mobile bottom nav */
const { useState: useStateNav, useEffect: useEffectNav, useRef: useRefNav } = React;

const NAV_TABS = [
  { id: "tracker",    label: "Tracker",    icon: PlaneIcon },
  { id: "stats",      label: "Stats",      icon: BarChartIcon },
  { id: "estimator",  label: "Estimator",  icon: ClockIcon },
  { id: "community",  label: "Community",  icon: ChatIcon },
  { id: "me",         label: "Me",         icon: UserIcon },
];

function DesktopTabs({ active, onChange }) {
  const ref = useRefNav(null);
  const [pill, setPill] = useStateNav({ left: 0, width: 0 });
  const activeIdx = NAV_TABS.findIndex(t => t.id === active);

  useEffectNav(() => {
    if (!ref.current) return;
    const tabs = ref.current.querySelectorAll("[data-tab]");
    const el = tabs[activeIdx];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeIdx]);

  return (
    <nav ref={ref} className="hidden sm:flex items-center gap-0.5 bg-[var(--sand-50)] rounded-lg p-0.5 border border-[var(--sand-200)] relative">
      <div className="absolute top-0.5 h-[calc(100%-4px)] bg-[var(--brand-500)] rounded-md transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-0"
           style={{ left: pill.left, width: pill.width, opacity: activeIdx >= 0 ? 1 : 0 }} />
      {NAV_TABS.map(t => {
        const isActive = t.id === active;
        return (
          <button key={t.id} data-tab onClick={() => onChange(t.id)}
            className={cls(
              "relative z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors duration-200",
              isActive ? "text-white" : "text-[var(--sand-500)] hover:text-[var(--sand-800)]"
            )}>
            <t.icon size={13} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function MobileBottomNav({ active, onChange }) {
  const ref = useRefNav(null);
  const [pill, setPill] = useStateNav({ left: 0, width: 0 });
  const [tapped, setTapped] = useStateNav(null);
  const activeIdx = NAV_TABS.findIndex(t => t.id === active);

  useEffectNav(() => {
    if (!ref.current) return;
    const tabs = ref.current.querySelectorAll("[data-btab]");
    const el = tabs[activeIdx];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeIdx]);

  const handleTap = (id) => {
    setTapped(id);
    if (navigator.vibrate) navigator.vibrate(8);
    setTimeout(() => setTapped(null), 200);
    onChange(id);
  };

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-[var(--sand-200)]"
         style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div ref={ref} className="flex items-center justify-around px-2 py-1.5 relative">
        <div className="absolute top-1 h-[calc(100%-8px)] bg-[var(--brand-500)]/10 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-0"
             style={{ left: pill.left, width: pill.width, opacity: activeIdx >= 0 ? 1 : 0 }} />
        {NAV_TABS.map(t => {
          const isActive = t.id === active;
          const isTapped = tapped === t.id;
          return (
            <button key={t.id} data-btab onClick={() => handleTap(t.id)}
              className={cls(
                "relative z-10 flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px] transition-transform duration-150",
                isTapped ? "scale-90" : "scale-100"
              )}>
              <div className={cls(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300",
                isActive && "bg-[var(--brand-500)] shadow-[0_2px_8px_rgba(45,106,79,0.3)]"
              )}>
                <t.icon size={16} className={isActive ? "text-white" : "text-[var(--sand-400)]"} />
              </div>
              <span className={cls("text-[9px] font-semibold transition-colors duration-200",
                isActive ? "text-[var(--brand-600)]" : "text-[var(--sand-400)]")}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Header({ active, onChange }) {
  return (
    <header className="bg-white border-b border-[var(--sand-200)] sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
        <button onClick={() => onChange("tracker")} className="flex items-center gap-2">
          <span className="font-bold text-sm text-[var(--sand-900)]">SponsorTrack</span>
        </button>
        <DesktopTabs active={active} onChange={onChange} />
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--sand-500)] hover:text-[var(--sand-800)] hover:bg-[var(--sand-100)] transition-all" title="Theme">
            <SunIcon size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

Object.assign(window, { Header, MobileBottomNav, NAV_TABS });
