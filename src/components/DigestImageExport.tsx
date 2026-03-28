"use client";

import { useCallback, useState } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BLACK = "#1C1B19";
const GREY = "#65635D";
const LIGHT = "#A8A69E";
const LINE = "#E0DED9";
const GREEN = "#2D6A4F";
const GOLD = "#9B7420";
const WHITE = "#FFFFFF";

export function DigestImageExport({ apps, period }: { apps: Application[]; period: string }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);
    const dpr = Math.min(window.devicePixelRatio || 2, 3);
    const W = 390;
    const H = 693;
    const pad = 32;
    const inner = W - pad * 2;

    const cutoff = Date.now() - parseInt(period) * 24 * 60 * 60 * 1000;

    const outlandApps = apps.filter(a => a.stream === "Outland");
    const inlandApps = apps.filter(a => a.stream === "Inland");

    const outlandAorDays: number[] = [];
    outlandApps.forEach(a => { const s = buildStepsMap(a.step_events || []); if (s.submitted && s.aor) outlandAorDays.push(daysBetween(s.submitted, s.aor)); });
    const avgOutland = outlandAorDays.length ? Math.round(outlandAorDays.reduce((a, b) => a + b, 0) / outlandAorDays.length) : null;

    const inlandAorDays: number[] = [];
    inlandApps.forEach(a => { const s = buildStepsMap(a.step_events || []); if (s.submitted && s.aor) inlandAorDays.push(daysBetween(s.submitted, s.aor)); });
    const avgInland = inlandAorDays.length ? Math.round(inlandAorDays.reduce((a, b) => a + b, 0) / inlandAorDays.length) : null;

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
    const dateStr = `${MONTHS[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

    const canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // White background
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, W, H);

    // Top green accent bar
    ctx.fillStyle = GREEN;
    ctx.fillRect(0, 0, W, 5);

    let y = 32;

    // Header row: brand + date
    ctx.fillStyle = GREEN;
    ctx.font = "700 10px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SPONSORTRACK WEEKLY", pad, y);
    ctx.fillStyle = LIGHT;
    ctx.font = "400 10px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(dateStr.toUpperCase(), W - pad, y);

    // Thick rule
    y += 10;
    ctx.fillStyle = BLACK;
    ctx.fillRect(pad, y, inner, 2);

    // Hero AOR number
    y += 50;
    ctx.fillStyle = BLACK;
    ctx.font = "bold 64px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.fillText(`${aorCount}`, W / 2, y);

    // Subtitle
    y += 22;
    ctx.fillStyle = GREY;
    ctx.font = "300 13px -apple-system, system-ui, sans-serif";
    ctx.fillText("acknowledgements of receipt", W / 2, y);

    // Double rule
    y += 16;
    ctx.fillStyle = BLACK;
    ctx.fillRect(pad + 60, y, inner - 120, 1.5);
    ctx.fillRect(pad + 60, y + 4, inner - 120, 0.5);

    // Three stats
    y += 28;
    const statW = inner / 3;
    const statsData = [
      { val: `${apps.length}`, label: "TRACKED" },
      { val: `${totalWithAor}`, label: "GOT AOR" },
      { val: `${totalWaiting}`, label: "WAITING" },
    ];
    statsData.forEach((s, i) => {
      const cx = pad + statW * i + statW / 2;
      ctx.fillStyle = BLACK;
      ctx.font = "bold 24px Georgia, 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.fillText(s.val, cx, y);
      ctx.fillStyle = LIGHT;
      ctx.font = "600 7px -apple-system, system-ui, sans-serif";
      ctx.fillText(s.label, cx, y + 14);
      if (i < 2) {
        ctx.fillStyle = LINE;
        ctx.fillRect(pad + statW * (i + 1), y - 16, 1, 28);
      }
    });

    // Thin rule
    y += 28;
    ctx.fillStyle = LINE;
    ctx.fillRect(pad, y, inner, 1);

    // ===== OUTLAND =====
    y += 20;
    drawEditorialStream(ctx, pad, y, inner, "OUTLAND", GREEN, outlandApps.length, avgOutland, outlandAorDays.length);

    // Thin rule
    y += 66;
    ctx.fillStyle = LINE;
    ctx.fillRect(pad, y, inner, 1);

    // ===== INLAND =====
    y += 20;
    drawEditorialStream(ctx, pad, y, inner, "INLAND", GOLD, inlandApps.length, avgInland, inlandAorDays.length);

    // Thin rule
    y += 66;
    ctx.fillStyle = LINE;
    ctx.fillRect(pad, y, inner, 1);

    // ===== MILESTONES =====
    if (nonAor.length > 0) {
      y += 20;
      ctx.fillStyle = BLACK;
      ctx.font = "700 9px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("OTHER MILESTONES", pad, y);

      y += 8;
      nonAor.forEach(([step, count]) => {
        y += 20;
        // Number
        ctx.fillStyle = GREEN;
        ctx.font = "bold 16px Georgia, 'Times New Roman', serif";
        ctx.textAlign = "left";
        ctx.fillText(`${count}`, pad, y);

        // Dot
        const numW = ctx.measureText(`${count}`).width;
        ctx.fillStyle = LINE;
        ctx.beginPath();
        ctx.arc(pad + numW + 8, y - 4, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Step name
        ctx.fillStyle = GREY;
        ctx.font = "13px -apple-system, system-ui, sans-serif";
        ctx.fillText(step, pad + numW + 14, y);
      });
    }

    // ===== FOOTER =====
    ctx.fillStyle = BLACK;
    ctx.fillRect(pad, H - 36, inner, 1);
    ctx.fillStyle = LIGHT;
    ctx.font = "600 7px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TRACKER-LIME-FIVE.VERCEL.APP", W / 2, H - 20);

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

function drawEditorialStream(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  label: string, color: string,
  entries: number, avgDays: number | null, aorCount: number
) {
  // Color accent bar
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 2, 3, 50);

  // Label + entries
  ctx.fillStyle = BLACK;
  ctx.font = "700 10px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 14, y + 8);
  ctx.fillStyle = LIGHT;
  ctx.font = "400 10px -apple-system, system-ui, sans-serif";
  const labelW = ctx.measureText(label).width;
  ctx.font = "700 10px -apple-system, system-ui, sans-serif";
  const labelWBold = ctx.measureText(label).width;
  ctx.font = "400 10px -apple-system, system-ui, sans-serif";
  ctx.fillText(`${entries} entries`, x + 14 + labelWBold + 8, y + 8);

  // Avg days (left)
  if (avgDays) {
    ctx.fillStyle = color;
    ctx.font = "bold 32px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "left";
    ctx.fillText(`${avgDays}`, x + 14, y + 44);
    const numW = ctx.measureText(`${avgDays}`).width;
    ctx.fillStyle = LIGHT;
    ctx.font = "10px -apple-system, system-ui, sans-serif";
    ctx.fillText("days avg", x + 14 + numW + 6, y + 44);
  } else {
    ctx.fillStyle = LIGHT;
    ctx.font = "12px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("No AOR data", x + 14, y + 44);
  }

  // AOR count (right)
  ctx.textAlign = "right";
  ctx.fillStyle = color;
  ctx.font = "bold 32px Georgia, 'Times New Roman', serif";
  ctx.fillText(`${aorCount}`, x + w, y + 44);
  const aorNumW = ctx.measureText(`${aorCount}`).width;
  ctx.fillStyle = LIGHT;
  ctx.font = "10px -apple-system, system-ui, sans-serif";
  ctx.fillText("with AOR", x + w - aorNumW - 6, y + 44);
  ctx.textAlign = "left";
}
