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
import { paths } from "@/app/navigation";
import type { Task, Doctor } from "@/types/api";

export default function EditTask() {
  const { id: uid, taskId } = useParams();
  const navigate = useNavigate();
  const [patientName, setPatientName] = useState("");
  const [department, setDepartment] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [form, setForm] = useState({
    title: "",
    type: "" as Task['type'] | "",
    date: "",
    time: "",
    assigneeId: "",
    priority: "medium" as Task['priority'],
    status: "open" as Task['status'],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { document.title = `Edit Task | Clinical Canvas`; }, []);

  useEffect(() => {
    if (!uid) return;
    api.patients.get(uid).then(p => {
      setPatientName(p.name);
      setDepartment(p.department || "");
    }).catch(() => {});
  }, [uid]);

  useEffect(() => {
    if (!uid || !taskId) return;
    api.tasks.list(uid).then(ts => {
      const t = ts.find(t => t.taskId === taskId);
      if (t) {
        const due = new Date(t.due);
        setForm({
          title: t.title,
          type: t.type,
          date: due.toISOString().slice(0, 10),
          time: due.toISOString().slice(11, 16),
          assigneeId: t.assigneeId,
          priority: t.priority,
          status: t.status,
        });
      }
    }).catch(() => {});
  }, [uid, taskId]);

  useEffect(() => {
    if (!department) return;
    api.doctors.list(department).then(setDoctors).catch(() => {});
  }, [department]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !taskId || !form.type || !form.assigneeId || !form.date || !form.time) return;
    setSubmitting(true);
    try {
      const due = new Date(`${form.date}T${form.time}`);
      const payload: Partial<Task> = {
        title: form.title,
        type: form.type,
        due: due.toISOString(),
        assigneeId: form.assigneeId,
        priority: form.priority,
        status: form.status,
      };
      await api.tasks.update(uid, taskId, payload);
      navigate(paths.patient(uid));
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Edit Task" showBack onBack={() => navigate(-1)} />
      <main className="p-4">
        <Card className="p-4 max-w-xl mx-auto">
          <h1 className="text-lg font-semibold mb-4">Edit Task {patientName ? `for ${patientName}` : ""}</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as Task['type'] })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="discharge">Discharge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title/Description</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={form.assigneeId} onValueChange={v => setForm({ ...form, assigneeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={doctors.length ? "Select doctor" : "Enter assignee id"} />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(d => (
                    <SelectItem key={d.doctorId} value={d.doctorId}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as Task['priority'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as Task['status'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting} className="flex-1">{submitting ? "Saving..." : "Save Task"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </form>
        </Card>
      </main>
      <BottomBar />
    </div>
  );
}
