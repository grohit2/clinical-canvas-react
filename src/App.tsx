import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { SpeedInsights } from '@vercel/speed-insights/react';
import { DashboardPage } from "@features/dashboard";
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
import { PatientRegistrationPage } from "@features/patient-registration";
import {
  AdmissionPage,
  PreOpPage,
  OTPage,
  PostOpPage,
  DischargePage,
} from "@features/patient-workflow";
import {
  DocumentsRootPage,
  DocumentsFolderPage,
} from "@features/patient-documents";
import { UnsavedChangesGuard } from "@/app/guards";
import { MinimalShell } from "@/app/layout";
import EditTask from "./pages/EditTask";
import EditNote from "./pages/EditNote";
import EditMedication from "./pages/EditMedication";
import NotFound from "./pages/NotFound";
import NoteDetail from "./pages/NoteDetail";
import DischargeSummaryPage from "./pages/DischargeSummary";
import AddMrn from "./pages/AddMrn";
import { ReferralsPage } from "@features/referrals";

// Wrapper for PatientRegistrationPage with unsaved changes guard
function ProtectedPatientRegistration() {
  return (
    <UnsavedChangesGuard
      title="Discard changes?"
      message="You have unsaved patient information. Are you sure you want to leave?"
      confirmLabel="Discard"
      cancelLabel="Keep Editing"
    >
      <PatientRegistrationPage />
    </UnsavedChangesGuard>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SpeedInsights />
      <BrowserRouter>
        <Routes>
          {/* QR view - no shell (fullscreen) */}
          <Route path="/qr/:id" element={<PatientQRView />} />

          {/* Main app routes with MinimalShell (pages manage their own headers) */}
          <Route element={<MinimalShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientsList />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            {/* Documents routes */}
            <Route path="/patients/:id/docs" element={<DocumentsRootPage />} />
            <Route path="/patients/:id/docs/:category" element={<DocumentsFolderPage />} />
            {/* Redirect old /documents path to new /docs */}
            <Route path="/patients/:id/documents" element={<DocumentsRootPage />} />
            <Route path="/patients/:id/discharge-summary" element={<DischargeSummaryPage />} />
            <Route path="/patients/:id/add-note" element={<AddNote />} />
            <Route path="/patients/:id/notes/:noteId" element={<NoteDetail />} />
            <Route path="/patients/:id/notes/:noteId/edit" element={<EditNote />} />
            <Route path="/patients/:id/add-med" element={<AddMedication />} />
            <Route path="/patients/:id/add-task" element={<AddTask />} />
            <Route path="/patients/:id/tasks/:taskId/edit" element={<EditTask />} />
            <Route path="/patients/:id/meds/:medId/edit" element={<EditMedication />} />
            <Route path="/patients/:id/mrn-add" element={<AddMrn />} />
            {/* Workflow routes */}
            <Route path="/patients/:id/admission" element={<AdmissionPage />} />
            <Route path="/patients/:id/pre-op" element={<PreOpPage />} />
            <Route path="/patients/:id/ot" element={<OTPage />} />
            <Route path="/patients/:id/post-op" element={<PostOpPage />} />
            <Route path="/patients/:id/discharge" element={<DischargePage />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks-due" element={<TasksDue />} />
            <Route path="/urgent-alerts" element={<UrgentAlerts />} />
            <Route path="/completed-today" element={<CompletedToday />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/referrals" element={<ReferralsPage />} />
          </Route>

          {/* Patient registration routes with unsaved changes guard */}
          <Route path="/patients/add" element={<ProtectedPatientRegistration />} />
          <Route path="/patients/:id/edit" element={<ProtectedPatientRegistration />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
