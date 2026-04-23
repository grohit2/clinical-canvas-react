import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@shared/components/layout/Header";
import { BottomBar } from "@shared/components/layout/BottomBar";
import { Card } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Label } from "@shared/components/ui/label";
import { Input } from "@shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import api from "@shared/lib/api";
import { paths } from "@app/navigation";
import { useToast } from "@shared/hooks/use-toast";

const SCHEME_OPTIONS = ["ASP", "NAM", "EHS", "PAID", "OTHERS"] as const;

const normalizeScheme = (value?: string): string => {
  const raw = (value || "").trim().toUpperCase();
  if ((SCHEME_OPTIONS as readonly string[]).includes(raw)) return raw;
  if (["UNKNOWN", "GENERAL", "OTHER", "OTHERS"].includes(raw)) return "OTHERS";
  return raw || "OTHERS";
};

export function AddMrnPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [patientName, setPatientName] = useState("");
  const [scheme, setScheme] = useState<string>("");
  const [mrn, setMrn] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = `Add MRN | Clinical Canvas`;
  }, []);

  useEffect(() => {
    if (!id) return;
    api.patients
      .get(id)
      .then((p) => setPatientName(p.name))
      .catch(() => {});
  }, [id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !mrn.trim() || !scheme) return;
    setSubmitting(true);
    try {
      const payload = { mrn: mrn.trim(), scheme: normalizeScheme(scheme) };
      await api.patients.switchRegistration(id, payload);
      toast({ title: "MRN added", description: `${mrn.trim()} added to ${patientName || "patient"}` });
      navigate(paths.patient(id));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to add MRN";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Add MRN" showBack onBack={() => navigate(-1)} />
      <main className="p-4">
        <Card className="p-4 max-w-xl mx-auto">
          <h1 className="text-lg font-semibold mb-4">Add MRN {patientName ? `for ${patientName}` : ""}</h1>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Scheme</Label>
              <Select value={scheme} onValueChange={(v) => setScheme(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  {SCHEME_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>MRN</Label>
              <Input
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                placeholder="Enter MRN (e.g., ABC-1234567)"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting || !mrn.trim() || !scheme} className="flex-1">
                {submitting ? "Adding..." : "Add MRN"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </main>
      <BottomBar />
    </div>
  );
}

export default AddMrnPage;
