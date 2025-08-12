import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";

export default function AddNote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState<"doctorNote" | "nurseNote" | "pharmacy" | "discharge" | "">("");
  const [content, setContent] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = `Add Note | Clinical Canvas`;
  }, []);

  useEffect(() => {
    if (!id) return;
    api.patients
      .get(id)
      .then((p) => {
        setPatientName(p.name);
        if (p.assignedDoctorId) setAuthorId(p.assignedDoctorId);
      })
      .catch(() => {});
  }, [id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !category || !content || !authorId) return;
    setSubmitting(true);
    try {
      await api.notes.create(id, { patientId: id, authorId, category, content });
      navigate(`/patients/${id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Add Note" showBack onBack={() => navigate(-1)} />
      <main className="p-4">
        <Card className="p-4 max-w-xl mx-auto">
          <h1 className="text-lg font-semibold mb-4">Add Note {patientName ? `for ${patientName}` : ""}</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctorNote">Doctor Note</SelectItem>
                  <SelectItem value="nurseNote">Nurse Note</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="discharge">Discharge</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Author ID</Label>
              <input
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                placeholder="e.g., doc-abc123"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Enter clinical note"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting} className="flex-1">{submitting ? "Saving..." : "Save Note"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </form>
        </Card>
      </main>
      <BottomBar />
    </div>
  );
}
