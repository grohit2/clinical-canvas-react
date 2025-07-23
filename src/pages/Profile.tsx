import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Settings, Bell, Shield, LogOut, Phone, Mail, Clock, QrCode, User, Stethoscope, Calendar as CalendarIcon, FileText, History, Lock, Palette, Trash2, Plus, Save, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <Header title="Account Settings" />
      
      <div className="p-4 space-y-6 max-w-full overflow-x-hidden">
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
              <p className="text-muted-foreground">{mockUser.professionalInfo.specialization}</p>
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

        {/* Settings Tabs - Enhanced responsive design */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full min-w-max grid-cols-9 h-auto p-1">
              <TabsTrigger value="personal" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-2 py-2 min-w-0">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="hidden xs:block text-center">Personal</span>
              </TabsTrigger>
              <TabsTrigger value="professional" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-2 py-2 min-w-0">
                <Stethoscope className="h-3 w-3 flex-shrink-0" />
                <span className="hidden xs:block text-center">Professional</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-2 py-2 min-w-0">
                <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                <span className="hidden xs:block text-center">Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="appointments" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-2 py-2 min-w-0">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span className="hidden xs:block text-center">Appointments</span>
              </TabsTrigger>
              <TabsTrigger value="prescriptions" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-2 py-2 min-w-0">
                <FileText className="h-3 w-3 flex-shrink-0" />
                <span className="hidden xs:block text-center">Prescriptions</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-2 py-2 min-w-0">
                <History className="h-3 w-3 flex-shrink-0" />
                <span className="hidden xs:block text-center">History</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-2 py-2 min-w-0">
                <Lock className="h-3 w-3 flex-shrink-0" />
                <span className="hidden xs:block text-center">Security</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-2 py-2 min-w-0">
                <Palette className="h-3 w-3 flex-shrink-0" />
                <span className="hidden xs:block text-center">Preferences</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-2 py-2 min-w-0">
                <Trash2 className="h-3 w-3 flex-shrink-0" />
                <span className="hidden xs:block text-center">Account</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Personal Information */}
          <TabsContent value="personal" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" defaultValue={mockUser.personalInfo.fullName} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select defaultValue={mockUser.personalInfo.gender.toLowerCase()}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email ID</Label>
                  <Input id="email" type="email" defaultValue={mockUser.email} disabled />
                  <p className="text-xs text-muted-foreground">Email cannot be changed for security reasons</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" defaultValue={mockUser.phone} />
                </div>
                
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {mockUser.personalInfo.dateOfBirth ? format(mockUser.personalInfo.dateOfBirth, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate || mockUser.personalInfo.dateOfBirth}
                        onSelect={setSelectedDate}
                        className="pointer-events-auto"
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profilePicture">Profile Picture</Label>
                  <Input id="profilePicture" type="file" accept="image/*" />
                  <p className="text-xs text-muted-foreground">Optional - Upload a professional photo</p>
                </div>
              </div>
              
              <Button className="mt-6">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </Card>
          </TabsContent>

          {/* Professional Information */}
          <TabsContent value="professional" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Professional Information</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input id="specialization" defaultValue={mockUser.professionalInfo.specialization} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" defaultValue={mockUser.professionalInfo.department} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input id="experience" type="number" defaultValue={mockUser.professionalInfo.yearsOfExperience} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Medical Registration Number</Label>
                  <Input id="registrationNumber" defaultValue={mockUser.professionalInfo.medicalRegistrationNumber} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="consultationFee">Consultation Fee (₹)</Label>
                  <Input id="consultationFee" type="number" defaultValue={mockUser.professionalInfo.consultationFee} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="languages">Languages</Label>
                  <Input id="languages" defaultValue={mockUser.professionalInfo.languages.join(', ')} />
                </div>
                
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="qualifications">Qualifications</Label>
                  <Textarea 
                    id="qualifications" 
                    defaultValue={mockUser.professionalInfo.qualifications.join('\n')}
                    placeholder="Enter qualifications (one per line)"
                    rows={4}
                  />
                </div>
                
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="hospital">Working Hospital/Branch</Label>
                  <Input id="hospital" defaultValue={mockUser.professionalInfo.workingHospital} />
                </div>
                
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="awards">Awards & Recognition</Label>
                  <Textarea 
                    id="awards" 
                    defaultValue={mockUser.professionalInfo.awards.join('\n')}
                    placeholder="Enter awards and recognition (one per line)"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="research">Research & Publications</Label>
                  <Textarea 
                    id="research" 
                    defaultValue={mockUser.professionalInfo.research.join('\n')}
                    placeholder="Enter research work and publications"
                    rows={3}
                  />
                </div>
              </div>
              
              <Button className="mt-6 w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </Card>
          </TabsContent>

          {/* Availability & Schedule */}
          <TabsContent value="schedule" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Availability & Schedule</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Working Days</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id={day} 
                          defaultChecked={mockUser.availability.workingDays.includes(day)}
                          className="rounded"
                        />
                        <Label htmlFor={day} className="text-sm">{day}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-base font-medium">Time Slots</Label>
                  <div className="space-y-3 mt-2">
                    {mockUser.availability.timeSlots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                        <Input placeholder="Start Time" defaultValue={slot.start} className="w-32" />
                        <span>to</span>
                        <Input placeholder="End Time" defaultValue={slot.end} className="w-32" />
                        <Input placeholder="Label" defaultValue={slot.label} className="flex-1" />
                        <Button variant="outline" size="sm">Remove</Button>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Time Slot
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxPatients">Max Patients Per Slot</Label>
                    <Input id="maxPatients" type="number" defaultValue={mockUser.availability.maxPatientsPerSlot} />
                  </div>
                </div>
              </div>
              
              <Button className="mt-6">
                <Save className="h-4 w-4 mr-2" />
                Save Schedule
              </Button>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Security Settings</h3>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Change Password</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input 
                          id="currentPassword" 
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter current password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" placeholder="Enter new password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" type="password" placeholder="Confirm new password" />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable 2FA</p>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                    <Switch />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Login History</h4>
                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm"><strong>Last login:</strong> Today at 9:30 AM</p>
                    <p className="text-sm"><strong>Device:</strong> Chrome on Windows</p>
                    <p className="text-sm"><strong>Location:</strong> Mumbai, India</p>
                  </div>
                </div>
              </div>
              
              <Button className="mt-6">
                <Save className="h-4 w-4 mr-2" />
                Update Security Settings
              </Button>
            </Card>
          </TabsContent>

          {/* Appointment Management */}
          <TabsContent value="appointments" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Appointment Management</h3>
              </div>
              
              {/* Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-xl sm:text-2xl font-bold text-medical">{mockUser.appointments.todayCount}</div>
                  <div className="text-xs text-muted-foreground">Today</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-xl sm:text-2xl font-bold text-caution">{mockUser.appointments.pendingApproval}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-xl sm:text-2xl font-bold text-stable">{mockUser.appointments.completedToday}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{mockUser.appointments.upcoming.length}</div>
                  <div className="text-xs text-muted-foreground">Upcoming</div>
                </div>
              </div>

              {/* Upcoming Appointments */}
              <div className="space-y-3">
                <h4 className="font-medium">Upcoming Appointments</h4>
                {mockUser.appointments.upcoming.map((appointment) => (
                  <div key={appointment.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{appointment.patientName}</p>
                        <Badge variant={appointment.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                          {appointment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{appointment.type}</p>
                      <p className="text-xs text-muted-foreground">{appointment.date} at {appointment.time}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {appointment.status === 'pending' && (
                        <>
                          <Button size="sm" variant="default" className="text-xs px-2">Approve</Button>
                          <Button size="sm" variant="outline" className="text-xs px-2">Reject</Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" className="text-xs px-2">View Details</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Medical Notes & Prescriptions */}
          <TabsContent value="prescriptions" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Medical Notes & Prescriptions</h3>
              </div>
              
              {/* Prescription Templates */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-medium">Prescription Templates</h4>
                  <Button size="sm" className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {mockUser.prescriptionTemplates.map((template) => (
                    <div key={template.id} className="p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                        <h5 className="font-medium">{template.name}</h5>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" className="text-xs px-2">Edit</Button>
                          <Button size="sm" variant="outline" className="text-xs px-2">Use</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium">Medications:</p>
                          <ul className="text-xs text-muted-foreground list-disc list-inside">
                            {template.medications.map((med, index) => (
                              <li key={index}>{med}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Instructions:</p>
                          <p className="text-xs text-muted-foreground">{template.instructions}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Case/Patient History */}
          <TabsContent value="history" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Case/Patient History</h3>
              </div>
              
              {/* Search and Stats */}
              <div className="space-y-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input placeholder="Search patient by name or ID..." className="flex-1" />
                  <Button variant="outline" className="w-full sm:w-auto">Search</Button>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <div className="text-xl sm:text-2xl font-bold text-medical">{mockUser.patientHistory.totalPatients}</div>
                    <div className="text-xs text-muted-foreground">Total Patients</div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <div className="text-xl sm:text-2xl font-bold text-caution">{mockUser.patientHistory.activeCases}</div>
                    <div className="text-xs text-muted-foreground">Active Cases</div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg text-center sm:col-span-1 col-span-2">
                    <div className="text-xl sm:text-2xl font-bold text-stable">{mockUser.patientHistory.recentPatients.length}</div>
                    <div className="text-xs text-muted-foreground">Recent Visits</div>
                  </div>
                </div>
              </div>
              
              {/* Recent Patients */}
              <div className="space-y-3">
                <h4 className="font-medium">Recent Patients</h4>
                {mockUser.patientHistory.recentPatients.map((patient) => (
                  <div key={patient.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{patient.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {patient.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{patient.condition}</p>
                      <p className="text-xs text-muted-foreground">Last visit: {patient.lastVisit}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" className="text-xs px-2">View History</Button>
                      <Button size="sm" variant="outline" className="text-xs px-2">Add Note</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="h-5 w-5" />
                <h3 className="text-lg font-semibold">System Preferences</h3>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Language</p>
                    <p className="text-sm text-muted-foreground">Choose your preferred language</p>
                  </div>
                  <Select defaultValue="english">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="hindi">Hindi</SelectItem>
                      <SelectItem value="marathi">Marathi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dark Mode</p>
                    <p className="text-sm text-muted-foreground">Toggle dark mode interface</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive appointment booking alerts via email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive appointment alerts via SMS</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              
              <Button className="mt-6">
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trash2 className="h-5 w-5 text-destructive" />
                <h3 className="text-lg font-semibold">Account Management</h3>
              </div>
              
              <div className="space-y-6">
                <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <h4 className="font-medium text-destructive mb-2">Deactivate Account</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Temporarily deactivate your account. This action requires admin approval and can be reversed.
                  </p>
                  <Button variant="destructive" size="sm">
                    Request Deactivation
                  </Button>
                </div>
                
                <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
                  <h4 className="font-medium text-destructive mb-2">Delete Account</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                    We recommend exporting your data before deletion.
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm">
                      Export Data
                    </Button>
                    <Button variant="destructive" size="sm">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Logout */}
        <Card className="p-4">
          <Button variant="destructive" className="w-full" size="lg">
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </Button>
        </Card>
      </div>

      <BottomBar />
    </div>
  );
}