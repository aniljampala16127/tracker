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

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

interface StreamInfo {
  entries: number;
  avgDays: number | null;
  totalWithAor: number;
  weekAorCount: number;
  weekSubFrom: string;
  weekSubTo: string;
}

function streamInfo(apps: Application[], stream: string, cutoff: number): StreamInfo {
  const sa = apps.filter(a => a.stream === stream);
  const days: number[] = [];
  let wk = 0, wFrom = "9999", wTo = "";
  sa.forEach(a => {
    const s = buildStepsMap(a.step_events || []);
    if (!s.submitted || !s.aor) return;
    days.push(daysBetween(s.submitted, s.aor));
    const ev = (a.step_events || []).find(e => e.step_id === "aor");
    if (ev && new Date(ev.created_at).getTime() > cutoff) {
      wk++;
      if (s.submitted < wFrom) wFrom = s.submitted;
      if (s.submitted > wTo) wTo = s.submitted;
    }
  });
  return {
    entries: sa.length,
    avgDays: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
    totalWithAor: days.length,
    weekAorCount: wk,
    weekSubFrom: wFrom === "9999" ? "" : wFrom,
    weekSubTo: wTo,
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
    const ol = streamInfo(apps, "Outland", cutoff);
    const il = streamInfo(apps, "Inland", cutoff);

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
    const nonAor = Object.entries(milestones).filter(([k]) => k !== "AOR").sort((a, b) => b[1] - a[1]).slice(0, 5);
    const totalAor = apps.filter(a => a.step_events?.some(e => e.step_id === "aor")).length;
    const waiting = apps.length - totalAor;
    const pLabel = period === "7" ? "this week" : period === "14" ? "last 2 weeks" : "this month";
    const today = new Date();
    const dateStr = `${MO[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

    // Auto-height calc
    const milestonePillRows = Math.ceil(nonAor.length / 2);
    const H = 44 + 110 + 52 + 96 + 96 + (nonAor.length > 0 ? 28 + milestonePillRows * 32 : 0) + 44;

    const canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // ── Gradient BG ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#E8F5F0");
    bg.addColorStop(0.35, "#F0F7F4");
    bg.addColorStop(0.65, "#FDF8EE");
    bg.addColorStop(1, "#F5EFE0");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Blobs
    blob(ctx, 70, 90, 110, "rgba(45,106,79,0.07)");
    blob(ctx, W - 50, 280, 90, "rgba(212,160,60,0.05)");
    blob(ctx, 80, H - 100, 80, "rgba(45,106,79,0.04)");

    // ── Header ──
    let y = 32;
    ctx.fillStyle = BRAND;
    ctx.font = "bold 13px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SponsorTrack", pad, y);
    ctx.fillStyle = "#A8A69E";
    ctx.font = "400 10px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(dateStr, W - pad, y);

    // ── Hero card ──
    y += 16;
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    rr(ctx, pad, y, inner, 100, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(45,106,79,0.08)";
    ctx.lineWidth = 1;
    rr(ctx, pad, y, inner, 100, 18);
    ctx.stroke();

    ctx.fillStyle = BRAND;
    ctx.font = "bold 44px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${aorCount}`, W / 2, y + 48);
    ctx.fillStyle = "#65635D";
    ctx.font = "12px -apple-system, system-ui, sans-serif";
    ctx.fillText(`AORs received ${pLabel}`, W / 2, y + 68);
    ctx.fillStyle = "#A8A69E";
    ctx.font = "10px -apple-system, system-ui, sans-serif";
    ctx.fillText(`${apps.length} applications tracked`, W / 2, y + 86);

    // ── Stat pills ──
    y += 112;
    const pillW = (inner - 10) / 2;
    // Got AOR pill
    ctx.fillStyle = "rgba(45,106,79,0.08)";
    rr(ctx, pad, y, pillW, 38, 12);
    ctx.fill();
    ctx.fillStyle = BRAND;
    ctx.font = "bold 17px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${totalAor}`, pad + pillW / 2, y + 18);
    ctx.fillStyle = "#A8A69E";
    ctx.font = "600 8px -apple-system, system-ui, sans-serif";
    ctx.fillText("GOT AOR", pad + pillW / 2, y + 31);

    // Waiting pill
    ctx.fillStyle = "rgba(212,160,60,0.08)";
    rr(ctx, pad + pillW + 10, y, pillW, 38, 12);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.font = "bold 17px -apple-system, system-ui, sans-serif";
    ctx.fillText(`${waiting}`, pad + pillW + 10 + pillW / 2, y + 18);
    ctx.fillStyle = "#A8A69E";
    ctx.font = "600 8px -apple-system, system-ui, sans-serif";
    ctx.fillText("WAITING", pad + pillW + 10 + pillW / 2, y + 31);

    // ── Stream cards ──
    y += 52;
    y = drawStreamCard(ctx, pad, y, inner, BRAND, "Outland", ol, pLabel);
    y += 8;
    y = drawStreamCard(ctx, pad, y, inner, GOLD, "Inland", il, pLabel);

    // ── Milestones ──
    if (nonAor.length > 0) {
      y += 12;
      ctx.fillStyle = "#A8A69E";
      ctx.font = "600 8px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("MILESTONES", pad, y);
      y += 10;

      const mPillW = (inner - 8) / 2;
      nonAor.forEach(([step, count], i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const mx = pad + col * (mPillW + 8);
        const my = y + row * 32;

        ctx.fillStyle = "rgba(255,255,255,0.55)";
        rr(ctx, mx, my, mPillW, 26, 13);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.04)";
        ctx.lineWidth = 0.5;
        rr(ctx, mx, my, mPillW, 26, 13);
        ctx.stroke();

        ctx.fillStyle = BRAND;
        ctx.font = "bold 12px -apple-system, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${count}`, mx + 10, my + 17);
        const nw = ctx.measureText(`${count}`).width;
        ctx.fillStyle = "#65635D";
        ctx.font = "11px -apple-system, system-ui, sans-serif";
        ctx.fillText(` ${step}`, mx + 10 + nw, my + 17);
      });
    }

    // ── Footer ──
    ctx.fillStyle = "#C4C2BB";
    ctx.font = "8px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("tracker-lime-five.vercel.app", W / 2, H - 14);

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
  color: string, label: string, sd: StreamInfo, pLabel: string
): number {
  const h = sd.weekAorCount > 0 ? 84 : 72;

  // Frosted card
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  rr(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.04)";
  ctx.lineWidth = 1;
  rr(ctx, x, y, w, h, 14);
  ctx.stroke();

  // Color dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + 16, y + 17, 4, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = "#1C1B19";
  ctx.font = "600 12px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 26, y + 21);

  // Entries + week AOR
  ctx.fillStyle = "#A8A69E";
  ctx.font = "400 10px -apple-system, system-ui, sans-serif";
  ctx.font = "600 12px -apple-system, system-ui, sans-serif";
  const lw = ctx.measureText(label).width;
  ctx.font = "400 10px -apple-system, system-ui, sans-serif";
  ctx.fillText(`${sd.entries} entries`, x + 26 + lw + 8, y + 21);

  // +X AOR this week badge (right)
  if (sd.weekAorCount > 0) {
    const badge = `+${sd.weekAorCount} AOR`;
    ctx.font = "600 9px -apple-system, system-ui, sans-serif";
    const bw = ctx.measureText(badge).width + 12;
    ctx.fillStyle = color + "18";
    rr(ctx, x + w - 12 - bw, y + 10, bw, 18, 9);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = "right";
    ctx.fillText(badge, x + w - 18, y + 22);
    ctx.textAlign = "left";
  }

  // Two numbers row
  const halfW = w / 2;
  const numY = y + 52;

  // Avg days — left
  if (sd.avgDays) {
    ctx.fillStyle = color;
    ctx.font = "bold 26px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${sd.avgDays}`, x + halfW / 2, numY);
    ctx.fillStyle = "#A8A69E";
    ctx.font = "9px -apple-system, system-ui, sans-serif";
    ctx.fillText("days avg", x + halfW / 2, numY + 14);
  }

  // Divider
  ctx.beginPath();
  ctx.moveTo(x + halfW, y + 34);
  ctx.lineTo(x + halfW, numY + 12);
  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // With AOR — right
  ctx.fillStyle = color;
  ctx.font = "bold 26px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${sd.totalWithAor}`, x + halfW + halfW / 2, numY);
  ctx.fillStyle = "#A8A69E";
  ctx.font = "9px -apple-system, system-ui, sans-serif";
  ctx.fillText("with AOR", x + halfW + halfW / 2, numY + 14);
  ctx.textAlign = "left";

  // Date range row
  if (sd.weekAorCount > 0 && sd.weekSubFrom) {
    const rangeY = numY + 26;
    ctx.fillStyle = "#A8A69E";
    ctx.font = "400 9px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    const range = sd.weekSubFrom === sd.weekSubTo
      ? `${fmt(sd.weekSubFrom)} submissions got AOR ${pLabel}`
      : `${fmt(sd.weekSubFrom)} – ${fmt(sd.weekSubTo)} submissions got AOR ${pLabel}`;
    ctx.fillText(range, x + w / 2, rangeY);
    ctx.textAlign = "left";
  }

  return y + h;
}
