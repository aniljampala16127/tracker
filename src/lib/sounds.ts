// ════════════════════════════════════════════════════════════
// Sensory feedback — Web Audio API synth sounds for interaction roles
// Inspired by https://github.com/SatyamVyas04/sensory-ui (the role taxonomy)
// but synthesized in ~80 lines instead of pulling a whole shadcn library.
//
// Calm-first defaults: most roles are 100-200ms quiet sine pings. The big
// celebratory sounds (milestone, complete) are reserved for genuinely
// rewarding moments — marking AOR/BIL etc. and the final eCoPR. Off-brand
// to play sound on every hover or modal open.
// ════════════════════════════════════════════════════════════

export type SoundRole =
  | "tap"        // light feedback on primary tap (CTA buttons)
  | "subtle"     // very quiet, for low-priority confirms
  | "success"    // toast confirmation (saved, posted, reconnected)
  | "error"      // toast error
  | "milestone"  // step marked done — the existing two-tone chime
  | "complete"   // eCoPR / journey complete — the big celebration
  | "open"       // modal/drawer opening
  | "close";     // modal/drawer closing

const SOUND_PREF_KEY = "sponsortrack-sound";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** Global mute preference. Stored in localStorage so it persists across visits. */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_PREF_KEY) !== "off";
}

export function setSoundEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_PREF_KEY, on ? "on" : "off");
}

/** Tiny helper — one oscillator with a quick envelope. */
function ping(opts: {
  freq: number;
  type?: OscillatorType;
  startGain?: number;
  duration?: number;
  startAt?: number;
}) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime + (opts.startAt ?? 0);
  const dur = opts.duration ?? 0.15;
  const gain = opts.startGain ?? 0.08;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, now);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur);
}

/** Play a sound by interaction role. Respects the mute preference. */
export function playSound(role: SoundRole) {
  if (!isSoundEnabled()) return;
  switch (role) {
    case "tap":
      // Single high blip — barely there, just enough to feel responsive.
      ping({ freq: 1100, duration: 0.08, startGain: 0.05 });
      break;
    case "subtle":
      ping({ freq: 700, duration: 0.06, startGain: 0.03 });
      break;
    case "success":
      // Two ascending notes — confirms action landed.
      ping({ freq: 880, duration: 0.12, startGain: 0.07 });
      ping({ freq: 1320, duration: 0.18, startGain: 0.06, startAt: 0.07 });
      break;
    case "error":
      // Brief descending square — clearly "no", but not aggressive.
      ping({ freq: 220, type: "triangle", duration: 0.1, startGain: 0.06 });
      ping({ freq: 175, type: "triangle", duration: 0.15, startGain: 0.05, startAt: 0.07 });
      break;
    case "milestone":
      // Bright two-tone chime — same notes as the legacy playMilestoneSound.
      ping({ freq: 880, duration: 0.3, startGain: 0.15 });
      ping({ freq: 1318.5, duration: 0.4, startGain: 0.12, startAt: 0.1 });
      break;
    case "complete":
      // Three-note arpeggio for eCoPR / journey complete. Bigger.
      ping({ freq: 523.25, duration: 0.25, startGain: 0.12 }); // C5
      ping({ freq: 659.25, duration: 0.3, startGain: 0.12, startAt: 0.1 }); // E5
      ping({ freq: 783.99, duration: 0.5, startGain: 0.12, startAt: 0.22 }); // G5
      break;
    case "open":
      ping({ freq: 660, duration: 0.1, startGain: 0.04 });
      break;
    case "close":
      ping({ freq: 440, duration: 0.1, startGain: 0.04 });
      break;
  }
}

// ── Legacy exports kept for backward compatibility ──
// Existing callsites in /me, /dashboard, /dashboard/[id] still call these.
export function playMilestoneSound() { playSound("milestone"); }
export function playErrorSound() { playSound("error"); }
