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

interface StreamWeekData {
  entries: number;
  avgDays: number | null;
  totalWithAor: number;
  weekAorCount: number;
  weekEarlySub: string;
  weekLateSub: string;
}

function getStreamWeekData(apps: Application[], stream: string, cutoff: number): StreamWeekData {
  const sa = apps.filter(a => a.stream === stream);
  const allDays: number[] = [];
  let weekCount = 0;
  let wEarly = "9999", wLate = "";

  sa.forEach(a => {
    const s = buildStepsMap(a.step_events || []);
    if (!s.submitted || !s.aor) return;
    allDays.push(daysBetween(s.submitted, s.aor));
    const aorEv = (a.step_events || []).find(e => e.step_id === "aor");
    if (aorEv && new Date(aorEv.created_at).getTime() > cutoff) {
      weekCount++;
      if (s.submitted < wEarly) wEarly = s.submitted;
      if (s.submitted > wLate) wLate = s.submitted;
    }
  });

  return {
    entries: sa.length,
    avgDays: allDays.length ? Math.round(allDays.reduce((a, b) => a + b, 0) / allDays.length) : null,
    totalWithAor: allDays.length,
    weekAorCount: weekCount,
    weekEarlySub: wEarly === "9999" ? "" : wEarly,
    weekLateSub: wLate,
  };
}

export function DigestImageExport({ apps, period }: { apps: Application[]; period: string }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);
    const dpr = Math.min(window.devicePixelRatio || 2, 3);
    const W = 390;
    const pad = 24;
    const inner = W - pad * 2;

    const cutoff = Date.now() - parseInt(period) * 24 * 60 * 60 * 1000;
    const outland = getStreamWeekData(apps, "Outland", cutoff);
    const inland = getStreamWeekData(apps, "Inland", cutoff);

    const milestones: Record<string, number> = {};
    apps.forEach(a => {
      (a.step_events || []).forEach(e => {
        if (e.step_id === "submitted") return;
        if (new Date(e.created_at).getTime() > cutoff) {
          const label = STEPS.find(s => s.id === e.step_id)?.label || e.step_id;
          milestones[label] = (milestones[label] || 0) + 1;
        }
      });
    });
    const aorCount = milestones["AOR"] || 0;
    const nonAor = Object.entries(milestones).filter(([k]) => k !== "AOR").sort((a, b) => b[1] - a[1]).slice(0, 4);
    const totalWithAor = apps.filter(a => a.step_events?.some(e => e.step_id === "aor")).length;
    const totalWaiting = apps.length - totalWithAor;
    const periodLabel = period === "7" ? "This Week" : period === "14" ? "2 Weeks" : "This Month";
    const today = new Date();
    const dateStr = `${MO[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

    // Dynamic height based on content
    const milestoneRows = Math.ceil(nonAor.length / 2);
    const H = 36 + 110 + 50 + 98 * 2 + 16 + (nonAor.length > 0 ? 24 + milestoneRows * 32 : 0) + 50;

    const canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // ── Mesh gradient background ──
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#EAF4EF");
    bgGrad.addColorStop(0.35, "#F2F8F5");
    bgGrad.addColorStop(0.65, "#FBF7EE");
    bgGrad.addColorStop(1, "#F5EFE0");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle blobs
    drawBlob(ctx, 70, 80, 110, "rgba(45,106,79,0.06)");
    drawBlob(ctx, W - 50, 280, 90, "rgba(212,160,60,0.05)");

    // ── Header ──
    let y = 28;
    ctx.fillStyle = BRAND;
    ctx.font = "bold 13px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SponsorTrack", pad, y);
    ctx.fillStyle = "#A8A69E";
    ctx.font = "400 10px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${periodLabel} · ${dateStr}`, W - pad, y);

    // ── Hero card ──
    y += 16;
    const heroH = 96;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    roundRect(ctx, pad, y, inner, heroH, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(45,106,79,0.08)";
    ctx.lineWidth = 1;
    roundRect(ctx, pad, y, inner, heroH, 18);
    ctx.stroke();

    ctx.fillStyle = "#1C1B19";
    ctx.font = "bold 44px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${aorCount}`, W / 2, y + 46);
    ctx.fillStyle = "#65635D";
    ctx.font = "300 12px -apple-system, system-ui, sans-serif";
    ctx.fillText("acknowledgements received", W / 2, y + 64);
    ctx.fillStyle = "#A8A69E";
    ctx.font = "300 9px -apple-system, system-ui, sans-serif";
    ctx.fillText(`from ${apps.length} tracked applications`, W / 2, y + 80);

    // ── Stat pills ──
    y += heroH + 12;
    const pillW = (inner - 10) / 3;
    const pills = [
      { v: `${apps.length}`, l: "Tracked", bg: "rgba(45,106,79,0.08)" },
      { v: `${totalWithAor}`, l: "Got AOR", bg: "rgba(45,106,79,0.08)" },
      { v: `${totalWaiting}`, l: "Waiting", bg: "rgba(155,116,32,0.08)" },
    ];
    pills.forEach((p, i) => {
      const px = pad + i * (pillW + 5);
      ctx.fillStyle = p.bg;
      roundRect(ctx, px, y, pillW, 36, 10);
      ctx.fill();
      ctx.fillStyle = "#1C1B19";
      ctx.font = "bold 16px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.v, px + pillW / 2, y + 18);
      ctx.fillStyle = "#A8A69E";
      ctx.font = "600 7px -apple-system, system-ui, sans-serif";
      ctx.fillText(p.l, px + pillW / 2, y + 30);
    });

    // ── Stream cards ──
    y += 48;
    y = drawStreamCard(ctx, pad, y, inner, BRAND, "Outland", outland, periodLabel);
    y += 8;
    y = drawStreamCard(ctx, pad, y, inner, GOLD, "Inland", inland, periodLabel);

    // ── Milestones ──
    if (nonAor.length > 0) {
      y += 12;
      ctx.fillStyle = "#A8A69E";
      ctx.font = "600 8px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("MILESTONES", pad, y);
      y += 8;

      const mColW = (inner - 8) / 2;
      nonAor.forEach(([step, count], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const mx = pad + col * (mColW + 8);
        const my = y + row * 30;
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        roundRect(ctx, mx, my, mColW, 24, 8);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.04)";
        ctx.lineWidth = 0.5;
        roundRect(ctx, mx, my, mColW, 24, 8);
        ctx.stroke();
        ctx.fillStyle = BRAND;
        ctx.font = "bold 12px -apple-system, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${count}`, mx + 10, my + 16);
        ctx.fillStyle = "#65635D";
        ctx.font = "11px -apple-system, system-ui, sans-serif";
        const nw = ctx.measureText(`${count}`).width;
        ctx.fillText(step, mx + 10 + nw + 5, my + 16);
      });
    }

    // ── Footer ──
    ctx.fillStyle = "#C4C2BB";
    ctx.font = "8px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("tracker-lime-five.vercel.app", W / 2, H - 12);

    // ── Export ──
    canvas.toBlob((blob) => {
      if (!blob) { setExporting(false); return; }
      const file = new File([blob], "sponsortrack-digest.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: "SponsorTrack Weekly" }).catch(() => {}).finally(() => setExporting(false));
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "sponsortrack-digest.png";
        a.click();
        URL.revokeObjectURL(url);
        setExporting(false);
      }
    }, "image/png");
  }, [apps, period]);

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sand-100 text-sand-600 text-xs font-medium hover:bg-sand-200 transition-colors active:scale-[0.98] disabled:opacity-50"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15V19C21 20.1 19.9 21 19 21H5C3.9 21 3 20.1 3 19V15"/>
        <path d="M7 10L12 15L17 10"/>
        <path d="M12 15V3"/>
      </svg>
      {exporting ? "..." : "Share as Image"}
    </button>
  );
}

function drawStreamCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  color: string, label: string, sd: StreamWeekData, periodLabel: string
): number {
  const h = 88;

  // Frosted card
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.04)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();

  // Color dot + label
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + 16, y + 18, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1C1B19";
  ctx.font = "600 12px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 26, y + 22);

  // Entries + week AOR count
  ctx.fillStyle = "#A8A69E";
  ctx.font = "400 10px -apple-system, system-ui, sans-serif";
  const lw = ctx.measureText(label).width;
  ctx.fillText(`${sd.entries} entries`, x + 26 + lw + 8, y + 22);

  // Week AOR badge (right)
  if (sd.weekAorCount > 0) {
    const badge = `+${sd.weekAorCount} ${periodLabel.toLowerCase()}`;
    ctx.font = "600 9px -apple-system, system-ui, sans-serif";
    const bw = ctx.measureText(badge).width + 12;
    ctx.fillStyle = color + "15";
    roundRect(ctx, x + w - 12 - bw, y + 10, bw, 18, 9);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = "right";
    ctx.fillText(badge, x + w - 18, y + 23);
    ctx.textAlign = "left";
  }

  // Two big numbers row
  const halfW = w / 2;
  const numY = y + 56;

  // Avg days (left)
  if (sd.avgDays) {
    ctx.fillStyle = color;
    ctx.font = "bold 28px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${sd.avgDays}`, x + halfW / 2, numY);
    ctx.fillStyle = "#A8A69E";
    ctx.font = "9px -apple-system, system-ui, sans-serif";
    ctx.fillText("days avg", x + halfW / 2, numY + 14);
  }

  // Divider
  ctx.beginPath();
  ctx.moveTo(x + halfW, y + 36);
  ctx.lineTo(x + halfW, y + 74);
  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // With AOR (right)
  ctx.fillStyle = color;
  ctx.font = "bold 28px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${sd.totalWithAor}`, x + halfW + halfW / 2, numY);
  ctx.fillStyle = "#A8A69E";
  ctx.font = "9px -apple-system, system-ui, sans-serif";
  ctx.fillText("with AOR", x + halfW + halfW / 2, numY + 14);

  // AOR date range (bottom of card)
  if (sd.weekAorCount > 0 && sd.weekEarlySub) {
    ctx.fillStyle = "#A8A69E";
    ctx.font = "400 8px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    const range = sd.weekEarlySub === sd.weekLateSub
      ? `${fmt(sd.weekEarlySub)} submissions received AOR`
      : `${fmt(sd.weekEarlySub)} → ${fmt(sd.weekLateSub)} submissions received AOR`;
    ctx.fillText(range, x + w / 2, y + h - 6);
  }

  ctx.textAlign = "left";
  return y + h;
}

function drawBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
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
