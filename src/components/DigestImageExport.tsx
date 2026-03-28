"use client";

import { useCallback, useState } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BRAND = "#2D6A4F";
const BRAND_LIGHT = "#D1E8DA";
const SAND_900 = "#1C1B19";
const SAND_500 = "#A8A69E";
const SAND_300 = "#D9D7D2";
const SAND_100 = "#F0EEEA";
const BG = "#FAFAF8";
const WHITE = "#FFFFFF";
const WARN = "#D4A03C";
const WARN_LIGHT = "#FDF6E3";

function fmt(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function DigestImageExport({ apps, period }: { apps: Application[]; period: string }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);
    const dpr = Math.min(window.devicePixelRatio || 2, 3);
    const W = 400;
    const padding = 20;

    const cutoff = Date.now() - parseInt(period) * 24 * 60 * 60 * 1000;

    // Compute stats
    const outlandApps = apps.filter(a => a.stream === "Outland");
    const inlandApps = apps.filter(a => a.stream === "Inland");

    const outlandAorDays: number[] = [];
    outlandApps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      if (s.submitted && s.aor) outlandAorDays.push(daysBetween(s.submitted, s.aor));
    });
    const avgOutland = outlandAorDays.length ? Math.round(outlandAorDays.reduce((a, b) => a + b, 0) / outlandAorDays.length) : null;

    const inlandAorDays: number[] = [];
    inlandApps.forEach(a => {
      const s = buildStepsMap(a.step_events || []);
      if (s.submitted && s.aor) inlandAorDays.push(daysBetween(s.submitted, s.aor));
    });
    const avgInland = inlandAorDays.length ? Math.round(inlandAorDays.reduce((a, b) => a + b, 0) / inlandAorDays.length) : null;

    // Recent milestones
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

    const periodLabel = period === "7" ? "This Week" : period === "14" ? "Last 2 Weeks" : "This Month";

    // Dynamic height
    const headerH = 80;
    const streamCardH = 70;
    const milestonesH = nonAor.length > 0 ? 30 + nonAor.length * 22 : 0;
    const footerH = 50;
    const H = padding + headerH + 12 + streamCardH * 2 + 16 + milestonesH + footerH + padding;

    const canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // BG
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // Top accent
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, BRAND);
    grad.addColorStop(1, "#40916C");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 4);

    // Header
    let y = padding + 4;
    ctx.fillStyle = SAND_900;
    ctx.font = "bold 18px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SponsorTrack", padding, y + 20);
    ctx.fillStyle = SAND_500;
    ctx.font = "11px -apple-system, system-ui, sans-serif";
    ctx.fillText(`${periodLabel} · ${apps.length} entries tracked`, padding, y + 38);

    // Period badge
    ctx.textAlign = "right";
    ctx.fillStyle = BRAND_LIGHT;
    roundRect(ctx, W - padding - 50, y + 6, 50, 24, 8);
    ctx.fill();
    ctx.fillStyle = BRAND;
    ctx.font = "bold 11px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(period === "7" ? "7 days" : period === "14" ? "14 days" : "30 days", W - padding - 25, y + 22);
    ctx.textAlign = "left";

    // AOR banner
    if (aorCount > 0) {
      y += 50;
      ctx.fillStyle = BRAND;
      roundRect(ctx, padding, y, W - padding * 2, 28, 8);
      ctx.fill();
      ctx.fillStyle = WHITE;
      ctx.font = "bold 12px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${aorCount} AOR${aorCount > 1 ? "s" : ""} received ${periodLabel.toLowerCase()}`, W / 2, y + 18);
      ctx.textAlign = "left";
      y += 40;
    } else {
      y += 52;
    }

    // Outland card
    drawStreamCard(ctx, padding, y, W - padding * 2, streamCardH, "Outland", BRAND, BRAND_LIGHT,
      avgOutland, outlandAorDays.length, outlandApps.length);
    y += streamCardH + 8;

    // Inland card
    drawStreamCard(ctx, padding, y, W - padding * 2, streamCardH, "Inland", WARN, WARN_LIGHT,
      avgInland, inlandAorDays.length, inlandApps.length);
    y += streamCardH + 16;

    // Other milestones
    if (nonAor.length > 0) {
      ctx.fillStyle = SAND_500;
      ctx.font = "bold 10px -apple-system, system-ui, sans-serif";
      ctx.fillText("OTHER MILESTONES", padding, y + 10);
      y += 20;
      nonAor.forEach(([step, count]) => {
        ctx.fillStyle = SAND_900;
        ctx.font = "13px -apple-system, system-ui, sans-serif";
        ctx.fillText(`${count}× ${step}`, padding + 8, y + 14);
        y += 22;
      });
      y += 8;
    }

    // Footer
    ctx.beginPath();
    ctx.moveTo(padding + 60, y);
    ctx.lineTo(W - padding - 60, y);
    ctx.strokeStyle = SAND_300;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.fillStyle = SAND_500;
    ctx.font = "9px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SponsorTrack · tracker-lime-five.vercel.app", W / 2, y + 18);
    const today = new Date();
    ctx.fillText(`${MONTHS[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`, W / 2, y + 32);

    // Export
    canvas.toBlob((blob) => {
      if (!blob) { setExporting(false); return; }
      const file = new File([blob], "sponsortrack-digest.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: "SponsorTrack Weekly Digest" }).catch(() => {}).finally(() => setExporting(false));
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

function drawStreamCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  label: string, color: string, lightColor: string, avgDays: number | null, aorCount: number, total: number) {
  // Card bg
  ctx.fillStyle = WHITE;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = "#E8E6E1";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();

  // Left color bar
  ctx.fillStyle = color;
  roundRect(ctx, x, y, 4, h, 2);
  ctx.fill();

  // Stream badge
  ctx.fillStyle = lightColor;
  roundRect(ctx, x + 14, y + 12, 60, 20, 6);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = "bold 10px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + 44, y + 26);
  ctx.textAlign = "left";

  // Entry count
  ctx.fillStyle = SAND_500;
  ctx.font = "10px -apple-system, system-ui, sans-serif";
  ctx.fillText(`${total} entries`, x + 82, y + 25);

  // Avg days (big number)
  if (avgDays) {
    ctx.fillStyle = color;
    ctx.font = "bold 22px -apple-system, system-ui, sans-serif";
    ctx.fillText(`${avgDays}d`, x + 14, y + 56);
    ctx.fillStyle = SAND_500;
    ctx.font = "10px -apple-system, system-ui, sans-serif";
    ctx.fillText("avg to AOR", x + 14 + ctx.measureText(`${avgDays}d`).width + 6, y + 56);
  }

  // AOR count (right side)
  ctx.textAlign = "right";
  ctx.fillStyle = color;
  ctx.font = "bold 22px -apple-system, system-ui, sans-serif";
  ctx.fillText(`${aorCount}`, x + w - 14, y + 56);
  ctx.fillStyle = SAND_500;
  ctx.font = "10px -apple-system, system-ui, sans-serif";
  ctx.fillText("with AOR", x + w - 14 - ctx.measureText(`${aorCount}`).width - 6, y + 56);
  ctx.textAlign = "left";
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
