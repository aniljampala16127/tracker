"use client";

import { useCallback, useState } from "react";
import { Application } from "@/lib/types";
import { STEPS, getStepIndex } from "@/lib/constants";
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

function fmt(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function fmtFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function TimelineExport({ app }: { app: Application }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);
    const stepsMap = buildStepsMap(app.step_events || []);
    const currentIdx = getStepIndex(app.current_step);
    const today = new Date().toISOString().split("T")[0];
    const daysSoFar = stepsMap.submitted ? daysBetween(stepsMap.submitted, today) : 0;

    const dpr = Math.min(window.devicePixelRatio || 2, 3);
    const W = 400;
    const padding = 20;
    const cardPad = 16;
    const headerCardH = 80;
    const stepRowH = 38;
    const timelineTop = headerCardH + padding * 2 + 16;
    const timelineH = STEPS.length * stepRowH + 20;
    const footerH = 40;
    const H = timelineTop + timelineH + footerH + padding;

    const canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, BRAND);
    grad.addColorStop(1, "#40916C");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 4);

    // Header card with shadow
    const cardX = padding;
    const cardY = padding + 4;
    const cardW = W - padding * 2;
    ctx.shadowColor = "rgba(0,0,0,0.06)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = WHITE;
    roundRect(ctx, cardX, cardY, cardW, headerCardH, 14);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "#E8E6E1";
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, cardY, cardW, headerCardH, 14);
    ctx.stroke();

    // Avatar
    const avX = cardX + cardPad;
    const avY = cardY + cardPad;
    const avR = 22;
    ctx.fillStyle = BRAND;
    ctx.beginPath();
    ctx.arc(avX + avR, avY + avR, avR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = "bold 15px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(app.initials.slice(0, 2).toUpperCase(), avX + avR, avY + avR + 1);
    ctx.textBaseline = "alphabetic";

    // Name + meta
    const infoX = avX + avR * 2 + 14;
    ctx.textAlign = "left";
    ctx.fillStyle = SAND_900;
    ctx.font = "bold 17px -apple-system, system-ui, sans-serif";
    ctx.fillText(app.initials, infoX, avY + 18);
    ctx.fillStyle = SAND_500;
    ctx.font = "11px -apple-system, system-ui, sans-serif";
    ctx.fillText(`${app.country_origin} · ${app.sponsor_status} · ${app.stream}`, infoX, avY + 34);

    // Day badge
    const badgeW = 56;
    const badgeH = 28;
    const badgeX = cardX + cardW - cardPad - badgeW;
    const badgeY = avY + 4;
    ctx.fillStyle = BRAND_LIGHT;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
    ctx.fill();
    ctx.fillStyle = BRAND;
    ctx.font = "bold 13px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Day ${daysSoFar}`, badgeX + badgeW / 2, badgeY + 18);
    ctx.fillStyle = SAND_500;
    ctx.font = "9px -apple-system, system-ui, sans-serif";
    if (stepsMap.submitted) ctx.fillText(fmtFull(stepsMap.submitted), badgeX + badgeW / 2, badgeY + badgeH + 13);
    ctx.textAlign = "left";

    // Progress bar in header
    const progY = cardY + headerCardH - 12;
    const progW = cardW - cardPad * 2;
    const progPct = Math.min(((currentIdx + 1) / STEPS.length) * 100, 100);
    ctx.fillStyle = SAND_100;
    roundRect(ctx, cardX + cardPad, progY, progW, 4, 2);
    ctx.fill();
    const progGrad = ctx.createLinearGradient(cardX + cardPad, 0, cardX + cardPad + progW * progPct / 100, 0);
    progGrad.addColorStop(0, BRAND);
    progGrad.addColorStop(1, "#40916C");
    ctx.fillStyle = progGrad;
    roundRect(ctx, cardX + cardPad, progY, progW * progPct / 100, 4, 2);
    ctx.fill();

    // Timeline
    const dotX = padding + 18;

    STEPS.forEach((step, i) => {
      const y = timelineTop + i * stepRowH + 14;
      const date = stepsMap[step.id];
      const prevDate = i > 0 ? stepsMap[STEPS[i - 1].id] : null;
      const days = date && prevDate ? daysBetween(prevDate, date) : null;
      const isDone = !!date && i <= currentIdx;
      const isNext = i === currentIdx + 1;

      // Connecting line
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(dotX, y - stepRowH + 6);
        ctx.lineTo(dotX, y - 6);
        ctx.strokeStyle = isDone ? BRAND : SAND_300;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Dot with ring style for done
      if (isDone) {
        ctx.beginPath();
        ctx.arc(dotX, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = BRAND;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dotX, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = WHITE;
        ctx.fill();
      } else if (isNext) {
        ctx.beginPath();
        ctx.arc(dotX, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = WARN;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(dotX, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = SAND_300;
        ctx.fill();
      }

      // Label
      ctx.fillStyle = isDone ? SAND_900 : isNext ? WARN : SAND_300;
      ctx.font = `${isDone ? "600" : "normal"} 13px -apple-system, system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(step.label, dotX + 16, y + 4);

      // Right side
      if (isDone) {
        const rightEdge = W - padding - 12;
        ctx.textAlign = "right";

        // Checkmark
        ctx.strokeStyle = BRAND;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(rightEdge - 6, y - 1);
        ctx.lineTo(rightEdge - 3, y + 2);
        ctx.lineTo(rightEdge + 3, y - 4);
        ctx.stroke();

        // Date text
        ctx.fillStyle = SAND_500;
        ctx.font = "11px -apple-system, system-ui, sans-serif";
        ctx.fillText(fmt(date!), rightEdge - 14, y + 4);

        // Days badge
        if (days != null && i > 0) {
          const badgeText = `${days}d`;
          ctx.font = "bold 9px -apple-system, system-ui, sans-serif";
          const tw = ctx.measureText(badgeText).width;
          const dateTextW = ctx.measureText(fmt(date!)).width;
          ctx.font = "11px -apple-system, system-ui, sans-serif";
          const bx = rightEdge - 14 - dateTextW - tw - 14;
          ctx.fillStyle = BRAND_LIGHT;
          roundRect(ctx, bx, y - 8, tw + 8, 16, 4);
          ctx.fill();
          ctx.fillStyle = BRAND;
          ctx.font = "bold 9px -apple-system, system-ui, sans-serif";
          ctx.fillText(badgeText, bx + tw + 4, y + 3);
        }

        ctx.textAlign = "left";
      }
    });

    // Footer divider + branding
    const fY = H - footerH;
    ctx.beginPath();
    ctx.moveTo(padding + 60, fY);
    ctx.lineTo(W - padding - 60, fY);
    ctx.strokeStyle = SAND_300;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.fillStyle = SAND_500;
    ctx.font = "9px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SponsorTrack · sponsortrack.online", W / 2, fY + 18);

    // Export
    canvas.toBlob((blob) => {
      if (!blob) { setExporting(false); return; }
      const file = new File([blob], `sponsortrack-${app.initials}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: "My SponsorTrack Timeline" }).catch(() => {}).finally(() => setExporting(false));
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sponsortrack-${app.initials}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setExporting(false);
      }
    }, "image/png");
  }, [app]);

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sand-100 text-sand-600 text-[10px] font-medium hover:bg-sand-200 transition-colors active:scale-[0.97] disabled:opacity-50"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15V19C21 20.1 19.9 21 19 21H5C3.9 21 3 20.1 3 19V15"/>
        <path d="M7 10L12 15L17 10"/>
        <path d="M12 15V3"/>
      </svg>
      {exporting ? "..." : "Export"}
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
