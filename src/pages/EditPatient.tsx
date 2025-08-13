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

export default function EditPatient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    age: "",
    sex: "" as string,
    diagnosis: "",
    pathway: "" as "surgical" | "consultation" | "emergency" | "",
    assignedDoctor: "",
    assignedDoctorId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { document.title = `Edit Patient | Clinical Canvas`; }, []);

  useEffect(() => {
    if (!id) return;
    api.patients.get(id).then(p => {
      setForm({
        name: p.name || "",
        age: p.age ? String(p.age) : "",
        sex: p.sex || "",
        diagnosis: p.diagnosis || "",
        pathway: (p.pathway as "surgical" | "consultation" | "emergency" | "") || "",
        assignedDoctor: p.assignedDoctor || "",
        assignedDoctorId: p.assignedDoctorId || "",
      });
    }).catch(() => {});
  }, [id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      const payload: Partial<import("@/types/api").Patient> = {
        name: form.name,
        diagnosis: form.diagnosis,
        assignedDoctor: form.assignedDoctor,
        assignedDoctorId: form.assignedDoctorId,
      };
      if (form.age) payload.age = Number(form.age);
      if (form.sex) payload.sex = form.sex;
      if (form.pathway) payload.pathway = form.pathway;
      await api.patients.update(id, payload);
      navigate(`/patients/${id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Edit Patient" showBack onBack={() => navigate(-1)} />
      <main className="p-4">
        <Card className="p-4 max-w-xl mx-auto">
          <h1 className="text-lg font-semibold mb-4">Edit Patient</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Sex</Label>
                <Select value={form.sex} onValueChange={v => setForm({ ...form, sex: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Diagnosis</Label>
              <Input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Pathway</Label>
              <Select value={form.pathway} onValueChange={v => setForm({ ...form, pathway: v as "surgical" | "consultation" | "emergency" | "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pathway" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surgical">Surgical</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned Doctor</Label>
              <Input value={form.assignedDoctor} onChange={e => setForm({ ...form, assignedDoctor: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Assigned Doctor ID</Label>
              <Input value={form.assignedDoctorId} onChange={e => setForm({ ...form, assignedDoctorId: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting} className="flex-1">{submitting ? "Saving..." : "Save"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </form>
        </Card>
      </main>
      <BottomBar />
    </div>
  );
}
