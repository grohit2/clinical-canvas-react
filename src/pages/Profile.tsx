import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, Bell, Shield, LogOut, Phone, Mail, Clock, QrCode } from "lucide-react";

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
  }
};

export default function Profile() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Profile" />
      
      <div className="p-4 space-y-6">
        {/* User Info Card */}
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {mockUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold">{mockUser.name}</h2>
                <Button variant="outline" size="sm">
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-muted-foreground">{mockUser.department}</p>
              <Badge variant="outline" className="mt-1 capitalize">
                {mockUser.role}
              </Badge>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
              </div>
              <span className="font-medium break-all">{mockUser.email}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Phone:</span>
              </div>
              <span className="font-medium">{mockUser.phone}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Shift:</span>
              </div>
              <span className="font-medium text-right">{mockUser.shift}</span>
            </div>
          </div>

          {/* Permissions */}
          <div className="mt-4">
            <span className="text-sm text-muted-foreground">Permissions:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {mockUser.permissions.map((permission) => (
                <Badge key={permission} variant="secondary">
                  {permission}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Today's Stats */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Today's Activity</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-medical">{mockUser.stats.patientsToday}</div>
              <div className="text-xs text-muted-foreground">Patients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-stable">{mockUser.stats.tasksCompleted}</div>
              <div className="text-xs text-muted-foreground">Tasks Done</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-caution">{mockUser.stats.hoursWorked}</div>
              <div className="text-xs text-muted-foreground">Hours</div>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5" />
            <h3 className="font-semibold">Notifications</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Urgent Alerts</div>
                <div className="text-sm text-muted-foreground">Critical patient updates</div>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Task Reminders</div>
                <div className="text-sm text-muted-foreground">Upcoming task notifications</div>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Lab Results</div>
                <div className="text-sm text-muted-foreground">New lab result alerts</div>
              </div>
              <Switch />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Shift Updates</div>
                <div className="text-sm text-muted-foreground">Schedule and handoff notifications</div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* Settings Menu */}
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" size="lg">
            <Settings className="h-4 w-4 mr-3" />
            Account Settings
          </Button>
          
          <Button variant="outline" className="w-full justify-start" size="lg">
            <Shield className="h-4 w-4 mr-3" />
            Privacy & Security
          </Button>
          
          <Button variant="outline" className="w-full justify-start" size="lg">
            <Bell className="h-4 w-4 mr-3" />
            Notification Preferences
          </Button>
        </div>

        {/* Logout */}
        <Button variant="destructive" className="w-full" size="lg">
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>

      <BottomBar />
    </div>
  );
}