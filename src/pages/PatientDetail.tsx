import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StageChip } from "@/components/patient/StageChip";
import { Timeline } from "@/components/patient/Timeline";
import { QrCode, Copy, Phone, Mail, Calendar, MapPin } from "lucide-react";
import { PatientMeta, TimelineEntry } from "@/types/models";

// Mock data - replace with real API calls
const mockPatients: PatientMeta[] = [
  {
    id: '27e8d1ad',
    name: 'Jane Doe',
    qrCode: 'https://qrc.c/27e8d1ad',
    pathway: 'surgical',
    currentState: 'post-op',
    diagnosis: 'Cholecystitis',
    comorbidities: ['HTN', 'DM'],
    updateCounter: 5,
    lastUpdated: '2025-07-19T14:30:09Z',
    assignedDoctor: 'Dr. Smith'
  },
  {
    id: '3b9f2c1e',
    name: 'John Smith',
    qrCode: 'https://qrc.c/3b9f2c1e',
    pathway: 'emergency',
    currentState: 'ICU',
    diagnosis: 'Acute MI',
    comorbidities: ['CAD', 'HTN'],
    updateCounter: 12,
    lastUpdated: '2025-07-19T16:45:22Z',
    assignedDoctor: 'Dr. Johnson'
  },
  {
    id: '8c4d5e2f',
    name: 'Maria Garcia',
    qrCode: 'https://qrc.c/8c4d5e2f',
    pathway: 'consultation',
    currentState: 'stable',
    diagnosis: 'Osteoarthritis',
    comorbidities: ['Obesity'],
    updateCounter: 2,
    lastUpdated: '2025-07-19T11:20:15Z',
    assignedDoctor: 'Dr. Smith'
  },
  {
    id: '9d6e7f3g',
    name: 'Robert Wilson',
    qrCode: 'https://qrc.c/9d6e7f3g',
    pathway: 'surgical',
    currentState: 'pre-op',
    diagnosis: 'Appendicitis',
    comorbidities: [],
    updateCounter: 8,
    lastUpdated: '2025-07-19T13:15:30Z',
    assignedDoctor: 'Dr. Smith'
  },
  {
    id: '1a2b3c4d',
    name: 'Sarah Johnson',
    qrCode: 'https://qrc.c/1a2b3c4d',
    pathway: 'emergency',
    currentState: 'recovery',
    diagnosis: 'Pneumonia',
    comorbidities: ['COPD', 'HTN'],
    updateCounter: 3,
    lastUpdated: '2025-07-19T09:45:18Z',
    assignedDoctor: 'Dr. Johnson'
  }
];

