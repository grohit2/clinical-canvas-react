import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StageChip } from "@/components/patient/StageChip";
import { Timeline } from "@/components/patient/Timeline";
import { PatientTasks } from "@/components/patient/PatientTasks";
import { QrCode, Copy, Phone, Mail, Calendar } from "lucide-react";
import api from "@/lib/api";
import type { Patient, TimelineEntry } from "@/types/api";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [isScrolled, setIsScrolled] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!id) return;
    api.patients
      .get(id)
      .then((data) => {
        setPatient(data);
        return api.patients.timeline(id);
      })
      .then(setTimeline)
      .catch(() => navigate("/patients"));
  }, [id, navigate]);

  if (!patient) {
    return (
      <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
        <Header
          title="Patient Details"
          showBack
          onBack={() => navigate("/patients")}
          notificationCount={2}
        />
        <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <Header
        title="Patient Details"
        showBack
        onBack={() => navigate("/patients")}
        notificationCount={2}
      />

      {isScrolled && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b shadow-sm">
          <div className="px-3 sm:px-4 lg:px-6 py-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
                  {patient.name}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {patient.mrn} • {patient.currentState}
                </p>
              </div>
              <StageChip stage={patient.currentState || ""} variant="caution" size="sm" />
            </div>
          </div>
        </div>
      )}

      <div className={`p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 ${isScrolled ? "pt-20" : ""}`}>
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-3 break-words">{patient.name}</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground whitespace-nowrap">MRN:</span>
                    <span className="font-medium break-all">{patient.mrn}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  {patient.age !== undefined && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="whitespace-nowrap">{patient.age} years old</span>
                    </div>
                  )}
                  {patient.sex && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Sex:</span>
                      <span className="break-words capitalize">{patient.sex}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-muted-foreground">Pathway:</div>
                  <Badge variant="outline" className="capitalize w-fit">
                    {patient.pathway}
                  </Badge>
                  <div className="text-muted-foreground">Current Stage:</div>
                  <StageChip stage={patient.currentState || ""} variant="caution" />
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="flex-shrink-0 w-full sm:w-auto">
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Primary Diagnosis:</span>
              <div className="font-medium mt-1 break-words">{patient.diagnosis}</div>
            </div>

            {patient.comorbidities && patient.comorbidities.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Comorbidities:</span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                  {patient.comorbidities.map((comorbidity) => (
                    <Badge key={comorbidity} variant="secondary" className="text-xs">
                      {comorbidity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {patient.emergencyContact && (
              <div className="mt-4 sm:mt-6 pt-4 border-t">
                <span className="text-sm text-muted-foreground">Emergency Contact:</span>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                  <span className="font-medium break-words">
                    {patient.emergencyContact.name}
                    {patient.emergencyContact.relationship ? ` (${patient.emergencyContact.relationship})` : ""}
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted/50 rounded-lg border">
            <TabsTrigger
              value="overview"
              className="text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all"
            >
              Notes
            </TabsTrigger>
            <TabsTrigger
              value="labs"
              className="text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all"
            >
              Labs
            </TabsTrigger>
            <TabsTrigger
              value="meds"
              className="text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all"
            >
              Meds
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all"
            >
              Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-6">
            <div className="space-y-4">
              <Card className="p-4 sm:p-6 border-l-4 border-l-primary">
                <h3 className="font-semibold mb-3 text-base sm:text-lg">Patient Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Diagnosis:</span>
                    <p className="font-medium mt-1">{patient.diagnosis}</p>
                  </div>
                  {patient.assignedDoctor && (
                    <div>
                      <span className="text-muted-foreground">Assigned Doctor:</span>
                      <p className="font-medium mt-1">{patient.assignedDoctor}</p>
                    </div>
                  )}
                  {patient.lastUpdated && (
                    <div>
                      <span className="text-muted-foreground">Last Updated:</span>
                      <p className="font-medium mt-1">{new Date(patient.lastUpdated).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </Card>

              {timeline.length > 0 ? (
                <Timeline entries={timeline} currentState={patient.currentState || ""} />
              ) : (
                <Card className="p-4 sm:p-6">
                  <p className="text-muted-foreground text-center text-sm sm:text-base">No timeline data available for this patient</p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-6">
            <Card className="p-4 sm:p-6 min-h-[400px] border border-border/50">
              <div className="space-y-4">
                <h3 className="font-semibold text-base sm:text-lg">Clinical Notes</h3>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-dashed">
                    <p className="text-center py-8">Clinical notes will be displayed here</p>
                    <p className="text-center text-xs">Patient: {patient.name} • ID: {patient.mrn}</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="labs" className="mt-6">
            <Card className="p-4 sm:p-6 min-h-[400px] border border-border/50">
              <div className="space-y-4">
                <h3 className="font-semibold text-base sm:text-lg">Laboratory Results</h3>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-dashed">
                    <p className="text-center py-8">Lab results will be displayed here</p>
                    <p className="text-center text-xs">Patient: {patient.name} • ID: {patient.mrn}</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="meds" className="mt-6">
            <Card className="p-4 sm:p-6 min-h-[400px] border border-border/50">
              <div className="space-y-4">
                <h3 className="font-semibold text-base sm:text-lg">Medications</h3>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-dashed">
                    <p className="text-center py-8">Medication list will be displayed here</p>
                    <p className="text-center text-xs">Patient: {patient.name} • ID: {patient.mrn}</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <Card className="p-4 sm:p-6 min-h-[400px] border border-border/50">
              <div className="space-y-4">
                <h3 className="font-semibold text-base sm:text-lg">Patient Tasks</h3>
                <PatientTasks patientId={patient.mrn} />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomBar />
    </div>
  );
}
