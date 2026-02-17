# Patient Detail Runtime - Web Feature Module
src/domains/patient-detail/DEPENDENCIES.md
src/domains/patient-detail/README.md
src/domains/patient-detail/api/usePatient.ts
src/domains/patient-detail/api/usePatientLabs.ts
src/domains/patient-detail/api/useUpdatePatient.ts
src/domains/patient-detail/components/ArcSpeedDial.tsx
src/domains/patient-detail/components/LabsOverviewCard.tsx
src/domains/patient-detail/components/MedsTab.tsx
src/domains/patient-detail/components/MrnEditor.tsx
src/domains/patient-detail/components/MrnOverview.tsx
src/domains/patient-detail/components/NotesTab.tsx
src/domains/patient-detail/components/PatientHeader.tsx
src/domains/patient-detail/components/PatientQRView.tsx
src/domains/patient-detail/components/PatientTabs.tsx
src/domains/patient-detail/components/TasksTab.tsx
src/domains/patient-detail/components/Timeline.tsx
src/domains/patient-detail/components/UpdateRing.tsx
src/domains/patient-detail/components/zones/BlueZone.tsx
src/domains/patient-detail/components/zones/GreenZone.tsx
src/domains/patient-detail/components/zones/RedZone.tsx
src/domains/patient-detail/components/zones/YellowZone.tsx
src/domains/patient-detail/core/labs.ts
src/domains/patient-detail/core/payload.ts
src/domains/patient-detail/core/timeline.ts
src/domains/patient-detail/core/types.ts
src/domains/patient-detail/core/validation.ts
src/domains/patient-detail/core/vitals.ts
src/domains/patient-detail/hooks/usePatientTabs.ts
src/domains/patient-detail/hooks/useZoneData.ts
src/domains/patient-detail/index.ts
src/domains/patient-detail/screens/PatientDetailScreen.tsx

# Patient Detail Routes and Entry Points
src/app/App.tsx
src/app/navigation.ts
apps/mobile/app/(tabs)/patients/[id]/index.tsx
apps/mobile/app/patient/[id]/index.tsx

# Patient Detail Public APIs and Barrels
src/domains/patient-detail/index.ts

# Patient Detail Cross-Feature Consumers
src/domains/patient-list/screens/PatientListScreen.tsx
src/domains/dashboard/screens/DashboardScreen.tsx
apps/mobile/app/(tabs)/patients.tsx
apps/mobile/src/domains/patient-registration/hooks/usePatientRegistrationForm.ts

# Patient Detail Dependency Chain
src/lib/api.ts
src/shared/lib/api.ts
src/shared/types/api.ts
apps/mobile/src/hooks/usePatients.ts
apps/mobile/src/navigation/tabBarStyle.ts
