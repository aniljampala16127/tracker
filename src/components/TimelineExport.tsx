"use client";

import { useCallback } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function TimelineExport({ app }: { app: Application }) {
  const handleExport = useCallback(() => {
    const stepsMap = buildStepsMap(app.step_events || []);
    const today = new Date().toISOString().split("T")[0];
    const daysSoFar = stepsMap.submitted ? daysBetween(stepsMap.submitted, today) : 0;

    const dpr = window.devicePixelRatio || 2;
    const W = 390;
    const stepH = 44;
    const headerH = 100;
    const footerH = 50;
    const padding = 24;
    const H = headerH + STEPS.length * stepH + footerH + padding * 2;

    const canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#FAFAF8";
    ctx.fillRect(0, 0, W, H);

    // Header card
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, padding, padding, W - padding * 2, headerH - 10, 16);
    ctx.fill();
    ctx.strokeStyle = "#E8E6E1";
    ctx.lineWidth = 1;
    roundRect(ctx, padding, padding, W - padding * 2, headerH - 10, 16);
    ctx.stroke();

    // Avatar circle
    const avatarX = padding + 18;
    const avatarY = padding + 20;
    ctx.fillStyle = "#2D6A4F";
    ctx.beginPath();
    ctx.arc(avatarX + 18, avatarY + 18, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(app.initials.slice(0, 2).toUpperCase(), avatarX + 18, avatarY + 23);

    // Name
    ctx.textAlign = "left";
    ctx.fillStyle = "#1C1B19";
    ctx.font = "bold 16px -apple-system, system-ui, sans-serif";
    ctx.fillText(app.initials, avatarX + 46, avatarY + 14);

    // Meta
    ctx.fillStyle = "#A8A69E";
    ctx.font = "11px -apple-system, system-ui, sans-serif";
    ctx.fillText(`${app.country_origin} · ${app.sponsor_status} · ${app.stream}`, avatarX + 46, avatarY + 30);

    // Day count
    ctx.textAlign = "right";
    ctx.fillStyle = "#2D6A4F";
    ctx.font = "bold 12px -apple-system, system-ui, sans-serif";
    ctx.fillText(`Day ${daysSoFar}`, W - padding - 16, avatarY + 14);
    ctx.fillStyle = "#C4C2BB";
    ctx.font = "9px -apple-system, system-ui, sans-serif";
    if (stepsMap.submitted) ctx.fillText(fmt(stepsMap.submitted), W - padding - 16, avatarY + 28);
    ctx.textAlign = "left";

    // Steps
    const startY = headerH + padding + 8;
    STEPS.forEach((step, i) => {
      const y = startY + i * stepH;
      const date = stepsMap[step.id];
      const prevDate = i > 0 ? stepsMap[STEPS[i - 1].id] : null;
      const days = date && prevDate ? daysBetween(prevDate, date) : null;
      const isDone = !!date;

      // Dot
      const dotX = padding + 16;
      const dotY = y + 12;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
      ctx.fillStyle = isDone ? "#2D6A4F" : "#D9D7D2";
      ctx.fill();

      // Connecting line
      if (i < STEPS.length - 1) {
        ctx.beginPath();
        ctx.moveTo(dotX, dotY + 5);
        ctx.lineTo(dotX, y + stepH + 7);
        ctx.strokeStyle = isDone && stepsMap[STEPS[i + 1]?.id] ? "#2D6A4F" : "#E8E6E1";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = isDone ? "#1C1B19" : "#C4C2BB";
      ctx.font = `${isDone ? "600" : "normal"} 13px -apple-system, system-ui, sans-serif`;
      ctx.fillText(step.label, dotX + 16, dotY + 4);

      // Date + days
      if (isDone) {
        ctx.textAlign = "right";
        ctx.fillStyle = "#65635D";
        ctx.font = "11px -apple-system, system-ui, sans-serif";
        ctx.fillText(fmt(date!).replace(/, \d{4}/, ""), W - padding - 16, dotY);
        if (days != null && i > 0) {
          ctx.fillStyle = "#2D6A4F";
          ctx.font = "bold 10px -apple-system, system-ui, sans-serif";
          ctx.fillText(`${days}d`, W - padding - 16, dotY + 14);
        }
        ctx.textAlign = "left";

        // Checkmark
        ctx.strokeStyle = "#2D6A4F";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W - padding - 54, dotY - 2);
        ctx.lineTo(W - padding - 50, dotY + 2);
        ctx.lineTo(W - padding - 44, dotY - 5);
        ctx.stroke();
      }
    });

    // Footer branding
    const footerY = H - footerH + 5;
    ctx.fillStyle = "#C4C2BB";
    ctx.font = "10px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SponsorTrack · tracker-lime-five.vercel.app", W / 2, footerY + 16);
    ctx.fillText(`Generated ${fmt(today)}`, W / 2, footerY + 30);

    // Export
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `sponsortrack-${app.initials}.png`, { type: "image/png" });

      // Try native share (works on mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: "My SponsorTrack Timeline" }).catch(() => {});
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sponsortrack-${app.initials}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, "image/png");
  }, [app]);

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sand-100 text-sand-700 text-xs font-medium hover:bg-sand-200 transition-colors w-full justify-center active:scale-[0.98]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15L16 10L5 21"/>
      </svg>
      Save Timeline as Image
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