const mockTimelines: Record<string, TimelineEntry[]> = {
  '27e8d1ad': [
    {
      patientId: '27e8d1ad',
      state: 'Admission',
      dateIn: '2025-07-18T08:00:00Z',
      dateOut: '2025-07-18T10:00:00Z',
      checklistIn: ['vitals-recorded', 'allergies-checked'],
      checklistOut: ['pre-op-clearance']
    },
    {
      patientId: '27e8d1ad',
      state: 'Pre-Op',
      dateIn: '2025-07-18T10:00:00Z',
      dateOut: '2025-07-18T14:00:00Z',
      checklistIn: ['consent-signed', 'fasting-confirmed'],
      checklistOut: ['anesthesia-cleared']
    },
    {
      patientId: '27e8d1ad',
      state: 'Surgery',
      dateIn: '2025-07-18T14:00:00Z',
      dateOut: '2025-07-18T16:30:00Z',
      checklistIn: ['timeout-completed', 'antibiotics-given'],
      checklistOut: ['procedure-completed', 'counts-correct']
    },
    {
      patientId: '27e8d1ad',
      state: 'Post-Op',
      dateIn: '2025-07-18T16:30:00Z',
      checklistIn: ['recovery-stable', 'pain-managed'],
      checklistOut: []
    }
  ],
  '3b9f2c1e': [
    {
      patientId: '3b9f2c1e',
      state: 'Emergency',
      dateIn: '2025-07-19T12:00:00Z',
      dateOut: '2025-07-19T14:00:00Z',
      checklistIn: ['triage-completed', 'vitals-stable'],
      checklistOut: ['ecg-completed']
    },
    {
      patientId: '3b9f2c1e',
      state: 'ICU',
      dateIn: '2025-07-19T14:00:00Z',
      checklistIn: ['monitoring-active', 'medications-administered'],
      checklistOut: []
    }
  ]
};

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Find the current patient based on ID
  const currentPatient = mockPatients.find(patient => patient.id === id);
  
  // If patient not found, redirect to patients list
  if (!currentPatient) {
    navigate('/patients');
    return null;
  }

  // Get timeline data for current patient
  const patientTimeline = mockTimelines[currentPatient.id] || [];
  
  // Patient-specific demographics data
  const patientDemographics = {
    '27e8d1ad': {
      mrn: 'MRN123456',
      dob: '1975-03-15',
      age: 49,
      gender: 'Female',
      room: 'Room 204B',
      admissionDate: '2025-07-18',
      lengthOfStay: 3,
      nextMilestone: 'Discharge Planning',
      nextMilestoneTime: 'Expected tomorrow',
      allergies: ['Penicillin', 'Latex'],
      emergencyContact: {
        name: 'John Doe (Spouse)',
        phone: '+1-555-0123'
      }
    },
    '3b9f2c1e': {
      mrn: 'MRN789012',
      dob: '1980-08-22',
      age: 44,
      gender: 'Male', 
      room: 'ICU Room 12',
      admissionDate: '2025-07-19',
      lengthOfStay: 1,
      nextMilestone: 'Cardiology Consult',
      nextMilestoneTime: 'This afternoon',
      allergies: ['Aspirin'],
      emergencyContact: {
        name: 'Mary Smith (Wife)',
        phone: '+1-555-0456'
      }
    },
    '8c4d5e2f': {
      mrn: 'MRN345678',
      dob: '1965-12-05',
      age: 59,
      gender: 'Female',
      room: 'Room 108A',
      admissionDate: '2025-07-19',
      lengthOfStay: 1,
      nextMilestone: 'Physical Therapy Evaluation',
      nextMilestoneTime: 'Next week',
      allergies: [],
      emergencyContact: null
    },
    '9d6e7f3g': {
      mrn: 'MRN901234',
      dob: '1990-05-18',
      age: 34,
      gender: 'Male',
      room: 'Room 315C',
      admissionDate: '2025-07-19',
      lengthOfStay: 1,
      nextMilestone: 'Surgery Scheduled',
      nextMilestoneTime: 'Tomorrow morning',
      allergies: ['Morphine'],
      emergencyContact: {
        name: 'Linda Wilson (Mother)',
        phone: '+1-555-0789'
      }
    },
    '1a2b3c4d': {
      mrn: 'MRN567890',
      dob: '1978-11-30',
      age: 46,
      gender: 'Female',
      room: 'Room 220B',
      admissionDate: '2025-07-19',
      lengthOfStay: 1,
      nextMilestone: 'Respiratory Assessment',
      nextMilestoneTime: 'Later today',
      allergies: ['Codeine'],
      emergencyContact: {
        name: 'Michael Johnson (Husband)',
        phone: '+1-555-0321'
      }
    }
  };

  const demographics = patientDemographics[currentPatient.id];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title="Patient Details" 
        showBack
        onBack={() => navigate('/patients')}
        notificationCount={2}
      />
      
      <div className="p-4 space-y-6">
        {/* Patient Hero */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-2">{currentPatient.name}</h1>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="text-muted-foreground">MRN:</div>
                    <span className="font-medium">{demographics?.mrn}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>{demographics?.age} years old</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{demographics?.room}</span>
                    </div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Pathway:</div>
                  <Badge variant="outline" className="capitalize">
                    {currentPatient.pathway}
                  </Badge>
                  <div className="text-muted-foreground">Current Stage:</div>
                  <StageChip stage={currentPatient.currentState} variant="caution" />
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
          </div>

          {/* Diagnosis and Comorbidities */}
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Primary Diagnosis:</span>
              <div className="font-medium">{currentPatient.diagnosis}</div>
            </div>
            
            {currentPatient.comorbidities.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Comorbidities:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {currentPatient.comorbidities.map((comorbidity) => (
                    <Badge key={comorbidity} variant="secondary">
                      {comorbidity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {demographics?.allergies && demographics.allergies.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Allergies:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {demographics.allergies.map((allergy) => (
                    <Badge key={allergy} variant="destructive">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          {demographics?.emergencyContact && (
            <div className="mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Emergency Contact:</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-medium">{demographics.emergencyContact.name}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                  <Button variant="outline" size="sm">
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="labs">Labs</TabsTrigger>
            <TabsTrigger value="meds">Meds</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {patientTimeline.length > 0 ? (
              <Timeline entries={patientTimeline} currentState={currentPatient.currentState} />
            ) : (
              <Card className="p-6">
                <p className="text-muted-foreground text-center">No timeline data available for this patient</p>
              </Card>
            )}
            
            {/* Quick Stats */}
            {demographics && (
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Length of Stay</h3>
                  <p className="text-2xl font-bold text-medical">{demographics.lengthOfStay} {demographics.lengthOfStay === 1 ? 'day' : 'days'}</p>
                  <p className="text-sm text-muted-foreground">Since admission</p>
                </Card>
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Next Milestone</h3>
                  <p className="text-lg font-medium">{demographics.nextMilestone}</p>
                  <p className="text-sm text-muted-foreground">{demographics.nextMilestoneTime}</p>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes">
            <Card className="p-4">
              <p className="text-muted-foreground text-center py-8">
                Notes component will be implemented here
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="labs">
            <Card className="p-4">
              <p className="text-muted-foreground text-center py-8">
                Lab results component will be implemented here
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="meds">
            <Card className="p-4">
              <p className="text-muted-foreground text-center py-8">
                Medications component will be implemented here
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card className="p-4">
              <p className="text-muted-foreground text-center py-8">
                Tasks component will be implemented here
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomBar />
    </div>
  );
}