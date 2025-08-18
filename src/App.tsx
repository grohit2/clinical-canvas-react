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
import Login from "./pages/Login";
import AdminApprovalPage from "./pages/AdminApproval";
import { useAuth } from "./hooks/use-firebase-auth";
import { useApprovalCheck } from "./hooks/use-approval-check";
import { Navigate, useLocation } from "react-router-dom";


const queryClient = new QueryClient();

function RequireAuth({ children }: { children: JSX.Element }) {
  const user = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}


const App = () => {
  const checkingApproval = useApprovalCheck();
  if (checkingApproval) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-4 text-lg">Checking approval status...</span>
      </div>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SpeedInsights />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin-approval" element={<AdminApprovalPage />} />
            <Route path="/qr/:id" element={
              <RequireAuth><PatientQRView /></RequireAuth>
            } />
            <Route path="/" element={
              <RequireAuth><Dashboard /></RequireAuth>
            } />
            <Route path="/patients" element={
              <RequireAuth><PatientsList /></RequireAuth>
            } />
            <Route path="/patients/:id" element={
              <RequireAuth><PatientDetail /></RequireAuth>
            } />
            <Route path="/patients/:id/edit" element={
              <RequireAuth><EditPatient /></RequireAuth>
            } />
            <Route path="/patients/:id/add-note" element={
              <RequireAuth><AddNote /></RequireAuth>
            } />
            <Route path="/patients/:id/notes/:noteId/edit" element={
              <RequireAuth><EditNote /></RequireAuth>
            } />
            <Route path="/patients/:id/add-med" element={
              <RequireAuth><AddMedication /></RequireAuth>
            } />
            <Route path="/patients/:id/add-task" element={
              <RequireAuth><AddTask /></RequireAuth>
            } />
            <Route path="/patients/:id/tasks/:taskId/edit" element={
              <RequireAuth><EditTask /></RequireAuth>
            } />
            <Route path="/patients/:id/meds/:medId/edit" element={
              <RequireAuth><EditMedication /></RequireAuth>
            } />
            <Route path="/tasks" element={
              <RequireAuth><Tasks /></RequireAuth>
            } />
            <Route path="/tasks-due" element={
              <RequireAuth><TasksDue /></RequireAuth>
            } />
            <Route path="/urgent-alerts" element={
              <RequireAuth><UrgentAlerts /></RequireAuth>
            } />
            <Route path="/completed-today" element={
              <RequireAuth><CompletedToday /></RequireAuth>
            } />
            <Route path="/profile" element={
              <RequireAuth><Profile /></RequireAuth>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
