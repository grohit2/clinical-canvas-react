import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, ClipboardList, SendHorizontal } from "lucide-react";
import { PageShell } from "@shared/components/layout/PageShell";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Card } from "@shared/components/ui/card";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Textarea } from "@shared/components/ui/textarea";

type ReferralType = "External Referral" | "Cross Consult";
type ReferralPriority = "Normal" | "Urgent";

interface ReferralForm {
  patientName: string;
  uid: string;
  requestingDoctor: string;
  destinationProvider: string;
  destinationDepartment: string;
  referralType: ReferralType;
  priority: ReferralPriority;
  reason: string;
  clinicalNotes: string;
  preferredDate: string;
  preferredTime: string;
}

interface SubmittedReferral {
  id: string;
  patientName: string;
  uid: string;
  destinationProvider: string;
  destinationDepartment: string;
  priority: ReferralPriority;
  referralType: ReferralType;
  status: "Initiated" | "Accepted" | "Completed";
  reason: string;
  createdAt: string;
  preferredAt?: string;
}

const INITIAL_FORM: ReferralForm = {
  patientName: "",
  uid: "",
  requestingDoctor: "Dr. Kamalika",
  destinationProvider: "",
  destinationDepartment: "",
  referralType: "External Referral",
  priority: "Normal",
  reason: "",
  clinicalNotes: "",
  preferredDate: "",
  preferredTime: "",
};

const PROVIDER_OPTIONS = [
  "Dr. Kapoor",
  "Dr. Sharma",
  "Dr. Nair",
  "Dr. Patel",
  "Dr. Reddy",
];

const DEPARTMENT_OPTIONS = [
  "Orthopedics",
  "Neurology",
  "Cardiology",
  "Pulmonology",
  "General Surgery",
];

const DEFAULT_RECENT_REQUESTS: SubmittedReferral[] = [
  {
    id: "REF-10021",
    patientName: "Anita Rao",
    uid: "MRN001",
    destinationProvider: "Dr. Kapoor",
    destinationDepartment: "Orthopedics",
    priority: "Normal",
    referralType: "External Referral",
    status: "Accepted",
    reason: "Chronic knee pain, requires specialist review.",
    createdAt: "2026-03-05T11:05:00.000Z",
    preferredAt: "2026-03-08T09:30:00.000Z",
  },
  {
    id: "REF-10022",
    patientName: "Rajesh Kumar",
    uid: "MRN002",
    destinationProvider: "Dr. Sharma",
    destinationDepartment: "Neurology",
    priority: "Urgent",
    referralType: "Cross Consult",
    status: "Initiated",
    reason: "Persistent headaches with focal neurological findings.",
    createdAt: "2026-03-05T08:15:00.000Z",
  },
];

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPriorityBadgeClass(priority: ReferralPriority): string {
  return priority === "Urgent"
    ? "bg-red-100 text-red-800 border-red-200"
    : "bg-slate-100 text-slate-700 border-slate-200";
}

function getStatusBadgeClass(status: SubmittedReferral["status"]): string {
  switch (status) {
    case "Completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "Accepted":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-amber-100 text-amber-800 border-amber-200";
  }
}

function buildPreferredDateTime(date: string, time: string): string | undefined {
  if (!date) return undefined;
  const safeTime = time || "09:00";
  const candidate = new Date(`${date}T${safeTime}`);
  return Number.isNaN(candidate.getTime()) ? undefined : candidate.toISOString();
}

function buildNewReferral(form: ReferralForm): SubmittedReferral {
  const timestamp = Date.now();
  return {
    id: `REF-${String(timestamp).slice(-6)}`,
    patientName: form.patientName.trim(),
    uid: form.uid.trim(),
    destinationProvider: form.destinationProvider,
    destinationDepartment: form.destinationDepartment,
    priority: form.priority,
    referralType: form.referralType,
    status: "Initiated",
    reason: form.reason.trim(),
    createdAt: new Date(timestamp).toISOString(),
    preferredAt: buildPreferredDateTime(form.preferredDate, form.preferredTime),
  };
}

