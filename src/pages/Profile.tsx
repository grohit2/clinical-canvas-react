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
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <Header title="Profile" />
      
      <div className="p-4 space-y-6 max-w-full overflow-x-hidden">
        {/* User Info Card */}
        <Card className="p-6">
          <div className="flex items-start gap-6 mb-6">
            <Avatar className="h-20 w-20 shadow-sm">
              <AvatarFallback className="text-xl font-semibold bg-medical/10 text-medical">
                {mockUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold text-foreground leading-tight">{mockUser.name}</h2>
                <Button variant="outline" size="sm" className="flex-shrink-0 ml-3">
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Scanner
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-lg text-muted-foreground font-medium">{mockUser.department}</p>
                <Badge variant="outline" className="capitalize text-sm px-3 py-1">
                  {mockUser.role}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">Email:</span>
              </div>
              <span className="font-medium text-foreground break-all ml-4">{mockUser.email}</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">Phone:</span>
              </div>
              <span className="font-medium text-foreground">{mockUser.phone}</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">Shift:</span>
              </div>
              <span className="font-medium text-foreground text-right">{mockUser.shift}</span>
            </div>
          </div>

          {/* Permissions */}
          <div className="mt-6 pt-4 border-t border-border/50">
            <span className="text-sm text-muted-foreground font-medium">Permissions:</span>
            <div className="flex flex-wrap gap-2 mt-3">
              {mockUser.permissions.map((permission) => (
                <Badge key={permission} variant="secondary" className="capitalize text-xs px-3 py-1">
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