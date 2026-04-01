"use client";

import { useCallback, useState } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BRAND = "#2D6A4F";
const GOLD = "#9B7420";

function fmt(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return `${MO[dt.getMonth()]} ${dt.getDate()}`;
}

const STEP_COLORS: Record<string, string> = {
  aor: "#2D6A4F", bil: "#40916C", sponsor_eligibility: "#10B981",
  medical: "#3B82F6", pa_eligibility: "#6366F1", pre_arrival: "#8B5CF6",
  background: "#64748B", portal1: "#14B8A6", portal2: "#06B6D4", ecopr: "#CA8A04",
};

interface DateGroup {
  date: string;
  count: number;
  subDates: string[];
  outland: number;
  inland: number;
}

interface StepData {
  stepId: string;
  label: string;
  entries: number;
  avgDays: number;
  dates: DateGroup[];
}

export function DigestImageExport({ apps }: { apps: Application[] }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);
    const dpr = Math.min(window.devicePixelRatio || 2, 3);
    const W = 390;
    const pad = 24;
    const inner = W - pad * 2;

    const now = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const ld = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const todayStr = ld(now);
    const dow = now.getDay();
    const daysToMon = dow === 0 ? 6 : dow - 1;
    const wkStart = ld(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMon));

    // Collect this week's milestones
    const byStep: Record<string, { stepDate: string; subDate: string; stream: string; days: number }[]> = {};
    apps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      (a.step_events || []).forEach(ev => {
        if (ev.step_id === "submitted") return;
        if (ev.event_date > todayStr || ev.event_date < wkStart) return;
        const pi = STEPS.findIndex(st => st.id === ev.step_id) - 1;
        const pd = pi >= 0 ? s[STEPS[pi].id] : s.submitted;
        const days = pd ? daysBetween(pd, ev.event_date) : 0;
        if (days < 0 || days > 100) return;
        if (!byStep[ev.step_id]) byStep[ev.step_id] = [];
        byStep[ev.step_id].push({ stepDate: ev.event_date, subDate: s.submitted || "", stream: a.stream, days });
      });
    });

    // Build step data
    const steps: StepData[] = [];
    STEPS.forEach(step => {
      if (step.id === "submitted") return;
      const entries = byStep[step.id];
      if (!entries || entries.length === 0) return;

      const byDate: Record<string, DateGroup> = {};
      entries.forEach(e => {
        if (!byDate[e.stepDate]) byDate[e.stepDate] = { date: e.stepDate, count: 0, subDates: [], outland: 0, inland: 0 };
        byDate[e.stepDate].count++;
        if (e.subDate && !byDate[e.stepDate].subDates.includes(e.subDate)) byDate[e.stepDate].subDates.push(e.subDate);
        if (e.stream === "Outland") byDate[e.stepDate].outland++;
        else byDate[e.stepDate].inland++;
      });

      const dates = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
      dates.forEach(d => d.subDates.sort());
      const avgDays = Math.round(entries.reduce((s, e) => s + e.days, 0) / entries.length);

      steps.push({ stepId: step.id, label: step.label, entries: entries.length, avgDays, dates });
    });

    const totalUpdates = steps.reduce((s, st) => s + st.entries, 0);
    const waiting = apps.filter(a => !(a.step_events || []).some(e => e.step_id === "aor")).length;

    // Calculate dynamic height
    let totalDateRows = 0;
    steps.forEach(st => { totalDateRows += st.dates.length; });
    const H = 120 + steps.length * 44 + totalDateRows * 28 + 60;

    const canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#F5F8F6");
    bgGrad.addColorStop(0.5, "#FAFBFA");
    bgGrad.addColorStop(1, "#F8F7F4");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Header
    let y = 30;
    ctx.fillStyle = BRAND;
    ctx.font = "bold 14px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SponsorTrack", pad, y);
    ctx.fillStyle = "#A8A69E";
    ctx.font = "400 10px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${fmt(wkStart)} – ${fmt(todayStr)}`, W - pad, y);

    // Summary line
    y += 22;
    ctx.textAlign = "left";
    ctx.fillStyle = "#1C1B19";
    ctx.font = "bold 22px -apple-system, system-ui, sans-serif";
    ctx.fillText(`${totalUpdates}`, pad, y);
    ctx.fillStyle = "#65635D";
    ctx.font = "400 13px -apple-system, system-ui, sans-serif";
    const numW = ctx.measureText(`${totalUpdates}`).width;
    ctx.fillText(` milestones this week`, pad + numW, y);

    y += 18;
    ctx.fillStyle = "#A8A69E";
    ctx.font = "400 10px -apple-system, system-ui, sans-serif";
    ctx.fillText(`${apps.length} tracked · ${waiting} waiting for AOR`, pad, y);

    // Divider
    y += 16;
    ctx.fillStyle = "#E8E6E1";
    ctx.fillRect(pad, y, inner, 1);
    y += 12;

    // Each milestone
    steps.forEach(step => {
      const color = STEP_COLORS[step.stepId] || "#65635D";

      // Step header
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pad + 5, y + 4, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1C1B19";
      ctx.font = "bold 13px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(step.label, pad + 16, y + 8);

      ctx.fillStyle = "#A8A69E";
      ctx.font = "400 10px -apple-system, system-ui, sans-serif";
      const labelW = ctx.measureText(step.label).width;
      ctx.fillText(` — ${step.entries} received · avg ${step.avgDays}d`, pad + 16 + labelW, y + 8);

      y += 22;

      // Date rows
      step.dates.forEach(d => {
        const subList = d.subDates.map(s => fmt(s)).join(", ");
        const streamInfo = d.inland > 0 && d.outland > 0 ? ` (${d.outland}O/${d.inland}I)` : d.inland > 0 ? " (Inland)" : "";

        // Date pill
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        roundRect(ctx, pad + 8, y - 4, inner - 16, 22, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.04)";
        ctx.lineWidth = 0.5;
        roundRect(ctx, pad + 8, y - 4, inner - 16, 22, 6);
        ctx.stroke();

        ctx.fillStyle = "#1C1B19";
        ctx.font = "600 10px -apple-system, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${fmt(d.date)}`, pad + 16, y + 9);

        ctx.fillStyle = "#65635D";
        ctx.font = "400 9px -apple-system, system-ui, sans-serif";
        const dateW = ctx.measureText(fmt(d.date)).width;
        ctx.fillText(` — ${d.count}${streamInfo} · sub ${subList}`, pad + 16 + dateW, y + 9);

        y += 24;
      });

      y += 8;
    });

    // Footer
    y += 4;
    ctx.fillStyle = "#C4C2BB";
    ctx.font = "9px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("tracker-lime-five.vercel.app", W / 2, y);

    // Export
    canvas.toBlob((blob) => {
      if (!blob) { setExporting(false); return; }
      const file = new File([blob], "sponsortrack-weekly.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: "SponsorTrack Weekly" }).catch(() => {}).finally(() => setExporting(false));
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "sponsortrack-weekly.png";
        a.click();
        URL.revokeObjectURL(url);
        setExporting(false);
      }
    }, "image/png");
  }, [apps]);

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-500/10 text-brand-600 text-xs font-medium hover:bg-brand-500/20 transition-colors active:scale-[0.98] disabled:opacity-50"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15L16 10L5 21" />
      </svg>
      {exporting ? "..." : "Share as Image"}
    </button>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
