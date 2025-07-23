import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StageChip } from '@/components/patient/StageChip';
import { UpdateRing } from '@/components/patient/UpdateRing';
import { Clock, MapPin, User, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { patientService } from '@/services';

// Mock patient data - in real app, this would come from an API
const mockPatientData = {
  '27e8d1ad': {
    id: '27e8d1ad',
    name: 'Jane Doe',
    age: 45,
    gender: 'Female',
    pathway: 'surgical',
    currentState: 'post-op',
    diagnosis: 'Cholecystitis',
    comorbidities: ['HTN', 'DM'],
    updateCounter: 5,
    lastUpdated: '2025-07-19T14:30:09Z',
    assignedDoctor: 'Dr. Sarah Wilson',
    room: 'Room 204B',
    vitals: {
      temperature: '98.6°F',
      bloodPressure: '120/80',
      heartRate: '72 bpm',
      oxygenSaturation: '98%'
    },
    recentUpdates: [
      { time: '14:30', note: 'Post-operative check completed', type: 'assessment' },
      { time: '12:15', note: 'Pain medication administered', type: 'medication' },
      { time: '10:00', note: 'Vital signs stable', type: 'vitals' },
      { time: '08:30', note: 'Patient awake and responsive', type: 'observation' }
    ]
  }
};

export default function PatientQRView() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPatientData = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const patientData = await patientService.getPatientQRData(id);
        setPatient(patientData);
      } catch (error) {
        console.error('Failed to load patient QR data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPatientData();
    
    // Update timestamp every minute
    const interval = setInterval(() => {
      setLastUpdate(new Date().toLocaleTimeString());
    }, 60000);

    setLastUpdate(new Date().toLocaleTimeString());
    return () => clearInterval(interval);
  }, [id]);

  if (!patient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Patient Not Found</h2>
          <p className="text-muted-foreground">The QR code may be invalid or the patient record is not available.</p>
        </Card>
      </div>
    );
  }

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Patient Details" />
      
      <div className="p-4 space-y-4">
        {/* Patient Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {patient.name.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{patient.name}</h1>
                <p className="text-sm text-muted-foreground">{patient.age} years • {patient.gender}</p>
              </div>
              <UpdateRing count={patient.updateCounter} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{patient.room}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{patient.assignedDoctor}</span>
                </div>
              </div>
              <div className="space-y-2">
                <StageChip stage={patient.currentState} />
                <Badge variant="outline" className="text-xs">
                  {patient.pathway}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
              <span>Last updated: {formatLastUpdated(patient.lastUpdated)}</span>
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span>Live at {lastUpdate}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diagnosis & Comorbidities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Diagnosis & Conditions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-primary">{patient.diagnosis}</p>
                <p className="text-xs text-muted-foreground">Primary diagnosis</p>
              </div>
              {patient.comorbidities.length > 0 && (
                <div>
                  <div className="flex flex-wrap gap-1">
                    {patient.comorbidities.map((condition: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Comorbidities</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Vitals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Current Vitals</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Temperature</p>
                <p className="font-medium">{patient.vitals.temperature}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Blood Pressure</p>
                <p className="font-medium">{patient.vitals.bloodPressure}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Heart Rate</p>
                <p className="font-medium">{patient.vitals.heartRate}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">O2 Saturation</p>
                <p className="font-medium">{patient.vitals.oxygenSaturation}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Updates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Updates</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {patient.recentUpdates.map((update: any, index: number) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{update.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{update.note}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {update.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}