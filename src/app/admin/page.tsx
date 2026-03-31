"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Application } from "@/lib/types";
import { formatDate, buildStepsMap } from "@/lib/utils";
import { Button, Modal, Input } from "@/components/ui";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [search, setSearch] = useState("");
  const [resetting, setResetting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const supabase = createClient();

  const fetchApps = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("applications")
      .select("*, step_events(*)")
      .order("created_at", { ascending: false });
    if (data) setApps(data as Application[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (authed) fetchApps();
  }, [authed, fetchApps]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthed(true);
        setError("");
      } else {
        setError("Wrong password");
      }
    } catch {
      setError("Connection error");
    }
    setLoggingIn(false);
  };

  const handleResetPin = async (appId: string) => {
    setResetting(appId);
    await supabase.from("applications").update({ pin_hash: null }).eq("id", appId);
    await fetchApps();
    setResetting(null);
  };

  const handleDelete = async (appId: string) => {
    if (!confirm("Permanently delete this entry?")) return;
    setDeleting(appId);
    await supabase.from("applications").delete().eq("id", appId);
    await fetchApps();
    setDeleting(null);
  };

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto py-20">
        <div className="bg-white border border-sand-200 rounded-2xl p-6">
          <h1 className="text-lg font-bold text-sand-900 mb-1">Admin Access</h1>
          <p className="text-xs text-sand-500 mb-4">Enter the master password to manage entries and reset PINs.</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <Input
              label="Master Password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              error={error}
              required
            />
            <Button type="submit" className="w-full" disabled={loggingIn}>{loggingIn ? "Checking..." : "Login"}</Button>
          </form>
        </div>
      </div>
    );
  }

  const filtered = search
    ? apps.filter(a =>
        a.initials.toLowerCase().includes(search.toLowerCase()) ||
        a.country_origin.toLowerCase().includes(search.toLowerCase())
      )
    : apps;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-sand-900">Admin Panel</h1>
          <p className="text-xs text-sand-500">{apps.length} entries · Reset PINs, delete entries</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setAuthed(false)}>
          Logout
        </Button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or country..."
          className="w-full px-4 py-2.5 rounded-xl border border-sand-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-sand-400 text-sm">Loading...</div>
      ) : (
        <div className="bg-white border border-sand-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sand-50 text-[9px] font-semibold text-sand-500 uppercase tracking-wider">
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-2 py-2">Country</th>
                  <th className="text-left px-2 py-2">Stream</th>
                  <th className="text-left px-2 py-2">Step</th>
                  <th className="text-center px-2 py-2">PIN</th>
                  <th className="text-left px-2 py-2">Created</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => {
                  const hasPin = !!app.pin_hash;
                  return (
                    <tr key={app.id} className="border-t border-sand-100 hover:bg-sand-50/50">
                      <td className="px-3 py-2.5 font-semibold text-sand-900">{app.initials}</td>
                      <td className="px-2 py-2.5 text-sand-600 text-xs">{app.country_origin}</td>
                      <td className="px-2 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          app.stream === "Outland" ? "bg-brand-100 text-brand-600" : "bg-warn-light text-warn-dark"
                        }`}>{app.stream}</span>
                      </td>
                      <td className="px-2 py-2.5 text-xs text-sand-600">{app.current_step}</td>
                      <td className="px-2 py-2.5 text-center">
                        {hasPin ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 font-semibold">Set</span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sand-100 text-sand-500">None</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-xs text-sand-400">
                        {new Date(app.created_at).toLocaleDateString("en-CA")}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasPin && (
                            <button
                              onClick={() => handleResetPin(app.id)}
                              disabled={resetting === app.id}
                              className="text-[10px] px-2 py-1 rounded bg-warn-light text-warn-dark font-medium hover:bg-warn/20 transition-colors disabled:opacity-50"
                            >
                              {resetting === app.id ? "..." : "Reset PIN"}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(app.id)}
                            disabled={deleting === app.id}
                            className="text-[10px] px-2 py-1 rounded bg-error-light text-error font-medium hover:bg-error/10 transition-colors disabled:opacity-50"
                          >
                            {deleting === app.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sand-400 text-sm">No entries match your search</div>
          )}
        </div>
      )}
    </div>
  );
}
