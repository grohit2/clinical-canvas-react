import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RequireAuth from "@/components/auth/RequireAuth";
import RequireApproved from "@/components/auth/RequireApproved";
import Login from "@/pages/Login";
import { SpeedInsights } from '@vercel/speed-insights/react';
import Dashboard from "./pages/Dashboard";
import PatientsList from "./pages/PatientsList";
import PatientDetail from "./pages/PatientDetail";
import Tasks from "./pages/Tasks";
import TasksDue from "./pages/TasksDue";
import UrgentAlerts from "./pages/UrgentAlerts";
import CompletedToday from "./pages/CompletedToday";
import Profile from "./pages/Profile";
import PatientQRView from "./pages/PatientQRView";
import AddNote from "./pages/AddNote";
import AddMedication from "./pages/AddMedication";
import AddTask from "./pages/AddTask";
import EditPatient from "./pages/EditPatient";
import EditTask from "./pages/EditTask";
import EditNote from "./pages/EditNote";
import EditMedication from "./pages/EditMedication";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SpeedInsights />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/qr/:id" element={<PatientQRView />} />
          <Route path="/" element={<RequireAuth><RequireApproved><Dashboard /></RequireApproved></RequireAuth>} />
          <Route path="/patients" element={<RequireAuth><RequireApproved><PatientsList /></RequireApproved></RequireAuth>} />
          <Route path="/patients/:id" element={<RequireAuth><RequireApproved><PatientDetail /></RequireApproved></RequireAuth>} />
          <Route path="/patients/:id/edit" element={<RequireAuth><RequireApproved><EditPatient /></RequireApproved></RequireAuth>} />
          <Route path="/patients/:id/add-note" element={<RequireAuth><RequireApproved><AddNote /></RequireApproved></RequireAuth>} />
          <Route path="/patients/:id/notes/:noteId/edit" element={<RequireAuth><RequireApproved><EditNote /></RequireApproved></RequireAuth>} />
          <Route path="/patients/:id/add-med" element={<RequireAuth><RequireApproved><AddMedication /></RequireApproved></RequireAuth>} />
          <Route path="/patients/:id/add-task" element={<RequireAuth><RequireApproved><AddTask /></RequireApproved></RequireAuth>} />
          <Route path="/patients/:id/tasks/:taskId/edit" element={<RequireAuth><RequireApproved><EditTask /></RequireApproved></RequireAuth>} />
          <Route path="/patients/:id/meds/:medId/edit" element={<RequireAuth><RequireApproved><EditMedication /></RequireApproved></RequireAuth>} />
          <Route path="/tasks" element={<RequireAuth><RequireApproved><Tasks /></RequireApproved></RequireAuth>} />
          <Route path="/tasks-due" element={<RequireAuth><RequireApproved><TasksDue /></RequireApproved></RequireAuth>} />
          <Route path="/urgent-alerts" element={<RequireAuth><RequireApproved><UrgentAlerts /></RequireApproved></RequireAuth>} />
          <Route path="/completed-today" element={<RequireAuth><RequireApproved><CompletedToday /></RequireApproved></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><RequireApproved><Profile /></RequireApproved></RequireAuth>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
