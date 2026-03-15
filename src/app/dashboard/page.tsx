"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Application, ApplicationFormData } from "@/lib/types";
import { STEPS, COMMON_COUNTRIES, STREAMS, SPONSOR_STATUSES, PROVINCES } from "@/lib/constants";
import { progressPercent } from "@/lib/utils";
import { AppCard } from "@/components/AppCard";
import { StepIcon, PlusIcon, ClockIcon } from "@/components/icons";
import { Button, StatCard, Modal, Input, Select, Card } from "@/components/ui";

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fetchApps = useCallback(async () => {
    const { data } = await supabase
      .from("applications")
      .select("*, step_events(*)")
      .order("created_at", { ascending: false });

    if (data) setApps(data as Application[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleAdd = async (form: ApplicationFormData) => {
    setSubmitting(true);

    const { data: app } = await supabase
      .from("applications")
      .insert({
        initials: form.initials.toUpperCase(),
        sponsor_status: form.sponsor_status,
        stream: form.stream,
        country_origin: form.country_origin,
        province: form.province,
        current_step: "submitted",
        notes: form.notes || null,
      })
      .select()
      .single();

    if (app) {
      await supabase.from("step_events").insert({
        application_id: app.id,
        step_id: "submitted",
        event_date: form.submitted_date,
      });
    }

    setSubmitting(false);
    setShowAdd(false);
    fetchApps();
  };

  const totalActive = apps.filter((a) => !a.is_complete).length;
  const totalComplete = apps.filter((a) => a.is_complete).length;
  const outland = apps.filter((a) => a.stream === "Outland").length;
  const inland = apps.filter((a) => a.stream === "Inland").length;

  if (loading) {
    return (
      <div className="py-20 text-center text-sand-400 text-sm">
        Loading applications...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Spousal Sponsorship Tracker</h1>
          <p className="text-xs text-sand-500 mt-0.5">
            Add your application and track every step — open to everyone
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <PlusIcon size={16} className="text-white" /> Add Entry
        </Button>
      </div>

      {apps.length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <StatCard label="Active" value={totalActive} />
          <StatCard label="Complete" value={totalComplete} highlight />
          <StatCard label="Outland" value={outland} />
          <StatCard label="Inland" value={inland} />
        </div>
      )}

      {apps.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon size={16} className="text-brand-500" />
            <span className="text-sm font-semibold text-sand-900">
              IRCC Average Processing Times
            </span>
          </div>
          <div className="space-y-0.5">
            {STEPS.map((step, i) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-md ${
                  i % 2 === 0 ? "bg-sand-50" : "bg-white"
                }`}
              >
                <StepIcon stepId={step.id} size={18} className="text-brand-500" />
                <div className="flex-1">
                  <span className="text-sm font-medium">{step.label}</span>
                  <span className="text-[11px] text-sand-400 ml-2">{step.description}</span>
                </div>
                <span className="text-xs font-semibold text-brand-600">
                  {step.avgWeeksOutland[0]}–{step.avgWeeksOutland[1]} wks
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-sand-400 mt-3 px-3">
            Outland total: ~5–12 months · Inland total: ~12–28 months · IRCC service standard: 12 months
          </p>
        </Card>
      )}

      {apps.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onClick={() => router.push(`/dashboard/${app.id}`)}
            />
          ))}
        </div>
      )}

      <AddApplicationModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={handleAdd}
        loading={submitting}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 bg-white border border-sand-200 rounded-xl">
      <div className="text-brand-300 mb-4">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
          <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-sand-900 mb-1">No applications yet</h2>
      <p className="text-sm text-sand-500 mb-6 max-w-xs mx-auto">
        Be the first to add your spousal sponsorship application and start building community data.
      </p>
      <Button onClick={onAdd}>
        <PlusIcon size={16} className="text-white" /> Add First Entry
      </Button>
    </div>
  );
}

function AddApplicationModal({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: ApplicationFormData) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<ApplicationFormData>({
    initials: "",
    sponsor_status: "PR",
    stream: "Outland",
    country_origin: "",
    province: "Ontario",
    submitted_date: "",
    notes: "",
  });

  const update = (field: keyof ApplicationFormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.initials || !form.submitted_date || !form.country_origin) return;
    onSubmit(form);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Application">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Initials *"
          placeholder="e.g. AB"
          maxLength={4}
          value={form.initials}
          onChange={(e) => update("initials", e.target.value.toUpperCase())}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Sponsor Status"
            value={form.sponsor_status}
            onChange={(e) => update("sponsor_status", e.target.value)}
            options={SPONSOR_STATUSES.map((s) => ({ value: s, label: s }))}
          />
          <Select
            label="Stream"
            value={form.stream}
            onChange={(e) => update("stream", e.target.value)}
            options={STREAMS.map((s) => ({ value: s, label: s }))}
          />
        </div>

        <Select
          label="Country of Origin *"
          value={form.country_origin}
          onChange={(e) => update("country_origin", e.target.value)}
          options={[
            { value: "", label: "Select country..." },
            ...COMMON_COUNTRIES.map((c) => ({ value: c, label: c })),
          ]}
        />

        <Select
          label="Province"
          value={form.province}
          onChange={(e) => update("province", e.target.value)}
          options={PROVINCES.map((p) => ({ value: p, label: p }))}
        />

        <Input
          type="date"
          label="Submission Date *"
          value={form.submitted_date}
          onChange={(e) => update("submitted_date", e.target.value)}
          required
        />

        <Input
          label="Notes (optional)"
          placeholder="e.g. Singapore EP holder"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />

        <Button type="submit" disabled={loading} className="w-full mt-2">
          {loading ? "Adding..." : "Add Application"}
        </Button>
      </form>
    </Modal>
  );
}
