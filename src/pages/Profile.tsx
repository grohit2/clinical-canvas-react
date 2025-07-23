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
  department: 'Surgery',
  email: 'sarah.wilson@hospital.com',
  phone: '+1-555-0789',
  shift: 'Day Shift (7AM - 7PM)',
  permissions: ['prescribe', 'approve', 'admin'],
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
    profilePicture: null
  },
  professionalInfo: {
    specialization: 'Cardiothoracic Surgery',
    yearsOfExperience: 15,
    qualifications: ['MBBS', 'MS (General Surgery)', 'MCh (Cardiothoracic Surgery)'],
    medicalRegistrationNumber: 'MCI-12345-2010',
    workingHospital: 'City General Hospital - Cardiac Wing',
    consultationFee: 500
  },
  availability: {
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    timeSlots: [
      { start: '10:00', end: '13:00', label: 'Morning' },
      { start: '17:00', end: '20:00', label: 'Evening' }
    ],
    maxPatientsPerSlot: 8
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

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9">
            <TabsTrigger value="personal" className="flex items-center gap-1 text-xs">
              <User className="h-3 w-3" />
              <span className="hidden sm:inline">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="professional" className="flex items-center gap-1 text-xs">
              <Stethoscope className="h-3 w-3" />
              <span className="hidden sm:inline">Professional</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-1 text-xs">
              <CalendarIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">Appointments</span>
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3" />
              <span className="hidden sm:inline">Prescriptions</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 text-xs">
              <History className="h-3 w-3" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1 text-xs">
              <Lock className="h-3 w-3" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-1 text-xs">
              <Palette className="h-3 w-3" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-1 text-xs">
              <Trash2 className="h-3 w-3" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>

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
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Professional Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input id="specialization" defaultValue={mockUser.professionalInfo.specialization} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" defaultValue={mockUser.department} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input id="experience" type="number" defaultValue={mockUser.professionalInfo.yearsOfExperience} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Medical Registration Number</Label>
                  <Input id="registrationNumber" defaultValue={mockUser.professionalInfo.medicalRegistrationNumber} />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="qualifications">Qualifications</Label>
                  <Textarea 
                    id="qualifications" 
                    defaultValue={mockUser.professionalInfo.qualifications.join(', ')}
                    placeholder="Enter qualifications separated by commas"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hospital">Working Hospital/Branch</Label>
                  <Input id="hospital" defaultValue={mockUser.professionalInfo.workingHospital} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="consultationFee">Consultation Fee (₹)</Label>
                  <Input id="consultationFee" type="number" defaultValue={mockUser.professionalInfo.consultationFee} />
                </div>
              </div>
              
              <Button className="mt-6">
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

          {/* Other tabs with placeholder content */}
          <TabsContent value="appointments" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Appointment Management</h3>
              <p className="text-muted-foreground">View and manage your upcoming appointments, approve/reject requests, and access patient details.</p>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Medical Notes & Prescriptions</h3>
              <p className="text-muted-foreground">Manage prescription templates, auto-suggest medications, and write e-prescriptions.</p>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Case/Patient History</h3>
              <p className="text-muted-foreground">Search patients, view visit history, prescriptions, and lab reports.</p>
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