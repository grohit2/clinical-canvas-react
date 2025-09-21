import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Plus, Trash2, Star } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import type { Patient } from "@/types/api";
import { mapSexToApi, normalizePathway, normalizeComorbidities } from "@/components/patient/patinet_form/patient-create.adapter";

export default function EditPatient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] = useState("patient-details");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [formData, setFormData] = useState({
    // Patient Details
    name: "",
    age: "",
    sex: "", // "M" | "F" | "Other"

    // Multiple MRNs support - matches backend mrnHistory structure
    mrnHistory: [
      {
        mrn: "",
        scheme: "",
        date: ""
      }
    ],
    latestMrn: "",
    department: "",
    status: "ACTIVE",

    // Current state field
    currentState: "",

    // Medical Details
    diagnosis: "",
    comorbidities: [] as string[],
    pathway: "",

    // Assignment
    assignedDoctor: "",
    assignedDoctorId: "",

    // Files & Priority
    filesUrl: "",
    isUrgent: false as boolean,
    urgentReason: "",
    urgentUntil: "",

    // Emergency Contact
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
      altPhone: "",
      email: "",
      address: {
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      },
    },

    // Vitals
    vitals: {
      hr: "",
      systolic: "",
      diastolic: "",
      spo2: "",
      temp: "",
    },
  });

  // Track originally loaded latest MRN to detect changes
  const originalLatestMrnRef = useRef<string | null>(null);

  const categories = [
    { id: "patient-details", title: "PD", mandatory: true },
    { id: "registration", title: "REG", mandatory: true },
    { id: "medical-details", title: "MD", mandatory: false },
    { id: "assignment", title: "DOC", mandatory: false },
    { id: "files-priority", title: "FILES", mandatory: false },
    { id: "emergency-contact", title: "EMER", mandatory: false },
    { id: "vitals", title: "VITAL", mandatory: false },
  ];

  useEffect(() => {
    document.title = "Edit Patient | Clinical Canvas";
  }, []);

  useEffect(() => {
    if (!id) return;
    
    const loadPatientData = async () => {
      try {
        const patient = await api.patients.get(id);
        
        // Map patient data to form structure
        setFormData({
          name: patient.name || "",
          age: patient.age ? String(patient.age) : "",
          sex: patient.sex === "male" ? "M" : patient.sex === "female" ? "F" : patient.sex === "other" ? "Other" : "",
          
          mrnHistory: patient.mrnHistory && patient.mrnHistory.length > 0 
            ? patient.mrnHistory.map(entry => ({
                mrn: entry.mrn || "",
                scheme: entry.scheme || "",
                date: entry.date || ""
              }))
            : [{ mrn: patient.latestMrn || "", scheme: "", date: "" }],
          latestMrn: patient.latestMrn || "",
          department: patient.department || "",
          status: patient.status || "ACTIVE",
          
          currentState: patient.currentState || "",
          
          diagnosis: patient.diagnosis || "",
          comorbidities: patient.comorbidities || [],
          pathway: patient.pathway || "",
          
          assignedDoctor: patient.assignedDoctor || "",
          assignedDoctorId: patient.assignedDoctorId || "",
          
          filesUrl: patient.filesUrl || "",
          isUrgent: patient.isUrgent || false,
          urgentReason: patient.urgentReason || "",
          urgentUntil: patient.urgentUntil || "",
          
          emergencyContact: {
            name: patient.emergencyContact?.name || "",
            relationship: patient.emergencyContact?.relationship || "",
            phone: patient.emergencyContact?.phone || "",
            altPhone: "",
            email: "",
            address: {
              line1: "",
              line2: "",
              city: "",
              state: "",
              postalCode: "",
              country: "",
            },
          },
          
          vitals: {
            hr: patient.vitals?.hr ? String(patient.vitals.hr) : "",
            systolic: patient.vitals?.systolic ? String(patient.vitals.systolic) : "",
            diastolic: patient.vitals?.diastolic ? String(patient.vitals.diastolic) : "",
            spo2: patient.vitals?.spo2 ? String(patient.vitals.spo2) : "",
            temp: patient.vitals?.temp ? String(patient.vitals.temp) : patient.vitals?.temperature ? String(patient.vitals.temperature) : "",
          },
        });

        // remember original latest MRN for comparison on submit
        originalLatestMrnRef.current = patient.latestMrn || null;
        
        setLoading(false);
      } catch (error) {
        console.error("Failed to load patient data:", error);
        toast({
          title: "Error",
          description: "Failed to load patient data. Please try again.",
          variant: "destructive",
        });
        navigate("/patients");
      }
    };
    
    loadPatientData();
  }, [id, navigate, toast]);

  const handleInputChange = (path: string, value: any) => {
    setFormData(prev => {
      const newData: any = { ...prev };
      const keys = path.split(".");
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleArrayChange = (path: string, value: string) => {
    const items = value.split(",").map(item => item.trim()).filter(Boolean);
    handleInputChange(path, items);
  };

  // MRN management functions
  const addMrnEntry = () => {
    setFormData(prev => ({
      ...prev,
      mrnHistory: [
        ...prev.mrnHistory,
        {
          mrn: "",
          scheme: "",
          date: ""
        }
      ]
    }));
  };

  const updateMrnEntry = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      mrnHistory: prev.mrnHistory.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    }));
  };

  const removeMrnEntry = (index: number) => {
    if (formData.mrnHistory.length <= 1) return;

    setFormData(prev => {
      const newHistory = prev.mrnHistory.filter((_, i) => i !== index);
      const isValid = (e: { mrn: string; scheme: string }) => !!(e?.mrn && e?.scheme);
      const firstValid = newHistory.find(isValid);

      let newLatest = prev.latestMrn;
      const removedMrn = prev.mrnHistory[index]?.mrn || "";
      // If latest was removed or latest no longer exists in new history, pick first valid
      const latestStillExists = newHistory.some(e => e.mrn === prev.latestMrn);
      if (!latestStillExists || prev.latestMrn === removedMrn) {
        newLatest = firstValid?.mrn || "";
      }

      return {
        ...prev,
        mrnHistory: newHistory,
        latestMrn: newLatest,
      };
    });

    // Gentle nudge to save changes
    toast({
      title: "MRN removed",
      description: "Remember to Save Changes to persist.",
    });
  };

  const setCurrentMrn = (index: number) => {
    const currentDate = new Date().toISOString().slice(0, 10);
    setFormData(prev => ({
      ...prev,
      latestMrn: prev.mrnHistory[index]?.mrn || "",
      mrnHistory: prev.mrnHistory.map((entry, i) => ({
        ...entry,
        date: i === index ? currentDate : entry.date
      }))
    }));
  };

  // Keep latestMrn consistent with history edits
  useEffect(() => {
    setFormData(prev => {
      const latestInHistory = prev.mrnHistory.some(e => e.mrn === prev.latestMrn);
      if (latestInHistory) return prev;
      const firstValid = prev.mrnHistory.find(e => e.mrn && e.scheme);
      if (!firstValid && prev.latestMrn === "") return prev;
      return { ...prev, latestMrn: firstValid?.mrn || "" };
    });
  }, [formData.mrnHistory.length]);

  const getSectionCompletionStatus = (sectionId: string) => {
    switch (sectionId) {
      case "patient-details":
        return !!(formData.name && formData.age && formData.sex);
      case "registration":
        const hasValidMrnEntry = formData.mrnHistory.some(entry => 
          entry.scheme && entry.mrn
        );
        return !!(hasValidMrnEntry && formData.department);
      case "medical-details":
        return !!(formData.diagnosis);
      case "assignment":
        return !!(formData.assignedDoctor || formData.assignedDoctorId);
      case "files-priority":
        return !!(formData.filesUrl || formData.isUrgent);
      case "emergency-contact":
        return !!(formData.emergencyContact.name || formData.emergencyContact.phone);
      case "vitals":
        return !!(formData.vitals.hr || formData.vitals.systolic || formData.vitals.spo2 || formData.vitals.temp);
      default:
        return false;
    }
  };

  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element && scrollContainerRef.current) {
      const offsetTop = element.offsetTop - 20;
      scrollContainerRef.current.scrollTo({ top: offsetTop, behavior: "smooth" });
    }
  };

  const validateMandatoryFields = () => {
    const hasValidMrn = formData.mrnHistory.some(entry => entry.scheme && entry.mrn && entry.mrn.trim() !== "");
    return (
      formData.name.trim() !== "" &&
      formData.age !== "" &&
      formData.sex !== "" &&
      formData.department.trim() !== "" &&
      hasValidMrn
    );
  };

  const handleSubmit = async () => {
    if (!validateMandatoryFields()) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!id) return;

    try {
      setIsSubmitting(true);

      // Compute cleaned MRN history from form
      const cleanedHistory = (formData.mrnHistory || []).filter(e => e.mrn && e.mrn.trim());

      // Try one-shot overwrite first; if route not present in backend (404), fall back to two-step
      try {
        await api.patients.overwriteMrn(id, cleanedHistory as any);
      } catch (e: any) {
        console.error("Failed to overwrite MRN history:", e);
        const msg = (e && e.message) ? String(e.message) : '';
        // Fallback for either route missing OR server errors
        const shouldFallback = msg.toLowerCase().includes('route not found') || msg.toLowerCase().includes('internal server error');
        if (!shouldFallback) throw e;

        // Fallback: determine desired latest (highest date) and use existing endpoints
        const originalLatest = originalLatestMrnRef.current;
        let desiredLatest = formData.latestMrn?.trim() || '';
        if (!desiredLatest || !cleanedHistory.some(h => h.mrn === desiredLatest)) {
          const pick = [...cleanedHistory].sort((a, b) => new Date(b.date || '1970-01-01').getTime() - new Date(a.date || '1970-01-01').getTime())[0];
          desiredLatest = pick?.mrn || desiredLatest;
        }

        if (desiredLatest && desiredLatest !== (originalLatest || '')) {
          const scheme = cleanedHistory.find(h => h.mrn === desiredLatest)?.scheme || 'Unknown';
          await api.patients.switchRegistration(id, { mrn: desiredLatest, scheme });
        }
        await api.patients.updateMrnHistory(id, cleanedHistory as any);
      }

      // Build the update payload (non-MRN fields; backend ignores MRN fields on PUT)
      const payload: Partial<Patient> = {
        name: formData.name,
        age: Number(formData.age),
        sex: mapSexToApi(formData.sex),
        department: formData.department,
        diagnosis: formData.diagnosis,
        comorbidities: normalizeComorbidities(formData.comorbidities),
        pathway: normalizePathway(formData.pathway),
        currentState: formData.currentState,
        assignedDoctor: formData.assignedDoctor,
        assignedDoctorId: formData.assignedDoctorId,
        filesUrl: formData.filesUrl || null,
        isUrgent: formData.isUrgent,
        urgentReason: formData.urgentReason,
        urgentUntil: formData.urgentUntil,
        emergencyContact: {
          name: formData.emergencyContact.name,
          relationship: formData.emergencyContact.relationship,
          phone: formData.emergencyContact.phone,
        },
        vitals: {
          hr: formData.vitals.hr ? Number(formData.vitals.hr) : undefined,
          systolic: formData.vitals.systolic ? Number(formData.vitals.systolic) : undefined,
          diastolic: formData.vitals.diastolic ? Number(formData.vitals.diastolic) : undefined,
          spo2: formData.vitals.spo2 ? Number(formData.vitals.spo2) : undefined,
          temp: formData.vitals.temp ? Number(formData.vitals.temp) : undefined,
          updatedAt: new Date().toISOString(),
        },
      };

      // Clean up payload - remove undefined/empty values
      Object.keys(payload).forEach(key => {
        const value = payload[key as keyof typeof payload];
        if (value === undefined || value === null || value === "") {
          delete payload[key as keyof typeof payload];
        }
      });

      await api.patients.update(id, payload);

      toast({
        title: "Patient updated successfully",
        description: `${formData.name} has been updated.`,
      });

      navigate(`/patients/${id}`);
    } catch (error) {
      console.error("Failed to update patient:", error);
      toast({
        title: "Error",
        description: "Failed to update patient. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 50) {
        setActiveSection("vitals");
        return;
      }

      const sections = [
        "patient-details",
        "registration",
        "medical-details",
        "assignment",
        "files-priority",
        "emergency-contact",
        "vitals",
      ];

      let currentSection = sections[0];
      sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (rect.top <= containerRect.top + 150) currentSection = sectionId;
        }
      });
      setActiveSection(currentSection);
    };

    if (scrollContainerRef.current) {
      scrollContainerRef.current.addEventListener("scroll", handleScroll);
      return () => scrollContainerRef.current?.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const ButtonGroup = ({
    options,
    value,
    onChange,
  }: {
    options: { value: string | boolean; label: string }[];
    value: any;
    onChange: (v: any) => void;
  }) => (
    <div className="flex flex-wrap gap-1">
      {options.map(option => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 rounded-full border transition-all text-xs ${
            value === option.value
              ? "bg-blue-500 border-blue-500 text-white"
              : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Edit Patient" showBack onBack={() => navigate(-1)} />
        <div className="p-4 text-center">
          <div className="text-muted-foreground">Loading patient data...</div>
        </div>
        <BottomBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Edit Patient" showBack onBack={() => navigate(-1)} />
      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-20 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-2 overflow-y-auto flex-1">
            {categories.map(category => {
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

        {/* Right: Main Content Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl space-y-12">
            {/* Patient Details */}
            <div id="patient-details" className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Patient Details</h2>
                <p className="text-sm text-gray-600">Basic patient information</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.name}
                  onChange={e => handleInputChange("name", e.target.value)}
                  placeholder="Enter patient's full name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={formData.age}
                    onChange={e => handleInputChange("age", e.target.value)}
                    placeholder="Age"
                    min={0}
                    max={150}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sex <span className="text-red-500">*</span>
                  </label>
                  <ButtonGroup
                    options={[
                      { value: "M", label: "Male" },
                      { value: "F", label: "Female" },
                      { value: "Other", label: "Other" },
                    ]}
                    value={formData.sex}
                    onChange={value => handleInputChange("sex", value)}
                  />
                </div>
              </div>
            </div>

            {/* Registration Section */}
            <div id="registration" className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Registration Details</h2>
                <p className="text-sm text-gray-600">Hospital registration and department information</p>
              </div>

              {/* Multiple MRN Entries */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-700">
                    MRN Entries <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addMrnEntry}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                  >
                    <Plus size={16} />
                    Add MRN
                  </button>
                </div>

                {formData.mrnHistory.map((entry, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">MRN #{index + 1}</span>
                        {formData.latestMrn === entry.mrn && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <Star size={12} />
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentMrn(index)}
                          className={`text-xs px-2 py-1 rounded ${
                            formData.latestMrn === entry.mrn 
                              ? "bg-green-500 text-white" 
                              : "bg-gray-200 text-gray-700 hover:bg-green-200"
                          }`}
                        >
                          {formData.latestMrn === entry.mrn ? "Latest" : "Set Latest"}
                        </button>
                        {formData.mrnHistory.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMrnEntry(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Scheme <span className="text-red-500">*</span>
                        </label>
                        <ButtonGroup
                          options={[
                            { value: "ASP", label: "ASP" },
                            { value: "NAM", label: "NAM" },
                            { value: "Paid", label: "Paid" },
                            { value: "Unknown", label: "Unknown" },
                          ]}
                          value={entry.scheme}
                          onChange={value => updateMrnEntry(index, "scheme", value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          MRN Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          value={entry.mrn}
                          onChange={e => updateMrnEntry(index, "mrn", e.target.value)}
                          placeholder="ABC-1234567"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          value={entry.date ? new Date(entry.date).toISOString().slice(0, 10) : ""}
                          onChange={e => updateMrnEntry(index, "date", e.target.value ? new Date(e.target.value).toISOString().slice(0, 10) : "")}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* State Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current State
                </label>
                <ButtonGroup
                  options={[
                    { value: "onboarding", label: "Onboarding" },
                    { value: "pre-op", label: "Pre-Op" },
                    { value: "surgery", label: "Surgery" },
                    { value: "post-op", label: "Post-Op" },
                    { value: "ICU", label: "ICU" },
                    { value: "recovery", label: "Recovery" },
                    { value: "stable", label: "Stable" },
                    { value: "discharge", label: "Discharge" },
                  ]}
                  value={formData.currentState}
                  onChange={value => handleInputChange("currentState", value)}
                />
              </div>

              {/* Department Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.department}
                  onChange={e => handleInputChange("department", e.target.value)}
                  placeholder="e.g., Cardiology, Orthopedics"
                />
              </div>
            </div>

            {/* Medical Details */}
            <div id="medical-details" className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Medical Details</h2>
                <p className="text-sm text-gray-600">Treatment pathway and medical information</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pathway</label>
                <ButtonGroup
                  options={[
                    { value: "surgical", label: "Surgical" },
                    { value: "emergency", label: "Emergency" },
                    { value: "consultation", label: "Consultation" },
                  ]}
                  value={formData.pathway}
                  onChange={value => handleInputChange("pathway", value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Diagnosis</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  rows={2}
                  value={formData.diagnosis}
                  onChange={e => handleInputChange("diagnosis", e.target.value)}
                  placeholder="Primary diagnosis"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Comorbidities</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.comorbidities.join(", ")}
                  onChange={e => handleArrayChange("comorbidities", e.target.value)}
                  placeholder="DM2, HTN, CAD"
                />
              </div>
            </div>

            {/* Assignment */}
            <div id="assignment" className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Doctor Assignment</h2>
                <p className="text-sm text-gray-600">Assigned healthcare provider</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned Doctor</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={formData.assignedDoctor}
                    onChange={e => handleInputChange("assignedDoctor", e.target.value)}
                    placeholder="Dr. John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doctor ID</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={formData.assignedDoctorId}
                    onChange={e => handleInputChange("assignedDoctorId", e.target.value)}
                    placeholder="DOC-12345"
                  />
                </div>
              </div>
            </div>

            {/* Files & Priority */}
            <div id="files-priority" className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Files & Priority</h2>
                <p className="text-sm text-gray-600">Documents and urgency settings</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Files URL</label>
                <input
                  type="url"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.filesUrl}
                  onChange={e => handleInputChange("filesUrl", e.target.value)}
                  placeholder="https://example.com/documents"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority Level</label>
                <ButtonGroup
                  options={[
                    { value: false, label: "Standard" },
                    { value: true, label: "Urgent" },
                  ]}
                  value={formData.isUrgent}
                  onChange={value => handleInputChange("isUrgent", value)}
                />
              </div>

              {formData.isUrgent && (
                <div className="space-y-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <label className="block text-sm font-semibold text-red-700 mb-2">Urgent Reason</label>
                    <textarea
                      className="w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none"
                      rows={2}
                      value={formData.urgentReason}
                      onChange={e => handleInputChange("urgentReason", e.target.value)}
                      placeholder="Why is this urgent?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-red-700 mb-2">Urgent Until</label>
                    <input
                      type="datetime-local"
                      className="w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      value={formData.urgentUntil}
                      onChange={e => handleInputChange("urgentUntil", e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            <div id="emergency-contact" className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Emergency Contact</h2>
                <p className="text-sm text-gray-600">Contact person for emergencies</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Name</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={formData.emergencyContact.name}
                    onChange={e => handleInputChange("emergencyContact.name", e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship</label>
                  <ButtonGroup
                    options={[
                      { value: "Spouse", label: "Spouse" },
                      { value: "Parent", label: "Parent" },
                      { value: "Child", label: "Child" },
                      { value: "Sibling", label: "Sibling" },
                      { value: "Other", label: "Other" },
                    ]}
                    value={formData.emergencyContact.relationship}
                    onChange={value => handleInputChange("emergencyContact.relationship", value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={formData.emergencyContact.phone}
                    onChange={e => handleInputChange("emergencyContact.phone", e.target.value)}
                    placeholder="+91-9876543210"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={formData.emergencyContact.email}
                    onChange={e => handleInputChange("emergencyContact.email", e.target.value)}
                    placeholder="contact@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Vitals */}
            <div id="vitals" className="space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Vital Signs</h2>
                <p className="text-sm text-gray-600">Current patient vitals</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={formData.vitals.hr}
                    onChange={e => handleInputChange("vitals.hr", e.target.value)}
                    placeholder="80"
                    min={30}
                    max={300}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SpO2 (%)</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={formData.vitals.spo2}
                    onChange={e => handleInputChange("vitals.spo2", e.target.value)}
                    placeholder="98"
                    min={50}
                    max={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Systolic BP</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={formData.vitals.systolic}
                    onChange={e => handleInputChange("vitals.systolic", e.target.value)}
                    placeholder="120"
                    min={60}
                    max={250}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Diastolic BP</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={formData.vitals.diastolic}
                    onChange={e => handleInputChange("vitals.diastolic", e.target.value)}
                    placeholder="80"
                    min={30}
                    max={150}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Temperature (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.vitals.temp}
                  onChange={e => handleInputChange("vitals.temp", e.target.value)}
                  placeholder="98.6"
                  min={90}
                  max={110}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !validateMandatoryFields()}
        className={`fixed bottom-8 right-8 ${
          isSubmitting || !validateMandatoryFields() 
            ? "opacity-50 cursor-not-allowed bg-gray-400" 
            : "bg-green-500 hover:bg-green-600"
        } text-white p-4 rounded-full shadow-lg transition-all flex items-center space-x-2 z-50`}
      >
        <Check size={20} />
        <span className="font-semibold">
          {isSubmitting ? "Saving..." : !validateMandatoryFields() ? "Complete Form" : "Save Changes"}
        </span>
      </button>

      <BottomBar />
    </div>
  );
}
