"use client";

import { useCallback, useState } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween, getOutlierMax } from "@/lib/utils";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return `${MO[dt.getMonth()]} ${dt.getDate()}`;
}

const STEP_COLORS: Record<string, string> = {
  aor: "#2D6A4F", bil: "#40916C", sponsor_eligibility: "#10B981",
  medical: "#3B82F6", pa_eligibility: "#6366F1", pre_arrival: "#8B5CF6",
  background: "#64748B", portal1: "#14B8A6", portal2: "#06B6D4", ecopr: "#CA8A04",
};

interface DateGroup { date: string; count: number; subDates: string[]; outland: number; inland: number; }
interface StepData { stepId: string; label: string; entries: number; avgDays: number; dates: DateGroup[]; }

export function DigestImageExport({ apps }: { apps: Application[] }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);
    const dpr = Math.min(window.devicePixelRatio || 2, 3);
    const W = 420;
    const pad = 28;
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
        if (days < 0 || days > getOutlierMax(a.province)) return;
        if (!byStep[ev.step_id]) byStep[ev.step_id] = [];
        byStep[ev.step_id].push({ stepDate: ev.event_date, subDate: s.submitted || "", stream: a.stream, days });
      });
    });

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
        if (e.stream === "Outland") byDate[e.stepDate].outland++; else byDate[e.stepDate].inland++;
      });
      const dates = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
      dates.forEach(d => d.subDates.sort());
      const avgDays = Math.round(entries.reduce((s, e) => s + e.days, 0) / entries.length);
      steps.push({ stepId: step.id, label: step.label, entries: entries.length, avgDays, dates });
    });

    const totalUpdates = steps.reduce((s, st) => s + st.entries, 0);
    const waiting = apps.filter(a => !(a.step_events || []).some(e => e.step_id === "aor")).length;

    // Dynamic height
    let totalDateRows = 0;
    steps.forEach(st => { totalDateRows += st.dates.length; });
    const H = 160 + (steps.length * 18 + 60) + steps.length * 56 + totalDateRows * 34 + 70;

    const canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#FAFBFA";
    ctx.fillRect(0, 0, W, H);

    // Subtle top accent
    const accent = ctx.createLinearGradient(0, 0, W, 0);
    accent.addColorStop(0, "#2D6A4F");
    accent.addColorStop(1, "#40916C");
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, W, 4);

    // Header
    let y = 32;
    ctx.fillStyle = "#2D6A4F";
    ctx.font = "bold 16px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SponsorTrack", pad, y);

    ctx.fillStyle = "#A8A69E";
    ctx.font = "400 11px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${fmt(wkStart)} – ${fmt(todayStr)}`, W - pad, y);

    // Big number + label on separate lines
    y += 32;
    ctx.textAlign = "left";
    ctx.fillStyle = "#1C1B19";
    ctx.font = "bold 36px -apple-system, system-ui, sans-serif";
    ctx.fillText(`${totalUpdates}`, pad, y);

    y += 22;
    ctx.fillStyle = "#65635D";
    ctx.font = "400 14px -apple-system, system-ui, sans-serif";
    ctx.fillText("milestones this week", pad, y);

    y += 20;
    ctx.fillStyle = "#A8A69E";
    ctx.font = "400 11px -apple-system, system-ui, sans-serif";
    ctx.fillText(`${apps.length} tracked  ·  ${waiting} waiting for AOR`, pad, y);

    // Divider
    y += 18;
    ctx.fillStyle = "#E8E6E1";
    ctx.fillRect(pad, y, inner, 1);
    y += 20;

    // Currently Processing section
    ctx.fillStyle = "#1C1B19";
    ctx.font = "bold 12px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Currently Processing", pad, y);
    y += 16;

    steps.forEach(step => {
      const allSubs = Array.from(new Set(step.dates.flatMap(d => d.subDates))).sort();
      if (allSubs.length === 0) return;
      const earliest = fmt(allSubs[0]);
      const latest = fmt(allSubs[allSubs.length - 1]);
      const subInfo = allSubs.length === 1 ? earliest : `${earliest} to ${latest}`;

      const color = STEP_COLORS[step.stepId] || "#65635D";
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pad + 10, y + 3, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1C1B19";
      ctx.font = "600 10px -apple-system, system-ui, sans-serif";
      ctx.fillText(step.label, pad + 20, y + 7);
      const lw = ctx.measureText(step.label).width;
      ctx.fillStyle = "#65635D";
      ctx.font = "400 10px -apple-system, system-ui, sans-serif";
      ctx.fillText(`  submitted ${subInfo}`, pad + 20 + lw, y + 7);
      y += 18;
    });

    // Divider before details
    y += 6;
    ctx.fillStyle = "#E8E6E1";
    ctx.fillRect(pad, y, inner, 1);
    y += 20;

    // Each milestone detail
    steps.forEach(step => {
      const color = STEP_COLORS[step.stepId] || "#65635D";

      // Dot + label
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pad + 6, y + 5, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1C1B19";
      ctx.font = "bold 14px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(step.label, pad + 20, y + 10);

      ctx.fillStyle = "#A8A69E";
      ctx.font = "400 11px -apple-system, system-ui, sans-serif";
      const lw = ctx.measureText(step.label).width;
      ctx.fillText(`  ${step.entries} received  ·  avg ${step.avgDays}d`, pad + 20 + lw, y + 10);

      y += 28;

      // Date rows
      step.dates.forEach(d => {
        const subList = d.subDates.map(s => fmt(s)).join(", ");
        const streamInfo = d.inland > 0 && d.outland > 0 ? ` (${d.outland} Outland, ${d.inland} Inland)` : d.inland > 0 ? " (Inland)" : "";

        // Row background
        ctx.fillStyle = "rgba(45,106,79,0.03)";
        roundRect(ctx, pad + 12, y - 6, inner - 24, 26, 8);
        ctx.fill();

        // Date bold
        ctx.fillStyle = "#1C1B19";
        ctx.font = "600 11px -apple-system, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(fmt(d.date), pad + 22, y + 10);

        // Details
        ctx.fillStyle = "#65635D";
        ctx.font = "400 10px -apple-system, system-ui, sans-serif";
        const dw = ctx.measureText(fmt(d.date)).width;
        ctx.fillText(` — ${d.count}${streamInfo}  ·  sub ${subList}`, pad + 22 + dw, y + 10);

        y += 30;
      });

      y += 12;
    });

    // Footer
    y += 8;
    ctx.fillStyle = "#E8E6E1";
    ctx.fillRect(pad, y, inner, 1);
    y += 16;
    ctx.fillStyle = "#A8A69E";
    ctx.font = "400 10px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("https://sponsortrack.online/dashboard", W / 2, y);

    // Export with URL text alongside image
    canvas.toBlob((blob) => {
      if (!blob) { setExporting(false); return; }
      const file = new File([blob], "sponsortrack-weekly.png", { type: "image/png" });
      const shareText = "SponsorTrack — Weekly Update\nTrack yours: https://sponsortrack.online/dashboard";
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], text: shareText, title: "SponsorTrack Weekly" }).catch(() => {}).finally(() => setExporting(false));
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
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
