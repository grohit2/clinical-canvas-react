import { Toaster } from "@shared/components/ui/toaster";
import { Toaster as Sonner } from "@shared/components/ui/sonner";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SpeedInsights } from '@vercel/speed-insights/react';

// App-level components
import { UnsavedChangesGuard } from "@app/guards";
import { MinimalShell } from "@app/layout";
import { NotFound } from "@app/NotFound";

// Feature imports
import { DashboardPage } from "@features/dashboard";
import { PatientsListPage } from "@features/patient-list";
import { PatientRegistrationPage, AddMrnPage } from "@features/patient-registration";
import { AddNotePage, EditNotePage, NoteDetailPage } from "@features/patient-notes";
import { AddMedicationPage, EditMedicationPage } from "@features/patient-medications";
import { AddTaskPage, EditTaskPage } from "@features/patient-tasks";
import { TasksPage, TasksDuePage, UrgentAlertsPage, CompletedTodayPage } from "@features/tasks";
import { ProfilePage } from "@features/profile";
import { ReferralsPage } from "@features/referrals";
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

// Pages not yet migrated to features (will be refactored later)
import PatientDetail from "@/pages/PatientDetail";
import PatientQRView from "@/pages/PatientQRView";
import DischargeSummaryPage from "@/pages/DischargeSummary";

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
            <Route path="/patients" element={<PatientsListPage />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            {/* Documents routes */}
            <Route path="/patients/:id/docs" element={<DocumentsRootPage />} />
            <Route path="/patients/:id/docs/:category" element={<DocumentsFolderPage />} />
            {/* Redirect old /documents path to new /docs */}
            <Route path="/patients/:id/documents" element={<DocumentsRootPage />} />
            <Route path="/patients/:id/add-note" element={<AddNotePage />} />
            <Route path="/patients/:id/notes/:noteId" element={<NoteDetailPage />} />
            <Route path="/patients/:id/notes/:noteId/edit" element={<EditNotePage />} />
            <Route path="/patients/:id/add-med" element={<AddMedicationPage />} />
            <Route path="/patients/:id/add-task" element={<AddTaskPage />} />
            <Route path="/patients/:id/tasks/:taskId/edit" element={<EditTaskPage />} />
            <Route path="/patients/:id/meds/:medId/edit" element={<EditMedicationPage />} />
            <Route path="/patients/:id/mrn-add" element={<AddMrnPage />} />
            {/* Workflow routes */}
            <Route path="/patients/:id/admission" element={<AdmissionPage />} />
            <Route path="/patients/:id/pre-op" element={<PreOpPage />} />
            <Route path="/patients/:id/ot" element={<OTPage />} />
            <Route path="/patients/:id/post-op" element={<PostOpPage />} />
            <Route path="/patients/:id/discharge" element={<DischargePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks-due" element={<TasksDuePage />} />
            <Route path="/urgent-alerts" element={<UrgentAlertsPage />} />
            <Route path="/completed-today" element={<CompletedTodayPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/referrals" element={<ReferralsPage />} />
          </Route>

          {/* Patient registration routes with unsaved changes guard */}
          <Route path="/patients/add" element={<ProtectedPatientRegistration />} />
          <Route path="/patients/:id/edit" element={<ProtectedPatientRegistration />} />

          {/* Discharge summary - outside shell for sticky sidebar */}
          <Route path="/patients/:id/discharge-summary" element={<DischargeSummaryPage />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
