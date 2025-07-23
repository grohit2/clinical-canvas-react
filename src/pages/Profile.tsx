import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Bell, Shield, LogOut, Phone, Mail, Clock, QrCode, Edit2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState } from "react";

const mockUser = {
  id: 'user123',
  name: 'Dr. Sarah Wilson',
  role: 'doctor',
  department: 'Cardiothoracic Surgery',
  email: 'sarah.wilson@hospital.com',
  phone: '+1-555-0789',
  shift: 'Day Shift (7AM - 7PM)',
  permissions: ['prescribe', 'approve', 'admin', 'surgery'],
  stats: {
    patientsToday: 12,
    tasksCompleted: 28,
    hoursWorked: 8.5
  },
  // Extended profile data
  personalInfo: {
    fullName: 'Dr. Sarah Wilson',
    gender: 'Female',
    dateOfBirth: new Date('1985-03-15'),
    profilePicture: null,
    address: '123 Medical Plaza, Downtown, City 10001',
    emergencyContact: '+1-555-0123 (Dr. John Wilson - Spouse)'
  },
  professionalInfo: {
    specialization: 'Cardiothoracic Surgery',
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
    loginDevice: 'Chrome on Windows 11',
    loginLocation: 'Mumbai, Maharashtra, India',
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

export default function Profile() {
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState(mockUser.email);
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);

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
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Full Name</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{mockUser.personalInfo.fullName}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Gender</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{mockUser.personalInfo.gender}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Email ID</span>
                <div className="flex items-center gap-2">
                  {isEditingEmail ? (
                    <Input 
                      value={newEmail} 
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-48"
                    />
                  ) : (
                    <span className="font-medium">{mockUser.email}</span>
                  )}
                  <Edit2 
                    className="h-4 w-4 text-muted-foreground cursor-pointer" 
                    onClick={handleEmailChange}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Phone Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{mockUser.phone}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Date of Birth</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{mockUser.personalInfo.dateOfBirth.toLocaleDateString()}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </div>
              </div>
            </div>
          </Card>

          {/* Professional Information Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🏥 Professional Information
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Specialization</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{mockUser.professionalInfo.specialization}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Department</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{mockUser.professionalInfo.department}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Years of Experience</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{mockUser.professionalInfo.yearsOfExperience} years</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Medical Registration</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{mockUser.professionalInfo.medicalRegistrationNumber}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Consultation Fee</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">₹{mockUser.professionalInfo.consultationFee}</span>
                  <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer" />
                </div>
              </div>
            </div>
          </Card>

          {/* Security Settings Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🔐 Security Settings
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Password</span>
                <div className="flex items-center gap-2">
                  {isEditingPassword ? (
                    <div className="flex gap-2">
                      <Input 
                        type="password"
                        placeholder="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-32"
                      />
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-32"
                      />
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  ) : (
                    <span className="font-medium">••••••••</span>
                  )}
                  <Edit2 
                    className="h-4 w-4 text-muted-foreground cursor-pointer"
                    onClick={handlePasswordChange}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Two-Factor Authentication</span>
                <div className="flex items-center gap-2">
                  <Switch checked={mockUser.securityInfo.twoFactorEnabled} />
                  <span className="text-sm text-green-600">Enabled</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Last Login</span>
                <span className="font-medium">{mockUser.securityInfo.lastLogin}</span>
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
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16 shadow-sm">
              <AvatarFallback className="text-lg font-semibold bg-medical/10 text-medical">
                {mockUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{mockUser.name}</h2>
              <p className="text-muted-foreground">{mockUser.department}</p>
              <Badge variant="outline" className="mt-1 capitalize text-xs">
                {mockUser.role}
              </Badge>
            </div>
            <Button variant="outline" size="sm">
              <QrCode className="h-4 w-4 mr-2" />
              QR Scanner
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
                <div className="font-medium">{mockUser.email}</div>
                <div className="text-sm text-muted-foreground">Primary Email</div>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{mockUser.phone}</div>
                <div className="text-sm text-muted-foreground">Contact Number</div>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{mockUser.shift}</div>
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
            <Button variant="ghost" className="w-full justify-start h-12">
              <Bell className="h-5 w-5 mr-3" />
              Notifications
            </Button>
            <Button variant="ghost" className="w-full justify-start h-12">
              <Shield className="h-5 w-5 mr-3" />
              Privacy & Security
            </Button>
            <Separator />
            <Button variant="ghost" className="w-full justify-start h-12 text-red-600 hover:text-red-700">
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
      
      <BottomBar />
    </div>
  );
}