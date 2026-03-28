"use client";

import { useCallback, useState } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return `${MO[dt.getMonth()]} ${dt.getDate()}`;
}

interface StreamData {
  entries: number;
  avgDays: number | null;
  withAor: number;
  earliestAorSub: string;
  latestAorSub: string;
}

function getStreamData(apps: Application[], stream: string): StreamData {
  const sa = apps.filter(a => a.stream === stream);
  const days: number[] = [];
  let earliest = "9999";
  let latest = "";
  sa.forEach(a => {
    const s = buildStepsMap(a.step_events || []);
    if (s.submitted && s.aor) {
      days.push(daysBetween(s.submitted, s.aor));
      if (s.submitted < earliest) earliest = s.submitted;
      if (s.submitted > latest) latest = s.submitted;
    }
  });
  return {
    entries: sa.length,
    avgDays: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
    withAor: days.length,
    earliestAorSub: earliest === "9999" ? "" : earliest,
    latestAorSub: latest,
  };
}

export function DigestImageExport({ apps, period }: { apps: Application[]; period: string }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);
    const dpr = Math.min(window.devicePixelRatio || 2, 3);
    const W = 390;
    const H = 693;
    const pad = 28;
    const inner = W - pad * 2;
    const left = pad;
    const right = W - pad;

    const cutoff = Date.now() - parseInt(period) * 24 * 60 * 60 * 1000;
    const outland = getStreamData(apps, "Outland");
    const inland = getStreamData(apps, "Inland");

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
    const today = new Date();
    const dateStr = `${MO[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    const periodLabel = period === "7" ? "This Week" : period === "14" ? "2 Weeks" : "This Month";

    const canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // ── BG ──
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#2D6A4F";
    ctx.fillRect(0, 0, W, 5);

    // ── Header row ──
    let y = 30;
    ctx.fillStyle = "#2D6A4F";
    ctx.font = "700 10px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SPONSORTRACK", left, y);
    ctx.fillStyle = "#A8A69E";
    ctx.font = "400 10px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(dateStr.toUpperCase(), right, y);

    // Thick rule
    y += 8;
    ctx.fillStyle = "#2D6A4F";
    ctx.fillRect(left, y, inner, 2);

    // ── Hero ──
    y += 44;
    ctx.fillStyle = "#1C1B19";
    ctx.font = "bold 50px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(`${aorCount}`, W / 2, y);
    y += 18;
    ctx.fillStyle = "#65635D";
    ctx.font = "300 12px -apple-system, system-ui, sans-serif";
    ctx.fillText(`AORs received · ${periodLabel}`, W / 2, y);

    // ── Thin double rule ──
    y += 14;
    ctx.fillStyle = "#1C1B19";
    ctx.fillRect(left + 60, y, inner - 120, 1.5);
    ctx.fillRect(left + 60, y + 3, inner - 120, 0.5);

    // ── Stat row ──
    y += 24;
    const sw = inner / 3;
    [
      { v: `${apps.length}`, l: "TRACKED" },
      { v: `${totalWithAor}`, l: "GOT AOR" },
      { v: `${totalWaiting}`, l: "WAITING" },
    ].forEach((s, i) => {
      const cx = left + sw * i + sw / 2;
      ctx.fillStyle = "#1C1B19";
      ctx.font = "bold 20px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(s.v, cx, y + 14);
      ctx.fillStyle = "#A8A69E";
      ctx.font = "600 7px -apple-system, system-ui, sans-serif";
      ctx.fillText(s.l, cx, y + 26);
      if (i < 2) {
        ctx.fillStyle = "#E8E6E1";
        ctx.fillRect(left + sw * (i + 1) - 0.5, y + 2, 1, 24);
      }
    });

    // ── Stream sections ──
    y += 44;
    y = drawStreamSection(ctx, left, right, inner, y, "OUTLAND", "#2D6A4F", outland);
    y += 10;
    y = drawStreamSection(ctx, left, right, inner, y, "INLAND", "#9B7420", inland);

    // ── Milestones ──
    y += 10;
    ctx.fillStyle = "#E8E6E1";
    ctx.fillRect(left, y, inner, 1);
    y += 16;
    ctx.fillStyle = "#1C1B19";
    ctx.font = "700 8px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("OTHER MILESTONES", left, y);
    y += 6;

    const mColW = inner / 2;
    nonAor.forEach(([step, count], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const mx = left + col * mColW;
      const my = y + row * 24;
      ctx.fillStyle = "#2D6A4F";
      ctx.font = "bold 14px Georgia, serif";
      ctx.textAlign = "left";
      ctx.fillText(`${count}`, mx, my + 16);
      ctx.fillStyle = "#65635D";
      ctx.font = "12px -apple-system, system-ui, sans-serif";
      const nw = ctx.measureText(`${count}`).width;
      ctx.fillText(`  ${step}`, mx + nw, my + 16);
    });

    // ── Footer ──
    ctx.fillStyle = "#2D6A4F";
    ctx.fillRect(left, H - 30, inner, 1);
    ctx.fillStyle = "#A8A69E";
    ctx.font = "600 7px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TRACKER-LIME-FIVE.VERCEL.APP", W / 2, H - 16);

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

function drawStreamSection(
  ctx: CanvasRenderingContext2D,
  left: number, right: number, inner: number, y: number,
  label: string, color: string, sd: StreamData
): number {
  // Color bar
  ctx.fillStyle = color;
  ctx.fillRect(left, y, 3, 58);

  // Label + entries
  ctx.fillStyle = "#1C1B19";
  ctx.font = "700 9px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(label, left + 12, y + 12);
  ctx.fillStyle = "#A8A69E";
  ctx.font = "400 9px -apple-system, system-ui, sans-serif";
  ctx.font = "700 9px -apple-system, system-ui, sans-serif";
  const lw = ctx.measureText(label).width;
  ctx.font = "400 9px -apple-system, system-ui, sans-serif";
  ctx.fillText(`${sd.entries} entries · ${sd.withAor} with AOR`, left + 12 + lw + 8, y + 12);

  // AOR date range
  if (sd.earliestAorSub && sd.latestAorSub) {
    ctx.fillStyle = color;
    ctx.font = "600 9px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`AOR: ${fmt(sd.earliestAorSub)} → ${fmt(sd.latestAorSub)} sub`, right, y + 12);
    ctx.textAlign = "left";
  }

  // Row: avg days (left) + with AOR count (right)
  const rowY = y + 44;

  // Avg days
  if (sd.avgDays) {
    ctx.fillStyle = color;
    ctx.font = "bold 26px Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillText(`${sd.avgDays}`, left + 12, rowY);
    const numW = ctx.measureText(`${sd.avgDays}`).width;
    ctx.fillStyle = "#A8A69E";
    ctx.font = "11px -apple-system, system-ui, sans-serif";
    ctx.fillText(" days avg", left + 12 + numW, rowY);
  }

  // AOR count on right
  ctx.fillStyle = color;
  ctx.font = "bold 26px Georgia, serif";
  ctx.textAlign = "right";
  ctx.fillText(`${sd.withAor}`, right, rowY);
  const aW = ctx.measureText(`${sd.withAor}`).width;
  ctx.fillStyle = "#A8A69E";
  ctx.font = "11px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("with AOR  ", right - aW, rowY);

  return y + 58;
}
