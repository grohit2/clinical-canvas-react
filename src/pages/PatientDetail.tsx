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
import { QrCode, Copy, Phone, Mail, Calendar, MapPin, Clock } from "lucide-react";
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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      
      {/* Sticky Header on Scroll */}
      {isScrolled && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b shadow-sm">
          <div className="px-3 sm:px-4 lg:px-6 py-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
                  {currentPatient.name}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {demographics?.mrn} • {currentPatient.currentState}
                </p>
              </div>
              <StageChip stage={currentPatient.currentState} variant="caution" size="sm" />
            </div>
          </div>
        </div>
      )}
      
      <div className={`p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 ${isScrolled ? 'pt-20' : ''}`}>
        {/* Patient Hero */}
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-3 break-words">{currentPatient.name}</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground whitespace-nowrap">MRN:</span>
                    <span className="font-medium break-all">{demographics?.mrn}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="whitespace-nowrap">{demographics?.age} years old</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="break-words">{demographics?.room}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-muted-foreground">Pathway:</div>
                  <Badge variant="outline" className="capitalize w-fit">
                    {currentPatient.pathway}
                  </Badge>
                  <div className="text-muted-foreground">Current Stage:</div>
                  <StageChip stage={currentPatient.currentState} variant="caution" />
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="flex-shrink-0 w-full sm:w-auto">
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
          </div>

          {/* Diagnosis and Comorbidities */}
          <div className="space-y-3 sm:space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Primary Diagnosis:</span>
              <div className="font-medium mt-1 break-words">{currentPatient.diagnosis}</div>
            </div>
            
            {currentPatient.comorbidities.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Comorbidities:</span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                  {currentPatient.comorbidities.map((comorbidity) => (
                    <Badge key={comorbidity} variant="secondary" className="text-xs">
                      {comorbidity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {demographics?.allergies && demographics.allergies.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Allergies:</span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                  {demographics.allergies.map((allergy) => (
                    <Badge key={allergy} variant="destructive" className="text-xs">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          {demographics?.emergencyContact && (
            <div className="mt-4 sm:mt-6 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Emergency Contact:</span>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                <span className="font-medium break-words">{demographics.emergencyContact.name}</span>
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
        </Card>

        {/* Tabs Navigation */}
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
              {/* Patient Information Summary */}
              <Card className="p-4 sm:p-6 border-l-4 border-l-primary">
                <h3 className="font-semibold mb-3 text-base sm:text-lg">Patient Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Diagnosis:</span>
                    <p className="font-medium mt-1">{currentPatient.diagnosis}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Assigned Doctor:</span>
                    <p className="font-medium mt-1">{currentPatient.assignedDoctor}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Updated:</span>
                    <p className="font-medium mt-1">{new Date(currentPatient.lastUpdated).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {/* Allergies in Overview */}
                {demographics?.allergies && demographics.allergies.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-sm text-muted-foreground font-medium">⚠️ Allergies:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {demographics.allergies.map((allergy) => (
                        <Badge key={allergy} variant="destructive" className="text-xs">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Timeline */}
              {patientTimeline.length > 0 ? (
                <Timeline entries={patientTimeline} currentState={currentPatient.currentState} />
              ) : (
                <Card className="p-4 sm:p-6">
                  <p className="text-muted-foreground text-center text-sm sm:text-base">No timeline data available for this patient</p>
                </Card>
              )}
              
              {/* Quick Stats */}
              {demographics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-4 sm:p-6 border border-border/50">
                    <h3 className="font-semibold mb-3 text-sm sm:text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Length of Stay
                    </h3>
                    <p className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                      {demographics.lengthOfStay} {demographics.lengthOfStay === 1 ? 'day' : 'days'}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Since admission on {new Date(demographics.admissionDate).toLocaleDateString()}</p>
                  </Card>
                  <Card className="p-4 sm:p-6 border border-border/50">
                    <h3 className="font-semibold mb-3 text-sm sm:text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Next Milestone
                    </h3>
                    <p className="text-base sm:text-lg font-medium mb-1 break-words">{demographics.nextMilestone}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{demographics.nextMilestoneTime}</p>
                  </Card>
                </div>
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
                    <p className="text-center text-xs">Patient: {currentPatient.name} • ID: {currentPatient.id}</p>
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
                    <p className="text-center text-xs">Patient: {currentPatient.name} • ID: {currentPatient.id}</p>
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
                    <p className="text-center text-xs">Patient: {currentPatient.name} • ID: {currentPatient.id}</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <Card className="p-4 sm:p-6 min-h-[400px] border border-border/50">
              <div className="space-y-4">
                <h3 className="font-semibold text-base sm:text-lg">Tasks & Checklist</h3>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-dashed">
                    <p className="text-center py-8">Patient tasks and checklist will be displayed here</p>
                    <p className="text-center text-xs">Patient: {currentPatient.name} • ID: {currentPatient.id}</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomBar />
    </div>
  );
}