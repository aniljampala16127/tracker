"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import { Application, StepId } from "@/lib/types";
import { STEPS } from "@/lib/constants";
import { buildStepsMap, daysBetween } from "@/lib/utils";

interface StepChartProps {
  apps: Application[];
}

interface ChartRow {
  step: string;
  outland: number | null;
  inland: number | null;
  outlandCount: number;
  inlandCount: number;
}

export function StepChart({ apps }: StepChartProps) {
  const data = useMemo(() => {
    const rows: ChartRow[] = [];

    STEPS.slice(1).forEach((step, i) => {
      const prev = STEPS[i];
      const outlandDurations: number[] = [];
      const inlandDurations: number[] = [];

      apps.forEach((a) => {
        const s = buildStepsMap(a.step_events || []);
        if (s[prev.id] && s[step.id]) {
          const d = daysBetween(s[prev.id]!, s[step.id]!);
          if (d < 0 || d > 100) return; // Skip bad data (negative or >100 days per step)
          if (a.stream === "Outland") outlandDurations.push(d);
          else inlandDurations.push(d);
        }
      });

      rows.push({
        step: step.shortLabel,
        outland: outlandDurations.length
          ? Math.round(outlandDurations.reduce((a, b) => a + b, 0) / outlandDurations.length)
          : null,
        inland: inlandDurations.length
          ? Math.round(inlandDurations.reduce((a, b) => a + b, 0) / inlandDurations.length)
          : null,
        outlandCount: outlandDurations.length,
        inlandCount: inlandDurations.length,
      });
    });

    return rows;
  }, [apps]);

  const hasAnyData = data.some((d) => d.outland !== null || d.inland !== null);

  if (!hasAnyData) {
    return (
      <div className="bg-white border border-sand-200 rounded-xl p-6 mb-5">
        <h2 className="text-sm font-bold text-sand-900 mb-2">Average Days per Step</h2>
        <p className="text-xs text-sand-400">Not enough data yet — update some steps to see the chart.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-sand-200 rounded-xl p-4 mb-5">
      <h2 className="text-sm font-bold text-sand-900 mb-1">Average Days per Step</h2>
      <p className="text-[11px] text-sand-400 mb-3">Outland vs Inland — based on community-reported data</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 12, left: -4, bottom: 0 }} barCategoryGap="16%">
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
          <XAxis
            dataKey="step" tick={{ fontSize: 9, fill: "#8A8880" }}
            axisLine={{ stroke: "#E8E6E1" }} tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#8A8880" }}
            axisLine={false} tickLine={false}
            label={{ value: "days", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#B0ADA6" } }}
          />
          <Tooltip
            cursor={{ fill: "rgba(45, 106, 79, 0.05)" }}
            contentStyle={{
              borderRadius: "12px", border: "1px solid #E8E6E1",
              fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
            formatter={(value: any, name: string, props: any) => {
              const row = props.payload;
              const count = name === "outland" ? row.outlandCount : row.inlandCount;
              return [value != null ? `${value} days (${count} reports)` : "No data", name === "outland" ? "Outland" : "Inland"];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px" }}
            formatter={(val: string) => val === "outland" ? "Outland" : "Inland"}
          />
          <Bar dataKey="outland" fill="#2D6A4F" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.outland != null ? "#2D6A4F" : "#E8E6E1"} />
            ))}
          </Bar>
          <Bar dataKey="inland" fill="#D4A03C" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.inland != null ? "#D4A03C" : "#E8E6E1"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
