import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import type { Patient } from "@/types/api";

const SCHEME_OPTIONS = ["ASP", "NAM", "EHS", "PAID", "OTHERS"] as const;
type Scheme = typeof SCHEME_OPTIONS[number] | string;

const normalizeScheme = (value?: string): string => {
  const raw = (value || "").trim().toUpperCase();
  if ((SCHEME_OPTIONS as readonly string[]).includes(raw)) return raw;
  if (["UNKNOWN", "GENERAL", "OTHER", "OTHERS"].includes(raw)) return "OTHERS";
  return raw || "OTHERS";
};

export type MrnHistoryEntry = { mrn: string; scheme: string; date?: string };

export function MrnEditor({
  patientId,
  initialHistory,
  initialLatestMrn,
  onApplied,
}: {
  patientId: string;
  initialHistory?: MrnHistoryEntry[];
  initialLatestMrn?: string;
  onApplied?: (updated: Patient) => void;
}) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<MrnHistoryEntry[]>(() =>
    (initialHistory && initialHistory.length ? initialHistory : [])
      .map((e) => ({ mrn: e.mrn || "", scheme: normalizeScheme(e.scheme), date: e.date }))
  );
  const [latestMrn, setLatestMrn] = useState<string>(initialLatestMrn || "");
  const originalLatestRef = useRef<string | null>(initialLatestMrn || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEntries((initialHistory || []).map((e) => ({ mrn: e.mrn || "", scheme: normalizeScheme(e.scheme), date: e.date })));
    setLatestMrn(initialLatestMrn || "");
    originalLatestRef.current = initialLatestMrn || null;
  }, [initialHistory, initialLatestMrn]);

  // If no initial data provided, fetch from API to hydrate
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (initialHistory !== undefined && initialLatestMrn !== undefined) return;
      try {
        const p = await api.patients.get(patientId);
        if (cancelled) return;
        setEntries((p.mrnHistory || []).map((e) => ({ mrn: e.mrn || "", scheme: normalizeScheme(e.scheme), date: e.date })));
        setLatestMrn(p.latestMrn || "");
        originalLatestRef.current = p.latestMrn || null;
      } catch (e) {
        // noop: editor can still function with empty state
      }
    })();
    return () => { cancelled = true; };
  }, [patientId, initialHistory, initialLatestMrn]);

  const addEntry = () => setEntries((prev) => [...prev, { mrn: "", scheme: "", date: "" }]);
  const removeEntry = (idx: number) => setEntries((prev) => prev.filter((_, i) => i !== idx));
  const updateEntry = (idx: number, key: keyof MrnHistoryEntry, value: string) =>
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [key]: key === "scheme" ? normalizeScheme(value) : value } : e)));
  const setAsLatest = (idx: number) => setLatestMrn(entries[idx]?.mrn || "");

  const hasValid = entries.some((e) => e.mrn && e.scheme);
  const cleanedHistory = useMemo(() => {
    const nowIso = new Date().toISOString();
    const oldFallback = "1970-01-01T00:00:00.000Z";
    return entries
      .filter((e) => (e.mrn || "").trim())
      .map((e) => ({
        mrn: String(e.mrn).trim(),
        scheme: normalizeScheme(e.scheme),
        date: e.mrn === latestMrn ? nowIso : (e.date || oldFallback),
      }));
  }, [entries, latestMrn]);

  const onSave = async () => {
    if (!patientId) return;
    if (!hasValid) {
      toast({ title: "Nothing to save", description: "Add at least one MRN with a scheme." });
      return;
    }
    setSaving(true);
    try {
      // Try single-call overwrite first
      try {
        await api.patients.overwriteMrn(patientId, cleanedHistory as any);
      } catch (e: any) {
        const msg = (e && e.message) ? String(e.message).toLowerCase() : "";
        const fallback = msg.includes("route not found") || msg.includes("internal server error");
        if (!fallback) throw e;

        // Fallback path: switch latest (if changed) then rewrite history
        const originalLatest = originalLatestRef.current || "";
        let desired = latestMrn?.trim() || "";
        if (!desired || !cleanedHistory.some((h) => h.mrn === desired)) {
          desired = [...cleanedHistory].sort((a, b) => new Date(b.date || "1970-01-01").getTime() - new Date(a.date || "1970-01-01").getTime())[0]?.mrn || desired;
        }
        if (desired && desired !== originalLatest) {
          const scheme = cleanedHistory.find((h) => h.mrn === desired)?.scheme || normalizeScheme();
          await api.patients.switchRegistration(patientId, { mrn: desired, scheme });
        }
        await api.patients.updateMrnHistory(patientId, cleanedHistory as any);
      }

      const updated = await api.patients.get(patientId);
      toast({ title: "MRN updated", description: "MRN history saved successfully." });
      originalLatestRef.current = updated.latestMrn || originalLatestRef.current;
      setEntries(updated.mrnHistory || []);
      setLatestMrn(updated.latestMrn || "");
      onApplied?.(updated);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save MRN changes", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">MRN Entries</h3>
          <p className="text-sm text-muted-foreground">Add, edit and set the current MRN</p>
        </div>
        <button
          type="button"
          onClick={addEntry}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Add MRN
        </button>
      </div>

      <div className="space-y-3">
        {entries.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-muted-foreground text-center">
            No MRNs yet. Click Add MRN to create one.
          </div>
        )}

        {entries.map((entry, idx) => (
          <div key={`${idx}-${entry.mrn}`} className="border rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">MRN #{idx + 1}</span>
                {latestMrn === entry.mrn && (
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" /> Latest
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAsLatest(idx)}
                  className={`text-xs px-2 py-1 rounded ${
                    latestMrn === entry.mrn ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-emerald-100"
                  }`}
                >
                  {latestMrn === entry.mrn ? "Latest" : "Set Latest"}
                </button>
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(idx)}
                    className="text-red-500 hover:text-red-700 p-1"
                    aria-label="Remove MRN"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Scheme</label>
                <div className="flex flex-wrap gap-1">
                  {(SCHEME_OPTIONS as readonly string[]).map((opt) => {
                    const active = entry.scheme === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateEntry(idx, "scheme", opt)}
                        className={`px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors ${
                          active ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">MRN</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={entry.mrn}
                  onChange={(e) => updateEntry(idx, "mrn", e.target.value)}
                  placeholder="ABC-1234567"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Date</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={entry.date ? new Date(entry.date).toISOString().slice(0, 10) : ""}
                  onChange={(e) => updateEntry(idx, "date", e.target.value ? new Date(e.target.value).toISOString().slice(0, 10) : "")}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !hasValid}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save MRN changes"}
        </button>
      </div>
    </div>
  );
}
