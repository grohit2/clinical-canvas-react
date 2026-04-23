import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FormProvider } from "react-hook-form";
import { Check, ArrowLeft } from "lucide-react";

import { usePatientRegistrationForm } from "../model/usePatientRegistrationForm";
import {
  PatientIdentitySection,
  RegistrationSection,
  MedicalDetailsSection,
  FilesPrioritySection,
  EmergencyContactSection,
} from "./sections";
import { paths } from "@app/navigation";

const categories = [
  { id: "patient-details", title: "PD", mandatory: true },
  { id: "registration", title: "REG", mandatory: true },
  { id: "medical-details", title: "MD", mandatory: false },
  { id: "files-priority", title: "FILES", mandatory: false },
  { id: "emergency-contact", title: "EMER CONTACT", mandatory: false },
];

export function PatientRegistrationPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { form, onSubmit, isLoading, isEditMode, patientQuery } =
    usePatientRegistrationForm(patientId);

  const [activeSection, setActiveSection] = useState("patient-details");

  const handleBack = () => {
    if (isEditMode && patientId) {
      navigate(paths.patient(patientId));
    } else {
      navigate(paths.patients());
    }
  };

  const { formState } = form;
  const { isValid, isDirty, errors } = formState;

  // Check mandatory fields completion for floating button
  const name = form.watch("name");
  const age = form.watch("age");
  const sex = form.watch("sex");
  const scheme = form.watch("scheme");
  const mrn = form.watch("mrn");
  const department = form.watch("department");
  const pathway = form.watch("pathway");

  const mandatoryComplete = isEditMode
    ? Boolean(name?.trim() && age && sex)
    : Boolean(
        name?.trim() &&
          age &&
          sex &&
          scheme &&
          mrn?.trim() &&
          department?.trim() &&
          pathway
      );

  const getSectionCompletionStatus = (sectionId: string) => {
    switch (sectionId) {
      case "patient-details":
        return Boolean(name && age && sex);
      case "registration":
        return Boolean(scheme && (isEditMode || mrn) && department);
      case "medical-details":
        return Boolean(pathway || form.watch("diagnosis") || form.watch("assignedDoctor"));
      case "files-priority":
        return Boolean(form.watch("filesUrl") || form.watch("isUrgent"));
      case "emergency-contact":
        return Boolean(
          form.watch("emergencyContact.name") || form.watch("emergencyContact.phone")
        );
      default:
        return false;
    }
  };

  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const y = rect.top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const viewport = window.innerHeight;
      if (scrollTop + viewport >= docHeight - 50) {
        setActiveSection("emergency-contact");
        return;
      }

      const sections = [
        "patient-details",
        "registration",
        "medical-details",
        "files-priority",
        "emergency-contact",
      ];

      let currentSection = sections[0];
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 150) currentSection = sectionId;
      }
      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  // Loading state for edit mode
  if (isEditMode && patientQuery?.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (isEditMode && patientQuery?.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Failed to load patient data</p>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <div className="flex bg-gray-50">
        {/* Left Sidebar */}
        <div className="w-20 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
          <div className="p-2 flex-1">
            {categories.map((category) => {
              const isActive = activeSection === category.id;
              const isCompleted = getSectionCompletionStatus(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => handleScrollToSection(category.id)}
                  className={`w-full flex flex-col items-center p-3 mb-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-blue-50 border-2 border-blue-200 text-blue-700"
                      : "hover:bg-gray-50 border-2 border-transparent text-gray-700"
                  }`}
                >
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      {isCompleted && <Check size={12} className="text-green-500" />}
                    </div>
                    <span className="font-medium text-xs leading-tight text-center">
                      {category.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 pb-28">
          {/* Header with back button */}
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">
              {isEditMode ? "Edit Patient" : "Add New Patient"}
            </h1>
          </div>

          <div className="max-w-xl space-y-12">
            <PatientIdentitySection />
            <RegistrationSection isEditMode={isEditMode} patientId={patientId} />
            <MedicalDetailsSection />
            <FilesPrioritySection />
            <EmergencyContactSection />
          </div>
        </div>

        {/* Floating Action Button */}
        {mandatoryComplete && (
          <button
            type="button"
            onClick={() => {
              console.log("🔘 [BUTTON] Done button clicked!");
              console.log("🔘 [BUTTON] isLoading:", isLoading);
              console.log("🔘 [BUTTON] mandatoryComplete:", mandatoryComplete);
              console.log("🔘 [BUTTON] Form isDirty:", isDirty);
              console.log("🔘 [BUTTON] Form isValid:", isValid);
              console.log("🔘 [BUTTON] Form errors:", errors);
              onSubmit();
            }}
            disabled={isLoading}
            className={`fixed bottom-8 right-8 ${
              isLoading ? "opacity-70 cursor-not-allowed" : ""
            } bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all flex items-center space-x-2 z-50`}
          >
            <Check size={20} />
            <span className="font-semibold">
              {isLoading ? (isEditMode ? "Updating..." : "Adding...") : "Done"}
            </span>
          </button>
        )}
      </div>
    </FormProvider>
  );
}
