"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { CommunityAverage } from "@/lib/types";
import { STEPS, STREAMS } from "@/lib/constants";
import { BarChartIcon, ClockIcon } from "@/components/icons";
import { Card, Select, Badge } from "@/components/ui";

export default function StatsPage() {
  const [averages, setAverages] = useState<CommunityAverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStream, setFilterStream] = useState("all");
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from("community_averages").select("*");
      if (data) setAverages(data as CommunityAverage[]);
      setLoading(false);
    }
    fetch();
  }, [supabase]);

  // Aggregate by step
  const stepStats = useMemo(() => {
    return STEPS.filter((s) => s.id !== "submitted").map((step) => {
      const matching = averages.filter((a) => {
        if (a.step_id !== step.id) return false;
        if (filterStream !== "all" && a.stream !== filterStream) return false;
        return true;
      });

      const totalSamples = matching.reduce((s, a) => s + a.sample_size, 0);
      const avgDays =
        totalSamples > 0
          ? Math.round(
              matching.reduce((s, a) => s + a.avg_days * a.sample_size, 0) /
                totalSamples
            )
          : null;
      const medianDays =
        totalSamples > 0
          ? Math.round(
              matching.reduce(
                (s, a) => s + a.median_days * a.sample_size,
                0
              ) / totalSamples
            )
          : null;
      const minDays =
        matching.length > 0 ? Math.min(...matching.map((a) => a.min_days)) : null;
      const maxDays =
        matching.length > 0 ? Math.max(...matching.map((a) => a.max_days)) : null;

      return {
        step,
        totalSamples,
        avgDays,
        medianDays,
        minDays,
        maxDays,
      };
    });
  }, [averages, filterStream]);

  // Country breakdown
  const countryStats = useMemo(() => {
    const countries = new Set(averages.map((a) => a.country_origin));
    return Array.from(countries)
      .map((country) => {
        const matching = averages.filter(
          (a) =>
            a.country_origin === country &&
            (filterStream === "all" || a.stream === filterStream)
        );
        const totalSamples = matching.reduce((s, a) => s + a.sample_size, 0);
        const totalDays =
          totalSamples > 0
            ? Math.round(
                matching.reduce(
                  (s, a) => s + a.avg_days * a.sample_size,
                  0
                ) / totalSamples
              )
            : 0;
        return { country, totalSamples, avgDays: totalDays };
      })
      .filter((c) => c.totalSamples > 0)
      .sort((a, b) => b.totalSamples - a.totalSamples);
  }, [averages, filterStream]);

  // Max bar width
  const maxAvg = Math.max(...stepStats.map((s) => s.avgDays || 0), 1);

  if (loading) {
    return (
      <div className="py-20 text-center text-sand-400 text-sm">
        Loading analytics...
      </div>
    );
  }

  const hasData = averages.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChartIcon size={20} className="text-brand-500" />
            <h1 className="text-xl font-bold text-sand-900">
              Processing Analytics
            </h1>
          </div>
          <p className="text-xs text-sand-500">
            Real processing times from community-reported data
          </p>
        </div>
        <Select
          value={filterStream}
          onChange={(e) => setFilterStream(e.target.value)}
          options={[
            { value: "all", label: "All Streams" },
            ...STREAMS.map((s) => ({ value: s, label: s })),
          ]}
        />
      </div>

      {!hasData ? (
        <Card className="text-center py-12">
          <p className="text-sand-500 text-sm mb-2">
            No community data available yet
          </p>
          <p className="text-xs text-sand-400">
            As more people track their applications, processing averages will
            appear here.
          </p>
        </Card>
      ) : (
        <>
          {/* Processing time bars */}
          <Card className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ClockIcon size={16} className="text-brand-500" />
              <h2 className="text-sm font-bold text-sand-900">
                Average Days Per Step
              </h2>
            </div>
            <div className="space-y-3">
              {stepStats.map(
                ({ step, avgDays, medianDays, minDays, maxDays, totalSamples }) => (
                  <div key={step.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-sand-800">
                          {step.label}
                        </span>
                        {totalSamples > 0 && (
                          <Badge variant="default">{totalSamples} reports</Badge>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-brand-600">
                        {avgDays != null ? `${avgDays} days` : "—"}
                      </span>
                    </div>
                    <div className="h-6 bg-sand-100 rounded-md overflow-hidden relative">
                      {avgDays != null && (
                        <>
                          {/* Range bar (min to max) */}
                          {minDays != null && maxDays != null && (
                            <div
                              className="absolute top-1 bottom-1 bg-brand-200 rounded"
                              style={{
                                left: `${(minDays / maxAvg) * 100}%`,
                                width: `${((maxDays - minDays) / maxAvg) * 100}%`,
                              }}
                            />
                          )}
                          {/* Average bar */}
                          <div
                            className="h-full bg-brand-500 rounded-md transition-all duration-500"
                            style={{
                              width: `${Math.max(
                                (avgDays / maxAvg) * 100,
                                4
                              )}%`,
                            }}
                          />
                        </>
                      )}
                    </div>
                    {avgDays != null && (
                      <div className="flex gap-4 mt-1 text-[10px] text-sand-400">
                        <span>Min: {minDays}d</span>
                        <span>Median: {medianDays}d</span>
                        <span>Max: {maxDays}d</span>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </Card>

          {/* Country breakdown */}
          {countryStats.length > 0 && (
            <Card>
              <h2 className="text-sm font-bold text-sand-900 mb-4">
                By Country of Origin
              </h2>
              <div className="space-y-2">
                {countryStats.slice(0, 15).map(({ country, totalSamples, avgDays }) => (
                  <div
                    key={country}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="font-medium text-sand-800 w-28 truncate">
                      {country}
                    </span>
                    <div className="flex-1 h-4 bg-sand-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-brand-400 rounded"
                        style={{
                          width: `${Math.max(
                            (avgDays /
                              Math.max(
                                ...countryStats.map((c) => c.avgDays),
                                1
                              )) *
                              100,
                            4
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-sand-500 w-20 text-right">
                      ~{Math.round(avgDays / 7)} wks
                      <span className="text-sand-300 ml-1">
                        ({totalSamples})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* IRCC reference */}
      <div className="mt-6 text-center text-[11px] text-sand-400">
        <p>
          IRCC service standard: 12 months for spousal sponsorship. Outland
          typically 5–12 months, Inland 12–28 months.
        </p>
        <p className="mt-1">
          Community data is self-reported and may not represent all applications.
        </p>
      </div>
    </div>
  );
}
