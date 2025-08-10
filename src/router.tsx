import React from "react";
import PatientsList from "@/pages/PatientsList";
import PatientDetail from "@/pages/PatientDetail";
import DoctorsList from "@/pages/DoctorsList";
import Tasks from "@/pages/Tasks";

export const routes = [
  { path: "/", element: <PatientsList /> },
  { path: "/patients", element: <PatientsList /> },
  { path: "/patients/:id", element: <PatientDetail /> },
  { path: "/doctors", element: <DoctorsList /> },
  { path: "/tasks", element: <Tasks /> },
  { path: "*", element: <div className="p-6 text-sm text-muted-foreground">Not found</div> },
];