import { Header } from "@shared/components/layout/Header";
import { BottomBar } from "@shared/components/layout/BottomBar";
import { Card } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Switch } from "@shared/components/ui/switch";
import { Avatar, AvatarFallback } from "@shared/components/ui/avatar";
import { Input } from "@shared/components/ui/input";
import { Separator } from "@shared/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@shared/components/ui/alert-dialog";
import { Settings, Bell, Shield, Phone, Mail, Clock, QrCode, Edit2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState } from "react";

const mockUser = {
  id: 'user123',
  name: 'Dr. Kamalika',
  role: 'doctor',
  department: 'IPS, IAS, Dr. FRCS, BTech',
  email: 'kkcvs3@gmail.com',
  phone: '',
  shift: 'Day Shift (7AM - 7PM)',
  permissions: ['prescribe', 'approve', 'admin', 'surgery'],
  stats: {
    patientsToday: 12,
    tasksCompleted: 28,
    hoursWorked: 8.5
  },
  notifications: [
    {
      id: 'not001',
      patientId: 'pat001',
      patientName: 'John Doe',
      taskType: 'Lab Results Review',
      priority: 'high',
      dueDate: '2024-07-24',
      description: 'Blood work results pending review and approval',
      timeAgo: '2 hours ago'
    },
    {
      id: 'not002',
      patientId: 'pat002',
      patientName: 'Jane Smith',
      taskType: 'Pre-Surgery Clearance',
      priority: 'urgent',
      dueDate: '2024-07-24',
      description: 'Final clearance needed for tomorrow surgery',
      timeAgo: '4 hours ago'
    },
    {
      id: 'not003',
      patientId: 'pat003',
      patientName: 'Robert Johnson',
      taskType: 'Medication Adjustment',
      priority: 'medium',
      dueDate: '2024-07-25',
      description: 'Post-surgery medication dosage review required',
      timeAgo: '1 day ago'
    },
    {
      id: 'not004',
      patientId: 'pat004',
      patientName: 'Maria Garcia',
      taskType: 'Follow-up Consultation',
      priority: 'medium',
      dueDate: '2024-07-25',
      description: 'Schedule follow-up after cardiac procedure',
      timeAgo: '1 day ago'
    },
    {
      id: 'not005',
      patientId: 'pat005',
      patientName: 'David Brown',
      taskType: 'Test Results',
      priority: 'low',
      dueDate: '2024-07-26',
      description: 'ECG results interpretation needed',
      timeAgo: '2 days ago'
    }
  ],
  // Extended profile data
  personalInfo: {
    fullName: 'Dr. Kamalika',
    gender: 'Female',
    dateOfBirth: new Date('1985-03-15'),
    profilePicture: null,
    address: '123 Medical Plaza, Downtown, City 10001',
    emergencyContact: '+1-555-0123 (Dr. John Wilson - Spouse)'
  },
  professionalInfo: {
    specialization: 'IPS, IAS, Dr. FRCS, BTech',
    department: 'Cardiac Surgery Department',
    yearsOfExperience: 15,
    qualifications: ['MBBS - All India Institute of Medical Sciences (2008)', 'MS General Surgery - King George Medical University (2012)', 'MCh Cardiothoracic Surgery - Postgraduate Institute (2015)', 'Fellowship in Minimally Invasive Cardiac Surgery - Cleveland Clinic (2016)'],
    medicalRegistrationNumber: 'MCI-12345-2010',
    workingHospital: 'City General Hospital - Cardiac Wing, Building A, Floor 5',
    consultationFee: 1500,
    languages: ['English', 'Hindi', 'Spanish'],
    awards: ['Best Cardiac Surgeon 2022', 'Excellence in Patient Care 2021'],
    research: ['Published 25+ research papers in cardiovascular surgery', 'Lead researcher in minimally invasive cardiac procedures']
  },
  availability: {
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    timeSlots: [
      { start: '09:00', end: '12:00', label: 'Morning Consultation', maxPatients: 8 },
      { start: '14:00', end: '17:00', label: 'Afternoon Consultation', maxPatients: 6 },
      { start: '18:00', end: '20:00', label: 'Evening Consultation', maxPatients: 4 }
    ],
    maxPatientsPerSlot: 8,
    vacationDates: [
      { start: '2024-12-25', end: '2024-12-31', reason: 'Year-end vacation' },
      { start: '2024-08-15', end: '2024-08-18', reason: 'Medical Conference' }
    ],
    specialNotes: 'Emergency surgeries take priority. Please allow buffer time between consultations.'
  },
  appointments: {
    upcoming: [
      { id: 'apt001', patientName: 'John Doe', time: '10:00 AM', date: '2024-07-24', type: 'Follow-up', status: 'confirmed' },
      { id: 'apt002', patientName: 'Jane Smith', time: '11:30 AM', date: '2024-07-24', type: 'New Consultation', status: 'pending' },
      { id: 'apt003', patientName: 'Robert Johnson', time: '2:00 PM', date: '2024-07-24', type: 'Post-Surgery', status: 'confirmed' },
      { id: 'apt004', patientName: 'Maria Garcia', time: '3:30 PM', date: '2024-07-25', type: 'Pre-Surgery', status: 'pending' }
    ],
    todayCount: 8,
    pendingApproval: 3,
    completedToday: 4
  },
  prescriptionTemplates: [
    {
      id: 'temp001',
      name: 'Post-Cardiac Surgery Standard',
      medications: ['Aspirin 75mg OD', 'Clopidogrel 75mg OD', 'Atorvastatin 20mg OD', 'Metoprolol 25mg BD'],
      instructions: 'Take medications as prescribed. Follow up in 2 weeks.'
    },
    {
      id: 'temp002', 
      name: 'Hypertension Management',
      medications: ['Amlodipine 5mg OD', 'Telmisartan 40mg OD', 'Hydrochlorothiazide 12.5mg OD'],
      instructions: 'Monitor BP daily. Low sodium diet recommended.'
    },
    {
      id: 'temp003',
      name: 'Pre-Surgery Preparation',
      medications: ['Cephalexin 500mg QID', 'Omeprazole 20mg BD'],
      instructions: 'Start 24 hours before surgery. NPO after midnight.'
    }
  ],
  patientHistory: {
    totalPatients: 1247,
    activeCases: 23,
    recentPatients: [
      { id: 'pat001', name: 'John Doe', lastVisit: '2024-07-20', condition: 'Coronary Artery Disease', status: 'Stable' },
      { id: 'pat002', name: 'Jane Smith', lastVisit: '2024-07-18', condition: 'Mitral Valve Stenosis', status: 'Pre-Surgery' },
      { id: 'pat003', name: 'Robert Johnson', lastVisit: '2024-07-15', condition: 'Post-CABG', status: 'Recovering' }
    ]
  },
  securityInfo: {
    lastLogin: '2024-07-23 09:30:00',
    twoFactorEnabled: true,
    securityQuestions: ['What was your first pet\'s name?', 'What city were you born in?'],
    sessionHistory: [
      { date: '2024-07-23', time: '09:30', device: 'Chrome/Windows', location: 'Mumbai, IN' },
      { date: '2024-07-22', time: '08:45', device: 'Safari/iOS', location: 'Mumbai, IN' },
      { date: '2024-07-21', time: '10:15', device: 'Chrome/Windows', location: 'Mumbai, IN' }
    ]
  },
  preferences: {
    language: 'english',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12-hour',
    theme: 'light',
    notifications: {
      email: true,
      sms: true,
      push: true,
      appointmentReminders: true,
      labResults: true,
      urgentAlerts: true
    },
    privacy: {
      profileVisibility: 'colleagues',
      showOnlineStatus: false,
      allowDirectMessages: true
    }
  }
};

