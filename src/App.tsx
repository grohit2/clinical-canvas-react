import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
          <Route path="/qr/:id" element={<PatientQRView />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<PatientsList />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/patients/:id/edit" element={<EditPatient />} />
          <Route path="/patients/:id/add-note" element={<AddNote />} />
          <Route path="/patients/:id/notes/:noteId/edit" element={<EditNote />} />
          <Route path="/patients/:id/add-med" element={<AddMedication />} />
          <Route path="/patients/:id/add-task" element={<AddTask />} />
          <Route path="/patients/:id/tasks/:taskId/edit" element={<EditTask />} />
          <Route path="/patients/:id/meds/:medId/edit" element={<EditMedication />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks-due" element={<TasksDue />} />
          <Route path="/urgent-alerts" element={<UrgentAlerts />} />
          <Route path="/completed-today" element={<CompletedToday />} />
          <Route path="/profile" element={<Profile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
