"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Application, CommunityAverage } from "@/lib/types";
import { STEPS, STREAMS, COMMON_COUNTRIES } from "@/lib/constants";
import {
  progressPercent,
  formatDate,
  getMonthKey,
  getMonthLabel,
  buildStepsMap,
} from "@/lib/utils";
import { AppCard } from "@/components/AppCard";
import { StepIcon, UsersIcon, CalendarIcon, ClockIcon } from "@/components/icons";
import { Badge, Card, ProgressBar, Select, StatCard } from "@/components/ui";

export default function CommunityPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [averages, setAverages] = useState<CommunityAverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStream, setFilterStream] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "monthly">("monthly");
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      // Fetch public applications
      const { data: appData } = await supabase
        .from("applications")
        .select("*, step_events(*)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (appData) setApps(appData as Application[]);

      // Fetch community averages
      const { data: avgData } = await supabase
        .from("community_averages")
        .select("*");

      if (avgData) setAverages(avgData as CommunityAverage[]);
      setLoading(false);
    }
    fetch();
  }, [supabase]);

  // Apply filters
  const filtered = useMemo(() => {
    return apps.filter((a) => {
      if (filterStream !== "all" && a.stream !== filterStream) return false;
      if (filterCountry !== "all" && a.country_origin !== filterCountry) return false;
      return true;
    });
  }, [apps, filterStream, filterCountry]);

  // Group by month
  const monthGroups = useMemo(() => {
    const groups: Record<string, Application[]> = {};
    filtered.forEach((app) => {
      const sub = app.step_events?.find((e) => e.step_id === "submitted");
      if (!sub) return;
      const key = getMonthKey(sub.event_date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(app);
    });
    return groups;
  }, [filtered]);

  const sortedMonths = Object.keys(monthGroups).sort().reverse();

  // Stats
  const totalApps = filtered.length;
  const completed = filtered.filter((a) => a.is_complete).length;
  const uniqueCountries = new Set(filtered.map((a) => a.country_origin)).size;

  // Get relevant averages for current filter
  const filteredAvgs = useMemo(() => {
    if (filterStream === "all" && filterCountry === "all") return averages;
    return averages.filter((a) => {
      if (filterStream !== "all" && a.stream !== filterStream) return false;
      if (filterCountry !== "all" && a.country_origin !== filterCountry) return false;
      return true;
    });
  }, [averages, filterStream, filterCountry]);

  if (loading) {
    return (
      <div className="py-20 text-center text-sand-400 text-sm">
        Loading community data...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <UsersIcon size={20} className="text-brand-500" />
          <h1 className="text-xl font-bold text-sand-900">Community Tracker</h1>
        </div>
        <p className="text-xs text-sand-500">
          Anonymized data from real applicants. Updated as people mark milestones.
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <StatCard label="Applications" value={totalApps} />
        <StatCard label="Completed" value={completed} highlight />
        <StatCard label="Countries" value={uniqueCountries} />
      </div>

      {/* Community processing averages */}
      {filteredAvgs.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon size={16} className="text-brand-500" />
            <span className="text-sm font-semibold">Community Processing Averages</span>
          </div>
          <div className="space-y-0.5">
            {STEPS.filter((s) => s.id !== "submitted").map((step, i) => {
              // Aggregate across matching averages
              const matching = filteredAvgs.filter((a) => a.step_id === step.id);
              const totalSamples = matching.reduce((s, a) => s + a.sample_size, 0);
              const avgDays =
                totalSamples > 0
                  ? Math.round(
                      matching.reduce((s, a) => s + a.avg_days * a.sample_size, 0) / totalSamples
                    )
                  : null;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                    i % 2 === 0 ? "bg-sand-50" : "bg-white"
                  }`}
                >
                  <StepIcon stepId={step.id} size={18} className="text-brand-500" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{step.label}</span>
                  </div>
                  <div className="text-right">
                    {avgDays != null ? (
                      <>
                        <span className="text-xs font-semibold text-brand-600">
                          ~{Math.round(avgDays / 7)} wks
                        </span>
                        <span className="text-[10px] text-sand-400 ml-1">
                          ({totalSamples} reports)
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-sand-400">
                        ~{step.avgWeeksOutland[0]}–{step.avgWeeksOutland[1]} wks (IRCC est.)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filters + View toggle */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Select
          value={filterStream}
          onChange={(e) => setFilterStream(e.target.value)}
          options={[
            { value: "all", label: "All Streams" },
            ...STREAMS.map((s) => ({ value: s, label: s })),
          ]}
          className="text-xs"
        />
        <Select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          options={[
            { value: "all", label: "All Countries" },
            ...COMMON_COUNTRIES.map((c) => ({ value: c, label: c })),
          ]}
          className="text-xs"
        />
        <div className="ml-auto flex gap-1 bg-sand-50 rounded-lg p-0.5 border border-sand-200">
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === "monthly"
                ? "bg-brand-500 text-white"
                : "text-sand-500"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === "list"
                ? "bg-brand-500 text-white"
                : "text-sand-500"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "monthly" ? (
        <div className="space-y-4">
          {sortedMonths.map((monthKey) => {
            const cohort = monthGroups[monthKey];
            const avgProgress = Math.round(
              cohort.reduce((s, a) => s + progressPercent(a.current_step), 0) /
                cohort.length
            );
            const done = cohort.filter((a) => a.is_complete).length;

            return (
              <Card key={monthKey}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-brand-500" />
                    <span className="font-semibold text-sm">
                      {getMonthLabel(monthKey)}
                    </span>
                    <Badge variant="success">{cohort.length} apps</Badge>
                  </div>
                  <span className="text-xs text-sand-400">
                    Avg {avgProgress}% · {done} done
                  </span>
                </div>
                <ProgressBar percent={avgProgress} size="md" className="mb-3" />
                <div className="divide-y divide-sand-100">
                  {cohort.map((app) => {
                    const stepsMap = buildStepsMap(app.step_events || []);
                    const pct = progressPercent(app.current_step);
                    const currentStepData = STEPS.find(
                      (s) => s.id === app.current_step
                    );
                    return (
                      <div
                        key={app.id}
                        className="flex items-center gap-3 py-2"
                      >
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-600 flex-shrink-0">
                          {app.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-sand-800">
                            {app.initials} — {app.country_origin} · {app.stream}
                          </span>
                        </div>
                        <Badge
                          variant={pct === 100 ? "success" : "warning"}
                        >
                          {currentStepData?.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-sand-400 text-sm">
          No applications match your filters.
        </div>
      )}
    </div>
  );
}