export function ReferralsScreen() {
  const [form, setForm] = useState<ReferralForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  const [requests, setRequests] = useState<SubmittedReferral[]>(DEFAULT_RECENT_REQUESTS);
  const [errors, setErrors] = useState<Partial<Record<keyof ReferralForm, string>>>({});

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "Initiated").length,
    [requests]
  );

  const urgentCount = useMemo(
    () => requests.filter((request) => request.priority === "Urgent").length,
    [requests]
  );

  const updateField = <K extends keyof ReferralForm>(key: K, value: ReferralForm[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => {
      if (!previous[key]) return previous;
      return { ...previous, [key]: undefined };
    });
  };

  const resetForm = () => {
    setForm((previous) => ({
      ...INITIAL_FORM,
      requestingDoctor: previous.requestingDoctor.trim() || INITIAL_FORM.requestingDoctor,
    }));
    setErrors({});
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof ReferralForm, string>> = {};

    if (!form.patientName.trim()) nextErrors.patientName = "Patient name is required.";
    if (!form.uid.trim()) nextErrors.uid = "MRN is required.";
    if (!form.requestingDoctor.trim()) nextErrors.requestingDoctor = "Requesting doctor is required.";
    if (!form.destinationProvider) nextErrors.destinationProvider = "Select a destination provider.";
    if (!form.destinationDepartment) nextErrors.destinationDepartment = "Select a destination department.";
    if (!form.reason.trim()) nextErrors.reason = "Reason for referral is required.";
    if (form.preferredTime && !form.preferredDate) {
      nextErrors.preferredDate = "Select a date when a time is provided.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    const newRequest = buildNewReferral(form);
    setRequests((previous) => [newRequest, ...previous]);
    setLastSubmittedId(newRequest.id);
    resetForm();

    setSubmitting(false);
  };

  return (
    <PageShell header={{ title: "Referral Request" }}>
      <main className="p-4 pb-24 space-y-4">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Create New Request</h2>
                <p className="text-sm text-muted-foreground">
                  Submit referral details and share essential context with receiving teams.
                </p>
              </div>
              <Badge variant="outline" className="whitespace-nowrap">
                {requests.length} Total Requests
              </Badge>
            </div>

            {lastSubmittedId && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>Request {lastSubmittedId} submitted successfully.</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="patientName">Patient Name</Label>
                  <Input
                    id="patientName"
                    value={form.patientName}
                    onChange={(event) => updateField("patientName", event.target.value)}
                    placeholder="Enter patient full name"
                  />
                  {errors.patientName && <p className="text-xs text-red-600">{errors.patientName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uid">MRN</Label>
                  <Input
                    id="uid"
                    value={form.uid}
                    onChange={(event) => updateField("uid", event.target.value)}
                    placeholder="e.g. MRN00981"
                  />
                  {errors.uid && <p className="text-xs text-red-600">{errors.uid}</p>}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Referral Type</Label>
                  <Select
                    value={form.referralType}
                    onValueChange={(value) => updateField("referralType", value as ReferralType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="External Referral">External Referral</SelectItem>
                      <SelectItem value="Cross Consult">Cross Consult</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(value) => updateField("priority", value as ReferralPriority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestingDoctor">Requesting Doctor</Label>
                <Input
                  id="requestingDoctor"
                  value={form.requestingDoctor}
                  onChange={(event) => updateField("requestingDoctor", event.target.value)}
                  placeholder="Dr. Name"
                />
                {errors.requestingDoctor && (
                  <p className="text-xs text-red-600">{errors.requestingDoctor}</p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Destination Provider</Label>
                  <Select
                    value={form.destinationProvider}
                    onValueChange={(value) => updateField("destinationProvider", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_OPTIONS.map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.destinationProvider && (
                    <p className="text-xs text-red-600">{errors.destinationProvider}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Destination Department</Label>
                  <Select
                    value={form.destinationDepartment}
                    onValueChange={(value) => updateField("destinationDepartment", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENT_OPTIONS.map((department) => (
                        <SelectItem key={department} value={department}>
                          {department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.destinationDepartment && (
                    <p className="text-xs text-red-600">{errors.destinationDepartment}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Referral</Label>
                <Textarea
                  id="reason"
                  value={form.reason}
                  onChange={(event) => updateField("reason", event.target.value)}
                  placeholder="Primary reason, key symptoms, and expected outcome."
                  rows={3}
                />
                {errors.reason && <p className="text-xs text-red-600">{errors.reason}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinicalNotes">Clinical Notes</Label>
                <Textarea
                  id="clinicalNotes"
                  value={form.clinicalNotes}
                  onChange={(event) => updateField("clinicalNotes", event.target.value)}
                  placeholder="Share relevant labs, medication details, and procedural notes."
                  rows={4}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="preferredDate">Preferred Appointment Date</Label>
                  <Input
                    id="preferredDate"
                    type="date"
                    value={form.preferredDate}
                    onChange={(event) => updateField("preferredDate", event.target.value)}
                  />
                  {errors.preferredDate && <p className="text-xs text-red-600">{errors.preferredDate}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredTime">Preferred Appointment Time</Label>
                  <Input
                    id="preferredTime"
                    type="time"
                    value={form.preferredTime}
                    onChange={(event) => updateField("preferredTime", event.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Button type="submit" disabled={submitting} className="min-w-40">
                  <SendHorizontal className="mr-2 h-4 w-4" />
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Clear Form
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-semibold">Request Snapshot</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Quick overview of pending queue and response expectations.
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Pending Referrals</p>
                <p className="text-2xl font-semibold">{pendingCount}</p>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Urgent Referrals</p>
                <p className="text-2xl font-semibold">{urgentCount}</p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <Clock3 className="h-4 w-4" />
                  <p className="text-sm font-medium">SLA Guidance</p>
                </div>
                <p className="mt-1 text-xs text-amber-700">
                  Urgent requests target a response within 4 hours, normal requests within 24 hours.
                </p>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <ClipboardList className="h-4 w-4" />
                  <p className="text-sm font-medium">Pre-submit Checklist</p>
                </div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-blue-700">
                  <li>Confirm latest vitals and medication list.</li>
                  <li>Attach concise reason and desired specialist input.</li>
                  <li>Mark urgent only when immediate intervention is required.</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mx-auto max-w-6xl p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold">Recent Requests</h3>
              <p className="text-sm text-muted-foreground">Track referral status after submission.</p>
            </div>
          </div>

          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{request.patientName}</p>
                      <span className="text-xs text-muted-foreground">({request.uid})</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.destinationProvider} - {request.destinationDepartment}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getPriorityBadgeClass(request.priority)}>
                      {request.priority}
                    </Badge>
                    <Badge variant="outline" className={getStatusBadgeClass(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>ID: {request.id}</span>
                  <span>Submitted: {formatDateTime(request.createdAt)}</span>
                  {request.preferredAt && <span>Preferred: {formatDateTime(request.preferredAt)}</span>}
                  <span>Type: {request.referralType}</span>
                </div>

                <p className="mt-2 text-sm text-foreground">{request.reason}</p>
                {request.priority === "Urgent" && request.status === "Initiated" && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-red-700">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Follow up if not acknowledged within 4 hours.
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </main>
    </PageShell>
  );
}
