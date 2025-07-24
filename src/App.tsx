import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import React, { Suspense } from "react";

// Lazy load all page components for code splitting
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const PatientsList = React.lazy(() => import("./pages/PatientsList"));
const PatientDetail = React.lazy(() => import("./pages/PatientDetail"));
const Tasks = React.lazy(() => import("./pages/Tasks"));
const TasksDue = React.lazy(() => import("./pages/TasksDue"));
const UrgentAlerts = React.lazy(() => import("./pages/UrgentAlerts"));
const CompletedToday = React.lazy(() => import("./pages/CompletedToday"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Login = React.lazy(() => import("./pages/Login"));
const PatientQRView = React.lazy(() => import("./pages/PatientQRView"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/qr/:id" element={<PatientQRView />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patients"
                element={
                  <ProtectedRoute>
                    <PatientsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patients/:id"
                element={
                  <ProtectedRoute>
                    <PatientDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <Tasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks-due"
                element={
                  <ProtectedRoute>
                    <TasksDue />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/urgent-alerts"
                element={
                  <ProtectedRoute>
                    <UrgentAlerts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/completed-today"
                element={
                  <ProtectedRoute>
                    <CompletedToday />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
