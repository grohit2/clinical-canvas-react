import React, { useState, useEffect, useRef, useMemo } from "react";
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import type { Patient } from "@/types/api";
import { toCreatePayload } from "@/features/patient-details-input/patient-create.adapter";

type ButtonGroupOption = { value: string | boolean; label: string };
function ButtonGroup({ options, value, onChange }: { options: ButtonGroupOption[]; value: any; onChange: (v: any) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => (
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
}

const COMORBIDITY_OPTIONS = [
  { value: "T2DM", label: "T2DM" },
  { value: "HTN", label: "HTN" },
  { value: "CAD", label: "CAD" },
  { value: "CVD", label: "CVD" },
  { value: "CKD", label: "CKD" },
  { value: "THYROID", label: "THYROID" },
  { value: "EPILEPSY", label: "EPILEPSY" },
  { value: "BRONCHIAL ASTHMA", label: "BRONCHIAL ASTHMA" },
  { value: "TUBERCULOSIS", label: "TUBERCULOSIS" },
  { value: "OTHER", label: "Other" },
] as const;

const OTHER_COMORBIDITY_VALUE = "OTHER";
const COMORBIDITY_BASE_VALUES = COMORBIDITY_OPTIONS.filter((opt) => opt.value !== OTHER_COMORBIDITY_VALUE).map((opt) => opt.value);
const COMORBIDITY_BASE_SET = new Set(COMORBIDITY_BASE_VALUES);

const toUpperTrim = (value: string) => value.trim().toUpperCase();

const parseComorbiditiesFromList = (list?: string[]) => {
  const flattened = (list || [])
    .flatMap((item) =>
      String(item)
        .split(/\s*\+\s*|\s*,\s*/)
        .map((token) => token.trim())
        .filter(Boolean)
    )
    .map((token) => token.toUpperCase());

  const baseSelections = Array.from(
    new Set(flattened.filter((token) => COMORBIDITY_BASE_SET.has(token)))
  );

  const customTokens = flattened.filter((token) => !COMORBIDITY_BASE_SET.has(token));

  return {
    selections: baseSelections,
    includeOther: customTokens.length > 0,
    otherValue: customTokens.join(' + '),
  };
};

const buildComorbidityResult = (
  selections: string[],
  includeOther: boolean,
  otherValue: string
) => {
  const tokens = Array.from(new Set(selections.map(toUpperTrim)));
  if (includeOther) {
    const custom = toUpperTrim(otherValue);
    if (custom) tokens.push(custom);
  }
  const summary = tokens.length ? [tokens.join(' + ')] : [];
  return { tokens, summary };
};

type FormState = {
  name: string;
  age: string;
  sex: string; // "M" | "F" | "Other"
  scheme: string;
  roomNumber: string;
  mrn: string;
  department: string;
  status: string;
  pathway: string;
  diagnosis: string;
  comorbidities: string[];
  includeOtherComorbidity: boolean;
  otherComorbidity: string;
  procedureName: string;
  surgeryCode: string;
  surgeryDate: string;
  assignedDoctor: string;
  assignedDoctorId: string;
  filesUrl: string;
  isUrgent: boolean;
  urgentReason: string;
  urgentUntil: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    altPhone: string;
    email: string;
    address: {
      line1: string;
      line2: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
};

type PatientRegistrationFormProps = {
  onAddPatient?: (patient: Patient) => void;
  onClose?: () => void; // used by dialog/page back
  mode?: 'create' | 'edit';
  patientId?: string; // for edit
  initial?: Partial<FormState> & Record<string, any>;
};

const SCHEME_OPTIONS = ['ASP', 'NAM', 'EHS', 'PAID', 'OTHERS'] as const;
const normalizeScheme = (value?: string): string => {
  const raw = (value || '').trim().toUpperCase();
  if (SCHEME_OPTIONS.includes(raw as (typeof SCHEME_OPTIONS)[number])) {
    return raw;
  }
  if (["UNKNOWN", "GENERAL", "OTHER", "OTHERS"].includes(raw)) {
    return 'OTHERS';
  }
  return raw || 'OTHERS';
};

const defaultFormState: FormState = {
  // Mandatory fields - Patient Details
  name: "",
  age: "",
  sex: "", // "M" | "F" | "Other"

  // Mandatory fields - Registration
  scheme: "",
  roomNumber: "",
  mrn: "",
  department: "",
  status: "ACTIVE",

  // Mandatory - Pathway (to satisfy the current API)
  pathway: "",

  // Optional fields - Medical Details
  diagnosis: "",
  comorbidities: [],
  includeOtherComorbidity: false,
  otherComorbidity: "",
  procedureName: "",
  surgeryCode: "",
  surgeryDate: "",
  assignedDoctor: "",
  assignedDoctorId: "",

  // Optional fields - Files & Priority
  filesUrl: "",
  isUrgent: false,
  urgentReason: "",
  urgentUntil: "",

  // Optional fields - Emergency Contact
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
};

const PatientRegistrationForm: React.FC<PatientRegistrationFormProps> = ({ onAddPatient, onClose, mode = 'create', patientId, initial }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeSection, setActiveSection] = useState("patient-details");
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [showJsonSection, setShowJsonSection] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const jsonTextRef = useRef<HTMLTextAreaElement | null>(null);

  const [formData, setFormData] = useState({ ...defaultFormState });

  // Prefill in edit mode
  useEffect(() => {
    if (initial) {
      const parsed = parseComorbiditiesFromList((initial as any).comorbidities);
      setFormData((prev) => {
        const ecInit = (initial as any).emergencyContact || {};
        const ecAddrInit = (ecInit as any).address || {};
        return {
          ...prev,
          ...initial,
          scheme: (initial as any).scheme ? normalizeScheme((initial as any).scheme) : prev.scheme,
          roomNumber: (initial as any).roomNumber ?? prev.roomNumber,
          comorbidities: parsed.selections,
          includeOtherComorbidity: parsed.includeOther,
          otherComorbidity: parsed.includeOther ? parsed.otherValue : "",
          procedureName: (initial as any).procedureName ?? prev.procedureName,
          emergencyContact: {
            ...prev.emergencyContact,
            ...ecInit,
            address: {
              ...prev.emergencyContact.address,
              ...ecAddrInit,
            },
          },
        };
      });
    }
  }, [initial]);

  const categories = [
    { id: "patient-details", title: "PD", mandatory: true },
    { id: "registration", title: "REG", mandatory: true },
    { id: "medical-details", title: "MD", mandatory: false },
    { id: "files-priority", title: "FILES", mandatory: false },
    { id: "emergency-contact", title: "EMER CONTACT", mandatory: false },
  ];

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

  const toggleComorbidity = (value: string) => {
    if (value === OTHER_COMORBIDITY_VALUE) {
      setFormData(prev => ({
        ...prev,
        includeOtherComorbidity: !prev.includeOtherComorbidity,
        otherComorbidity: !prev.includeOtherComorbidity ? prev.otherComorbidity : "",
      }));
      return;
    }

    const normalized = toUpperTrim(String(value));
    setFormData(prev => {
      const exists = prev.comorbidities.includes(normalized);
      const next = exists
        ? prev.comorbidities.filter(item => item !== normalized)
        : [...prev.comorbidities, normalized];
      return { ...prev, comorbidities: next };
    });
  };

  const handleOtherComorbidityChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      otherComorbidity: value.toUpperCase(),
    }));
  };

  const comorbidityResult = useMemo(
    () => buildComorbidityResult(
      formData.comorbidities,
      formData.includeOtherComorbidity,
      formData.otherComorbidity
    ),
    [formData.comorbidities, formData.includeOtherComorbidity, formData.otherComorbidity]
  );

  const validateMandatoryFields = () => {
    if (mode === 'edit') {
      // For edit, only require minimal fields used by update
      return (
        formData.name.trim() !== "" &&
        formData.age !== "" &&
        formData.sex !== ""
      );
    }
    return (
      formData.name.trim() !== "" &&
      formData.age !== "" &&
      formData.sex !== "" &&
      formData.scheme !== "" &&
      formData.mrn.trim() !== "" &&
      formData.department.trim() !== "" &&
      formData.pathway !== "" // pathway required for API
    );
  };

  const getSectionCompletionStatus = (sectionId: string) => {
    switch (sectionId) {
      case "patient-details":
        return !!(formData.name && formData.age && formData.sex);
      case "registration":
        return !!(formData.scheme && formData.mrn && formData.department);
      case "medical-details":
        return !!(formData.pathway || formData.diagnosis || formData.assignedDoctor);
      case "files-priority":
        return !!(formData.filesUrl || formData.isUrgent);
      case "emergency-contact":
        return !!(formData.emergencyContact.name || formData.emergencyContact.phone);
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

  const handlePopulateFromJson = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);

      const parsed = parseComorbiditiesFromList(
        Array.isArray(data.comorbidities)
          ? data.comorbidities
          : data.comorbidities
          ? [data.comorbidities]
          : undefined
      );

      setFormData(prev => ({
        ...prev,
        name: data.name ?? prev.name,
        age: data.age ? String(data.age) : prev.age,
        sex: data.sex ?? prev.sex,
        scheme: data.scheme ? normalizeScheme(data.scheme) : prev.scheme,
        mrn: data.mrn ?? prev.mrn,
        department: data.department ?? prev.department,
        status: data.status ?? prev.status,
        pathway: data.pathway ?? prev.pathway,
        diagnosis: data.diagnosis ?? prev.diagnosis,
        comorbidities: parsed.selections,
        includeOtherComorbidity: parsed.includeOther,
        otherComorbidity: parsed.includeOther ? parsed.otherValue : "",
        procedureName: data.procedureName ?? prev.procedureName,
        assignedDoctor: data.assignedDoctor ?? prev.assignedDoctor,
        assignedDoctorId: data.assignedDoctorId ?? prev.assignedDoctorId,
        filesUrl: data.filesUrl ?? prev.filesUrl,
        isUrgent: data.isUrgent !== undefined ? data.isUrgent : prev.isUrgent,
        urgentReason: data.urgentReason ?? prev.urgentReason,
        urgentUntil: data.urgentUntil ?? prev.urgentUntil,
        emergencyContact: {
          name: data.emergencyContact?.name ?? prev.emergencyContact.name,
          relationship: data.emergencyContact?.relationship ?? prev.emergencyContact.relationship,
          phone: data.emergencyContact?.phone ?? prev.emergencyContact.phone,
          altPhone: data.emergencyContact?.altPhone ?? prev.emergencyContact.altPhone,
          email: data.emergencyContact?.email ?? prev.emergencyContact.email,
          address: {
            line1: data.emergencyContact?.address?.line1 ?? prev.emergencyContact.address.line1,
            line2: data.emergencyContact?.address?.line2 ?? prev.emergencyContact.address.line2,
            city: data.emergencyContact?.address?.city ?? prev.emergencyContact.address.city,
            state: data.emergencyContact?.address?.state ?? prev.emergencyContact.address.state,
            postalCode: data.emergencyContact?.address?.postalCode ?? prev.emergencyContact.address.postalCode,
            country: data.emergencyContact?.address?.country ?? prev.emergencyContact.address.country,
          },
        },
      }));

      setShowJsonSection(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
      alert("Form populated successfully from JSON data!");
    } catch {
      alert("Invalid JSON format. Please check your JSON and try again.");
    }
  };


  const copyPromptToClipboard = () => {
    const prompt = `You are a clinical data extractor for the "Clinical Canvas" app.

TASK
Read the patient info I provide (text and/or images). Return ONE JSON object that I can paste into my form to auto-fill fields.

STRICT OUTPUT
- Return ONLY raw JSON (no prose, no markdown fences, no comments).
- UTF-8, valid JSON, double-quoted keys/strings.

REQUIRED FIELDS (must appear, with real values only)
- name (string)
- age (number, years; convert if needed)
- sex ("M" | "F" | "Other")
- scheme ("ASP" | "NAM" | "EHS" | "PAID" | "OTHERS")
- mrn (string; pick the current/most-recent episode if multiple)
- department (string)
- status ("ACTIVE" | "INACTIVE")

OPTIONAL FIELDS (include ONLY if confidently known; otherwise omit)
- pathway (string)
- diagnosis (string)
- comorbidities (array of strings, unique, no blanks)
- assignedDoctor (string)
- assignedDoctorId (string)
- filesUrl (string URL)
- isUrgent (boolean)
- urgentReason (string)
- urgentUntil (ISO-8601, e.g., "2025-08-31T12:30:00Z")
- emergencyContact: {
    name (string)
    relationship ("Spouse" | "Parent" | "Child" | "Sibling" | "Other")
    phone (string)
    altPhone (string)
    email (string)
    address: {
      line1 (string)
      line2 (string)
      city (string)
      state (string)
      postalCode (string)
      country (string)
    }
  }

NORMALIZATION RULES
- Age → number (round to nearest whole year if a range).
- Sex → map synonyms to M/F/Other.
- Scheme → map synonyms:
  * "Aarogyasri", "ASP scheme" → "ASP"
  * "Narayana Aarogyamasthu" → "NAM"
  * "Employee Health Scheme", "EHS" → "EHS"
  * "Self-pay", "Cash", "Paid" → "PAID"
  * unknown/not stated → "OTHERS"
- Status → "ACTIVE" if currently admitted/under care; "INACTIVE" if explicitly discharged/closed.
- comorbidities → split on commas/lines; trim; deduplicate.
- isUrgent → true if documents indicate urgent/emergent/STAT/critical; else false (omit if unclear).
- Dates/times → ISO-8601 with Z (UTC) if provided.

CONSERVATIVE EXTRACTION
- Do NOT invent values. If a field isn’t clearly present, omit it.
- If multiple MRNs appear, pick the one most clearly marked "current/active/latest" or with the latest date.

RETURN
Return exactly one JSON object matching the above keys. No extra keys, no commentary.`;

    navigator.clipboard
      .writeText(prompt)
      .then(() => alert("Prompt copied to clipboard! Paste this into ChatGPT along with your patient documents."))
      .catch(() => alert("Failed to copy prompt. Please copy manually from the text area."));
  };

  const handleJsonSectionToggle = () => {
    const next = !showJsonSection;
    setShowJsonSection(next);

    if (next) {
      setTimeout(() => {
        const element = document.getElementById("json-import");
        if (element && scrollContainerRef.current) {
          const offsetTop = element.offsetTop - 20;
          scrollContainerRef.current.scrollTo({ top: offsetTop, behavior: "smooth" });
        }
      }, 80);
    }
  };

  useEffect(() => {
    setShowFloatingButton(validateMandatoryFields());

    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 50) {
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
  }, [formData]);

  const handleSubmit = async () => {
    if (!validateMandatoryFields()) {
      alert("Please complete all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      const comorbiditySummary = comorbidityResult.summary;
      if (mode === 'edit' && patientId) {
        // Build update payload (partial)
        const payload: Partial<import("@/types/api").Patient> = {
          name: formData.name,
          diagnosis: formData.diagnosis,
          assignedDoctor: formData.assignedDoctor,
          assignedDoctorId: formData.assignedDoctorId,
        };
        if (formData.age) payload.age = Number(formData.age);
        if (formData.sex) {
          const s = (formData.sex || '').toLowerCase();
          payload.sex = s === 'm' ? 'male' : s === 'f' ? 'female' : 'other';
        }
        if (formData.pathway) payload.pathway = formData.pathway as any;
        const normalizedScheme = normalizeScheme(formData.scheme);
        if (normalizedScheme) payload.scheme = normalizedScheme;
        if (comorbiditySummary.length) payload.comorbidities = comorbiditySummary;
        else payload.comorbidities = [];
        payload.roomNumber = formData.roomNumber.trim();
        payload.procedureName = formData.procedureName.trim() || undefined;
        // Optional surgery fields for edit
        if (typeof formData.surgeryCode !== 'undefined') {
          (payload as any).surgeryCode = formData.surgeryCode.trim() || undefined;
        }
        if (typeof formData.surgeryDate !== 'undefined') {
          (payload as any).surgeryDate = formData.surgeryDate ? new Date(formData.surgeryDate).toISOString() : null;
        }
        await api.patients.update(patientId, payload);

        toast({ title: 'Patient updated', description: `${formData.name} updated successfully.` });
        onAddPatient?.({} as Patient);
        if (onClose) onClose();
      } else {
        // Normalize via adapter, then map to client API shape
        const norm = toCreatePayload({
          name: formData.name,
          age: formData.age,
          sex: formData.sex,
          mrn: formData.mrn,
          scheme: formData.scheme,
          roomNumber: formData.roomNumber,
          procedureName: formData.procedureName,
          department: formData.department,
          pathway: formData.pathway,
          diagnosis: formData.diagnosis || "",
          comorbidities: comorbiditySummary,
          assignedDoctor: formData.assignedDoctor || "",
          assignedDoctorId: formData.assignedDoctorId || "",
        });

        const res = await api.patients.create({
          registrationNumber: norm.registrationNumber,
          name: norm.name,
          department: norm.department,
          age: norm.age,
          sex: norm.sex,
          pathway: norm.pathway,
          diagnosis: norm.diagnosis,
          comorbidities: norm.comorbidities,
          assignedDoctorId: norm.assignedDoctorId,
          scheme: norm.scheme,
          roomNumber: norm.roomNumber,
          latestMrn: norm.latestMrn,
          mrnHistory: norm.mrnHistory,
          surgeryCode: formData.surgeryCode || undefined,
          surgeryDate: formData.surgeryDate ? new Date(formData.surgeryDate).toISOString() : null,
        });
        onAddPatient?.(res.patient);

        toast({ title: 'Patient added successfully', description: `${formData.name} has been added.` });
        if (onClose) onClose();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add patient. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-20 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
        <div className="p-2 flex-1">
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

        {/* JSON trigger pinned to bottom; add margin to avoid BottomBar overlap */}
        <div className="p-2 border-t mb-24">
          <button
            onClick={handleJsonSectionToggle}
            className={`w-full flex flex-col items-center p-3 rounded-lg transition-all border-2 ${
              showJsonSection
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "hover:bg-gray-50 border-transparent text-gray-700"
            }`}
          >
            <div className="text-center">
              <span className="font-medium text-xs leading-tight text-center">JSON</span>
            </div>
          </button>
        </div>
      </div>

      {/* Right: Main Content Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Scheme <span className="text-red-500">*</span>
                </label>
                <ButtonGroup
                  options={SCHEME_OPTIONS.map((option) => ({ value: option, label: option }))}
                  value={formData.scheme}
                  onChange={value => handleInputChange("scheme", normalizeScheme(value))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Room Number (R#)
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.roomNumber}
                  onChange={(e) => handleInputChange("roomNumber", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Procedure Name
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={formData.procedureName}
                onChange={(e) => handleInputChange("procedureName", e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Surgery Code</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.surgeryCode}
                  onChange={(e) => handleInputChange("surgeryCode", e.target.value)}
                  placeholder="e.g., KNEE-ARTHRO"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Surgery Date</label>
                <input
                  type="datetime-local"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.surgeryDate}
                  onChange={(e) => handleInputChange("surgeryDate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  MRN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.mrn}
                  onChange={e => handleInputChange("mrn", e.target.value)}
                  placeholder="ABC-1234567"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <ButtonGroup
                  options={[
                    { value: "ACTIVE", label: "Active" },
                    { value: "INACTIVE", label: "Inactive" },
                  ]}
                  value={formData.status}
                  onChange={value => handleInputChange("status", value)}
                />
              </div>
            </div>

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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pathway <span className="text-red-500">*</span>
                </label>
                {/* Use API-friendly values directly */}
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned Doctor</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.assignedDoctor}
                  onChange={e => handleInputChange("assignedDoctor", e.target.value)}
                  placeholder="Dr. Smith"
                />
              </div>
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
              <div className="flex flex-wrap gap-2">
                {COMORBIDITY_OPTIONS.map((option) => {
                  const isOther = option.value === OTHER_COMORBIDITY_VALUE;
                  const isActive = isOther
                    ? formData.includeOtherComorbidity
                    : formData.comorbidities.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleComorbidity(option.value)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                        isActive
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {formData.includeOtherComorbidity && (
                <input
                  type="text"
                  className="mt-3 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Specify other comorbidity"
                  value={formData.otherComorbidity}
                  onChange={(e) => handleOtherComorbidityChange(e.target.value)}
                />
              )}
              {comorbidityResult.tokens.length > 0 && (
                <p className="mt-2 text-xs text-gray-600">
                  Will be saved as{' '}
                  <span className="font-semibold text-gray-800">
                    {comorbidityResult.tokens.join(' + ')}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Doctor ID</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={formData.assignedDoctorId}
                onChange={e => handleInputChange("assignedDoctorId", e.target.value)}
                placeholder="dr_smith_001"
              />
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Alt Phone</label>
                <input
                  type="tel"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.emergencyContact.altPhone}
                  onChange={e => handleInputChange("emergencyContact.altPhone", e.target.value)}
                  placeholder="+91-9876543210"
                />
              </div>
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

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700">Address</h4>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={formData.emergencyContact.address?.line1 ?? ''}
                onChange={e => handleInputChange("emergencyContact.address.line1", e.target.value)}
                placeholder="Address Line 1"
              />
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={formData.emergencyContact.address?.line2 ?? ''}
                onChange={e => handleInputChange("emergencyContact.address.line2", e.target.value)}
                placeholder="Address Line 2 (Optional)"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.emergencyContact.address?.city ?? ''}
                  onChange={e => handleInputChange("emergencyContact.address.city", e.target.value)}
                  placeholder="City"
                />
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.emergencyContact.address?.state ?? ''}
                  onChange={e => handleInputChange("emergencyContact.address.state", e.target.value)}
                  placeholder="State"
                />
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={formData.emergencyContact.address?.postalCode ?? ''}
                  onChange={e => handleInputChange("emergencyContact.address.postalCode", e.target.value)}
                  placeholder="Postal Code"
                />
              </div>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={formData.emergencyContact.address?.country ?? ''}
                onChange={e => handleInputChange("emergencyContact.address.country", e.target.value)}
                placeholder="Country"
              />
            </div>
          </div>

          {/* JSON Import Section — ALWAYS LAST */}
          {showJsonSection && (
            <div
              id="json-import"
              className="space-y-4 animate-slide-up"
              style={{ animation: "slideUp 0.3s ease-out forwards", transformOrigin: "bottom" }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Import Patient Data</h2>
                <p className="text-sm text-gray-600">Use ChatGPT to extract data from patient documents</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Step 1: Copy ChatGPT Prompt</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Click below to copy a prompt. Paste it into ChatGPT along with patient documents.
                  </p>
                  <button
                    onClick={copyPromptToClipboard}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all text-sm"
                  >
                    Copy Prompt for ChatGPT
                  </button>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Step 2: Paste ChatGPT Response</h4>
                  <p className="text-sm text-gray-600 mb-3">Copy the JSON response from ChatGPT and paste it below:</p>
                  <textarea
                    ref={jsonTextRef}
                    id="jsonInput"
                    className="w-full h-40 p-3 border border-gray-300 rounded-lg text-sm font-mono"
                    placeholder="Paste ChatGPT JSON response here..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowJsonSection(false)}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-all text-sm"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => {
                      const jsonInput = jsonTextRef.current?.value || "";
                      if (jsonInput.trim()) {
                        handlePopulateFromJson(jsonInput);
                      } else {
                        alert("Please paste the JSON response from ChatGPT");
                      }
                    }}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all text-sm"
                  >
                    Populate Form
                  </button>
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-700">
                    <strong>Pro tip:</strong> Upload patient documents, medical records, or any text containing patient
                    information to ChatGPT. The AI will extract and format the data automatically.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      {showFloatingButton && (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`fixed bottom-8 right-8 ${
            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
          } bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all flex items-center space-x-2 z-50`}
        >
          <Check size={20} />
          <span className="font-semibold">{isSubmitting ? "Adding..." : "Done"}</span>
        </button>
      )}
    </div>
  );
};

export default PatientRegistrationForm;
