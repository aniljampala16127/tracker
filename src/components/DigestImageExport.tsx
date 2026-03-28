"use client";

import { useCallback, useState } from "react";
import { Application } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function DigestImageExport({ apps, period }: { apps: Application[]; period: string }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);
    const dpr = Math.min(window.devicePixelRatio || 2, 3);
    const W = 390;
    const H = 693; // 9:16 ratio

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
    const nonAor = Object.entries(milestones).filter(([k]) => k !== "AOR").sort((a, b) => b[1] - a[1]).slice(0, 5);
    const periodLabel = period === "7" ? "This Week" : period === "14" ? "Last 2 Weeks" : "This Month";
    const totalWithAor = apps.filter(a => a.step_events?.some(e => e.step_id === "aor")).length;
    const totalWaiting = apps.length - totalWithAor;

    const canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // ===== BACKGROUND =====
    // Deep dark gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#0B1A14");
    bgGrad.addColorStop(0.4, "#0F2419");
    bgGrad.addColorStop(1, "#081210");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Ambient glow orbs
    drawGlow(ctx, 60, 120, 140, "rgba(45,106,79,0.15)");
    drawGlow(ctx, W - 50, 350, 120, "rgba(64,145,108,0.1)");
    drawGlow(ctx, 100, 550, 100, "rgba(212,160,60,0.08)");

    // Subtle grid pattern
    ctx.strokeStyle = "rgba(255,255,255,0.02)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // ===== TOP SECTION =====
    const pad = 28;
    let y = 40;

    // Logo + branding
    ctx.fillStyle = "#40916C";
    ctx.font = "600 11px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SPONSORTRACK", pad, y);

    // Period pill (right)
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(64,145,108,0.2)";
    roundRect(ctx, W - pad - 52, y - 12, 52, 20, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(64,145,108,0.4)";
    ctx.lineWidth = 0.5;
    roundRect(ctx, W - pad - 52, y - 12, 52, 20, 10);
    ctx.stroke();
    ctx.fillStyle = "#5CBA8B";
    ctx.font = "600 9px -apple-system, system-ui, sans-serif";
    ctx.fillText(period === "7" ? "7 DAYS" : period === "14" ? "14 DAYS" : "30 DAYS", W - pad - 8, y + 1);
    ctx.textAlign = "left";

    // Divider line
    y += 18;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(W - pad, y);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // ===== HERO: AOR Count =====
    y += 40;
    if (aorCount > 0) {
      // Big glowing number
      ctx.fillStyle = "#5CBA8B";
      ctx.font = "bold 72px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "center";
      // Glow behind number
      ctx.shadowColor = "rgba(92,186,139,0.4)";
      ctx.shadowBlur = 30;
      ctx.fillText(`${aorCount}`, W / 2, y + 10);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "300 14px -apple-system, system-ui, sans-serif";
      ctx.fillText(`AOR${aorCount > 1 ? "s" : ""} received ${periodLabel.toLowerCase()}`, W / 2, y + 34);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "300 14px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`No AORs ${periodLabel.toLowerCase()}`, W / 2, y + 10);
    }

    // ===== COMMUNITY STAT BAR =====
    y += 60;
    const barW = W - pad * 2;
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    roundRect(ctx, pad, y, barW, 48, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    roundRect(ctx, pad, y, barW, 48, 12);
    ctx.stroke();

    // Three stats in a row
    const statW = barW / 3;
    const stats = [
      { value: `${apps.length}`, label: "TRACKED" },
      { value: `${totalWithAor}`, label: "GOT AOR" },
      { value: `${totalWaiting}`, label: "WAITING" },
    ];
    stats.forEach((s, i) => {
      const cx = pad + statW * i + statW / 2;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 18px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(s.value, cx, y + 24);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "600 8px -apple-system, system-ui, sans-serif";
      ctx.fillText(s.label, cx, y + 38);

      // Divider between stats
      if (i < 2) {
        ctx.beginPath();
        ctx.moveTo(pad + statW * (i + 1), y + 10);
        ctx.lineTo(pad + statW * (i + 1), y + 38);
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // ===== STREAM CARDS =====
    y += 72;
    drawStreamCardDark(ctx, pad, y, barW, 100, "Outland",
      "#2D6A4F", "#5CBA8B", avgOutland, outlandAorDays.length, outlandApps.length);
    y += 112;
    drawStreamCardDark(ctx, pad, y, barW, 100, "Inland",
      "#9B7420", "#D4A03C", avgInland, inlandAorDays.length, inlandApps.length);

    // ===== MILESTONES =====
    y += 120;
    if (nonAor.length > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "600 9px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("OTHER MILESTONES", pad, y);
      y += 16;

      nonAor.forEach(([step, count]) => {
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        roundRect(ctx, pad, y, barW, 30, 8);
        ctx.fill();

        ctx.fillStyle = "#5CBA8B";
        ctx.font = "bold 13px -apple-system, system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${count}`, pad + 12, y + 20);

        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "13px -apple-system, system-ui, sans-serif";
        ctx.fillText(step, pad + 36, y + 20);

        y += 36;
      });
    }

    // ===== FOOTER =====
    const fY = H - 40;
    ctx.beginPath();
    ctx.moveTo(pad + 60, fY - 10);
    ctx.lineTo(W - pad - 60, fY - 10);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "9px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("tracker-lime-five.vercel.app", W / 2, fY + 4);
    const today = new Date();
    ctx.fillText(`${MONTHS[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`, W / 2, fY + 18);

    // ===== EXPORT =====
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

function drawStreamCardDark(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  label: string, color: string, lightColor: string, avgDays: number | null, aorCount: number, total: number) {

  // Glass card background
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 0.5;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();

  // Accent line on left
  ctx.fillStyle = lightColor;
  roundRect(ctx, x, y + 8, 3, h - 16, 2);
  ctx.fill();

  // Stream badge
  ctx.fillStyle = color + "30";
  roundRect(ctx, x + 16, y + 14, 64, 22, 6);
  ctx.fill();
  ctx.strokeStyle = color + "50";
  ctx.lineWidth = 0.5;
  roundRect(ctx, x + 16, y + 14, 64, 22, 6);
  ctx.stroke();
  ctx.fillStyle = lightColor;
  ctx.font = "bold 10px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + 48, y + 29);

  // Entry count next to badge
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "10px -apple-system, system-ui, sans-serif";
  ctx.fillText(`${total} entries`, x + 88, y + 28);

  // Big avg number
  if (avgDays) {
    ctx.fillStyle = lightColor;
    ctx.font = "bold 36px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    // Subtle glow
    ctx.shadowColor = lightColor + "40";
    ctx.shadowBlur = 15;
    ctx.fillText(`${avgDays}`, x + 16, y + 76);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "11px -apple-system, system-ui, sans-serif";
    const numW = ctx.measureText(`${avgDays}`).width;
    ctx.font = "bold 36px -apple-system, system-ui, sans-serif";
    const bigW = ctx.measureText(`${avgDays}`).width;
    ctx.font = "11px -apple-system, system-ui, sans-serif";
    ctx.fillText("days avg", x + 16 + bigW + 6, y + 76);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "13px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("No AOR data yet", x + 16, y + 70);
  }

  // AOR count on right
  ctx.textAlign = "right";
  ctx.fillStyle = lightColor;
  ctx.font = "bold 36px -apple-system, system-ui, sans-serif";
  ctx.shadowColor = lightColor + "30";
  ctx.shadowBlur = 10;
  ctx.fillText(`${aorCount}`, x + w - 16, y + 76);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "11px -apple-system, system-ui, sans-serif";
  ctx.fillText("with AOR", x + w - 16, y + 92);
  ctx.textAlign = "left";
}

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
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