export function ProfilePage() {
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState(mockUser.email);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);

  const doctor = mockUser;

  const handleEmailChange = () => {
    setIsEditingEmail(true);
    setShowVerification(true);
  };

  const handlePasswordChange = () => {
    setIsEditingPassword(true);
    setShowVerification(true);
  };

  const verifyAndSave = () => {
    // Verification logic here
    setShowVerification(false);
    setIsEditingEmail(false);
    setIsEditingPassword(false);
  };

  // Notifications View
  if (showNotifications) {
    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
        case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'low': return 'bg-green-100 text-green-800 border-green-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Notifications" />

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Patient Tasks & Notifications</h1>
          </div>

          {mockUser.notifications.map((notification) => (
            <Card key={notification.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-sm sm:text-base truncate">{notification.patientName}</h3>
                    <Badge className={`text-xs px-2 py-1 ${getPriorityColor(notification.priority)}`}>
                      {notification.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-primary mb-1">{notification.taskType}</p>
                  <p className="text-sm text-muted-foreground mb-2 break-words">{notification.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Due: {notification.dueDate}</span>
                    <span>{notification.timeAgo}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="flex-shrink-0">
                  View
                </Button>
              </div>
            </Card>
          ))}

          {mockUser.notifications.length === 0 && (
            <Card className="p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pending tasks</h3>
              <p className="text-muted-foreground">All your patient tasks are up to date!</p>
            </Card>
          )}
        </div>

        <BottomBar />
      </div>
    );
  }

  if (showAccountSettings) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Account Settings" />
        
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setShowAccountSettings(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Account Settings</h1>
          </div>

          {/* Personal Information Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              👨‍⚕️ Personal Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 min-h-[48px]">
                <span className="text-muted-foreground flex-shrink-0 w-32 sm:w-40">Full Name</span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <span className="font-medium text-right break-words max-w-[200px] sm:max-w-none">{doctor.name}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer flex-shrink-0" />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-3 min-h-[48px]">
                <span className="text-muted-foreground flex-shrink-0 w-32 sm:w-40">Gender</span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <span className="font-medium text-right">{doctor.personalInfo?.gender ?? '—'}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer flex-shrink-0" />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-3 min-h-[48px]">
                <span className="text-muted-foreground flex-shrink-0 w-24 xs:w-28 sm:w-32 md:w-40">Email ID</span>
                <div className="flex items-center gap-2 xs:gap-3 flex-1 justify-end overflow-hidden">
                  {isEditingEmail ? (
                    <Input 
                      value={newEmail} 
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-32 xs:w-36 sm:w-44 md:w-48 text-xs xs:text-sm"
                    />
                  ) : (
                    <span className="font-medium text-right break-all text-xs xs:text-sm sm:text-base max-w-[120px] xs:max-w-[140px] sm:max-w-[180px] md:max-w-none">{doctor.email}</span>
                  )}
                  <Edit2 
                    className="h-4 w-4 text-muted-foreground cursor-pointer flex-shrink-0" 
                    onClick={handleEmailChange}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-3 min-h-[48px]">
                <span className="text-muted-foreground flex-shrink-0 w-32 sm:w-40">Date of Birth</span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <span className="font-medium text-right">{doctor.personalInfo?.dateOfBirth ? new Date(doctor.personalInfo.dateOfBirth).toLocaleDateString() : '—'}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer flex-shrink-0" />
                </div>
              </div>
            </div>
          </Card>

          {/* Professional Information Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🏥 Professional Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 min-h-[48px]">
                <span className="text-muted-foreground flex-shrink-0 w-32 sm:w-40">Specialization</span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <span className="font-medium text-right break-words max-w-[200px] sm:max-w-none">{doctor.professionalInfo?.specialization ?? '—'}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer flex-shrink-0" />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-3 min-h-[48px]">
                <span className="text-muted-foreground flex-shrink-0 w-32 sm:w-40">Department</span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <span className="font-medium text-right break-words max-w-[200px] sm:max-w-none">{doctor.department}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer flex-shrink-0" />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-3 min-h-[48px]">
                <span className="text-muted-foreground flex-shrink-0 w-32 sm:w-40">Experience</span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <span className="font-medium text-right">{doctor.professionalInfo?.yearsOfExperience ?? '—'} years</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer flex-shrink-0" />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-3 min-h-[48px]">
                <span className="text-muted-foreground flex-shrink-0 w-32 sm:w-40">Registration</span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <span className="font-medium text-right break-words max-w-[200px] sm:max-w-none">{doctor.professionalInfo?.medicalRegistrationNumber ?? '—'}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer flex-shrink-0" />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-3 min-h-[48px]">
                <span className="text-muted-foreground flex-shrink-0 w-32 sm:w-40">Consultation Fee</span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <span className="font-medium text-right">₹{doctor.professionalInfo?.consultationFee ?? '—'}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer flex-shrink-0" />
                </div>
              </div>
            </div>
          </Card>

          {/* Security Settings Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🔐 Security Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 min-h-[48px]">
                <span className="text-muted-foreground flex-shrink-0 w-32 sm:w-40">Password</span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  {isEditingPassword ? (
                    <div className="flex gap-2 items-center">
                      <Input 
                        type="password"
                        placeholder="Current"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-20 sm:w-24"
                      />
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="New"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-20 sm:w-24"
                      />
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  ) : (
                    <span className="font-medium text-right">••••••••</span>
                  )}
                  <Edit2 
                    className="h-4 w-4 text-muted-foreground cursor-pointer flex-shrink-0"
                    onClick={handlePasswordChange}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-3 min-h-[48px]">
                <span className="text-muted-foreground flex-shrink-0 w-32 sm:w-40">Two-Factor Auth</span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <span className="text-sm text-green-600">Enabled</span>
                  <Switch checked={mockUser.securityInfo.twoFactorEnabled} className="flex-shrink-0" />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between py-3 min-h-[48px]">
                <span className="text-muted-foreground flex-shrink-0 w-32 sm:w-40">Last Login</span>
                <span className="font-medium text-right text-sm break-words max-w-[200px] sm:max-w-none">{mockUser.securityInfo.lastLogin}</span>
              </div>
            </div>
          </Card>

          {/* Verification Dialog */}
          <AlertDialog open={showVerification} onOpenChange={setShowVerification}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Email Verification Required</AlertDialogTitle>
                <AlertDialogDescription>
                  Please enter the verification code sent to your email to confirm this change.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input 
                placeholder="Enter verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowVerification(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={verifyAndSave}>
                  Verify & Save
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Profile" />
      
      <div className="p-4 space-y-6">
        {/* Profile Header */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 shadow-sm flex-shrink-0">
              <AvatarFallback className="text-base sm:text-lg font-semibold bg-medical/10 text-medical">
                {doctor.name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 mr-2">
              <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">{doctor.name}</h2>
              <p className="text-sm sm:text-base text-muted-foreground truncate">{doctor.department}</p>
              <Badge variant="outline" className="mt-1 capitalize text-xs">
                {doctor.role}
              </Badge>
            </div>
            <Button variant="outline" size="sm" className="flex-shrink-0 h-9 px-2 sm:px-3">
              <QrCode className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">QR Scanner</span>
            </Button>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{mockUser.stats.patientsToday}</div>
            <div className="text-sm text-muted-foreground">Patients Today</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{mockUser.stats.tasksCompleted}</div>
            <div className="text-sm text-muted-foreground">Tasks Done</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{mockUser.stats.hoursWorked}h</div>
            <div className="text-sm text-muted-foreground">Hours Worked</div>
          </Card>
        </div>

        {/* Profile Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{doctor.email}</div>
                <div className="text-sm text-muted-foreground">Primary Email</div>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{doctor.shift}</div>
                <div className="text-sm text-muted-foreground">Current Shift</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Settings Menu */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12"
              onClick={() => setShowAccountSettings(true)}
            >
              <Settings className="h-5 w-5 mr-3" />
              Account Settings
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start h-12"
              onClick={() => setShowNotifications(true)}
            >
              <Bell className="h-5 w-5 mr-3" />
              Notifications
              {mockUser.notifications.length > 0 && (
                <Badge className="ml-auto bg-red-500 text-white text-xs">
                  {mockUser.notifications.length}
                </Badge>
              )}
            </Button>
            <Button variant="ghost" className="w-full justify-start h-12">
              <Shield className="h-5 w-5 mr-3" />
              Privacy & Security
            </Button>
          </div>
        </Card>
      </div>
      
      <BottomBar />
    </div>
  );
}

export default ProfilePage;
