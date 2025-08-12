import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";

export default function AddMedication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patientName, setPatientName] = useState("");
  const [form, setForm] = useState({
    name: "",
    dose: "",
    route: "",
    freq: "",
    start: "",
    end: "",
    priority: "routine" as "routine" | "important" | "critical",
    scheduleTimes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = `Add Medication | Clinical Canvas`;
  }, []);

  useEffect(() => {
    if (!id) return;
    api.patients.get(id).then((p) => setPatientName(p.name)).catch(() => {});
  }, [id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      const payload: any = {
        name: form.name,
        dose: form.dose,
        route: form.route,
        freq: form.freq,
        start: form.start || new Date().toISOString(),
        end: form.end || null,
        priority: form.priority,
        scheduleTimes: form.scheduleTimes ? form.scheduleTimes.split(",").map((s) => s.trim()) : []
      };
      await api.meds.create(id, payload);
      navigate(`/patients/${id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Add Medication" showBack onBack={() => navigate(-1)} />
      <main className="p-4">
        <Card className="p-4 max-w-xl mx-auto">
          <h1 className="text-lg font-semibold mb-4">Add Medication {patientName ? `for ${patientName}` : ""}</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Dose</Label>
                <Input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Route</Label>
                <Input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} placeholder="PO/IV/SC" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Input value={form.freq} onChange={(e) => setForm({ ...form, freq: e.target.value })} placeholder="e.g., q6h" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Schedule Times (comma separated UTC times e.g., 06:00Z, 12:00Z)</Label>
              <Input value={form.scheduleTimes} onChange={(e) => setForm({ ...form, scheduleTimes: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting} className="flex-1">{submitting ? "Saving..." : "Save Medication"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </form>
        </Card>
      </main>
      <BottomBar />
    </div>
  );
}
