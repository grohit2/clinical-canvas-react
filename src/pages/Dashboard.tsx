import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { KPITile } from "@/components/dashboard/KPITile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { mockPatients, mockTasks, mockNotifications } from "@/data/mockData";
import { Calendar, Users, Activity, Clock, AlertTriangle, CheckCircle2, Bell, UserCheck, Stethoscope, HeartPulse, BrainCircuit } from "lucide-react";

const mockStageHeatMap = [
  { stage: 'Pre-Op', count: 8, variant: 'caution' as const },
  { stage: 'Surgery', count: 3, variant: 'urgent' as const },
  { stage: 'Post-Op', count: 12, variant: 'stable' as const },
  { stage: 'Recovery', count: 15, variant: 'default' as const },
  { stage: 'Discharge', count: 9, variant: 'stable' as const }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate KPIs from mock data
  const totalPatients = mockPatients.length;
  const pendingTasks = mockTasks.filter(task => task.status === 'open' || task.status === 'in-progress').length;
  const urgentCases = mockPatients.filter(patient => patient.priority === 'urgent' || patient.priority === 'high').length;
  const completedToday = mockTasks.filter(task => task.status === 'done').length;

  // Pathway distribution
  const surgicalCount = mockPatients.filter(p => p.pathway === 'surgical').length;
  const consultationCount = mockPatients.filter(p => p.pathway === 'consultation').length;
  const emergencyCount = mockPatients.filter(p => p.pathway === 'emergency').length;

  // Task distribution by role
  const doctorTasks = mockTasks.filter(task => task.assigneeRole === 'doctor').length;
  const nurseTasks = mockTasks.filter(task => task.assigneeRole === 'nurse').length;
  const labTasks = mockTasks.filter(task => task.assigneeRole === 'lab').length;

  // Recent urgent notifications
  const urgentNotifications = mockNotifications
    .filter(notif => notif.priority === 'urgent' || notif.priority === 'high')
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        title="Dashboard" 
        notificationCount={mockNotifications.filter(n => !n.read).length}
      />
      
      <div className="p-4 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="staff">Staff View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* KPI Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPITile 
                title="Total Patients"
                value={totalPatients}
                icon={Users}
                trend={{ value: 3, isPositive: true }}
              />
              <KPITile 
                title="Pending Tasks"
                value={pendingTasks}
                icon={Clock}
                variant="caution"
              />
              <KPITile 
                title="Urgent Cases"
                value={urgentCases}
                icon={AlertTriangle}
                variant="urgent"
              />
              <KPITile 
                title="Completed Today"
                value={completedToday}
                icon={CheckCircle2}
                variant="stable"
                trend={{ value: 6, isPositive: true }}
              />
            </div>

            {/* Pathway Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Patient Pathways
                </CardTitle>
                <CardDescription>Current patient distribution across care pathways</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-medical rounded-full"></div>
                      <span className="text-sm">Surgical ({surgicalCount})</span>
                    </div>
                    <span className="text-sm font-medium">{Math.round((surgicalCount / totalPatients) * 100)}%</span>
                  </div>
                  <Progress value={(surgicalCount / totalPatients) * 100} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-caution rounded-full"></div>
                      <span className="text-sm">Consultation ({consultationCount})</span>
                    </div>
                    <span className="text-sm font-medium">{Math.round((consultationCount / totalPatients) * 100)}%</span>
                  </div>
                  <Progress value={(consultationCount / totalPatients) * 100} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-urgent rounded-full"></div>
                      <span className="text-sm">Emergency ({emergencyCount})</span>
                    </div>
                    <span className="text-sm font-medium">{Math.round((emergencyCount / totalPatients) * 100)}%</span>
                  </div>
                  <Progress value={(emergencyCount / totalPatients) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Recent Alerts
                </CardTitle>
                <CardDescription>Latest high-priority notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {urgentNotifications.map((notification) => {
                  const patient = mockPatients.find(p => p.id === notification.patientId);
                  return (
                    <div key={notification.id} className="flex items-center justify-between p-3 bg-urgent/10 rounded-lg border border-urgent/20">
                      <div>
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {patient ? `Patient: ${patient.name}` : notification.message}
                        </p>
                      </div>
                      <Badge variant={notification.priority === 'urgent' ? 'destructive' : 'outline'}>
                        {notification.priority}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="operations" className="space-y-6 mt-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Operations Dashboard
                </CardTitle>
                <CardDescription>Day overview and operational controls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start" onClick={() => navigate('/patients')}>
                    <Users className="h-4 w-4 mr-2" />
                    View All Patients
                  </Button>
                  <Button variant="outline" className="justify-start" onClick={() => navigate('/tasks')}>
                    <Clock className="h-4 w-4 mr-2" />
                    Pending Tasks
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Urgent Alerts
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Today's Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bed Occupancy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Occupied</span>
                      <span className="font-semibold">{totalPatients}/30</span>
                    </div>
                    <Progress value={(totalPatients / 30) * 100} className="h-3" />
                    <p className="text-sm text-muted-foreground">{Math.round((totalPatients / 30) * 100)}% occupancy rate</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Today's Procedures</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Completed</span>
                      <span className="font-semibold">3/5</span>
                    </div>
                    <Progress value={60} className="h-3" />
                    <p className="text-sm text-muted-foreground">2 surgeries remaining</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="staff" className="space-y-6 mt-6">
            {/* Staff Workload Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Stethoscope className="h-5 w-5" />
                    Doctor Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-medical">{doctorTasks}</div>
                    <p className="text-sm text-muted-foreground">Active tasks</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserCheck className="h-5 w-5" />
                    Nurse Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-caution">{nurseTasks}</div>
                    <p className="text-sm text-muted-foreground">Active tasks</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BrainCircuit className="h-5 w-5" />
                    Lab Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-stable">{labTasks}</div>
                    <p className="text-sm text-muted-foreground">Active tasks</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Staff Quick Access */}
            <Card>
              <CardHeader>
                <CardTitle>Staff Management</CardTitle>
                <CardDescription>Quick access to staff dashboards and information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start">
                    <Stethoscope className="h-4 w-4 mr-2" />
                    Doctor Dashboard
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Nurse Dashboard
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <HeartPulse className="h-4 w-4 mr-2" />
                    On-Call Schedule
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Staff Assignments
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomBar />
    </div>
  );
}