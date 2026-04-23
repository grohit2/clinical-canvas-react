import { z } from "zod";

export const SEX_OPTIONS = ["M", "F", "OTHER"] as const;
export const SCHEME_OPTIONS = ["ASP", "NAM", "EHS", "PAID", "OTHERS"] as const;
export const PATHWAY_OPTIONS = ["surgical", "consultation", "emergency"] as const;
export const STAGE_OPTIONS = [
  "onboarding",
  "preop",
  "intraop",
  "postop",
  "discharge-init",
  "discharge",
] as const;
export const COMORBIDITY_OPTIONS = [
  "T2DM",
  "HTN",
  "CAD",
  "CVD",
  "CKD",
  "THYROID",
  "EPILEPSY",
  "BRONCHIAL ASTHMA",
  "TUBERCULOSIS",
  "OTHER",
] as const;

export type SexOption = (typeof SEX_OPTIONS)[number];
export type SchemeOption = (typeof SCHEME_OPTIONS)[number];
export type PathwayOption = (typeof PATHWAY_OPTIONS)[number];
export type StageOption = (typeof STAGE_OPTIONS)[number];
export type ComorbidityOption = (typeof COMORBIDITY_OPTIONS)[number];

const optionalString = z.preprocess(
  (value) => (value === null || value === undefined ? undefined : value),
  z.string().trim().optional()
);

const optionalIsoDateString = z
  .preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.string().trim().optional()
  );

const optionalAge = z
  .preprocess((value) => (value === "" || value == null ? undefined : value), z.coerce.number().int())
  .refine((value) => value === undefined || (value >= 0 && value <= 130), {
    message: "Age must be between 0 and 130",
  })
  .optional();

const emergencyContactSchema = z
  .object({
    name: optionalString,
    relationship: optionalString,
    phone: optionalString,
    altPhone: optionalString,
    email: optionalString,
    address: z
      .object({
        line1: optionalString,
        line2: optionalString,
        city: optionalString,
        state: optionalString,
        postalCode: optionalString,
        country: optionalString,
      })
      .optional(),
  })
  .optional();

export const patientSchema = z
  .object({
    id: z.string().optional(),

    // Person-level fields (stored at META_LATEST)
    name: z.string().trim().min(1, "Name is required"),
    age: optionalAge,
    sex: z.enum(SEX_OPTIONS, { invalid_type_error: "Select a sex" }),

    // Episode-level fields (stored at META_LATEST for current episode)
    mrn: z.string().trim().min(1, "MRN is required"),
    scheme: z.enum(SCHEME_OPTIONS, { invalid_type_error: "Select a scheme" }),
    pathway: z.enum(PATHWAY_OPTIONS, { invalid_type_error: "Select a pathway" }),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
    department: z.string().trim().min(1, "Department is required"),
    currentState: z.enum(STAGE_OPTIONS).default("onboarding"),
    diagnosis: optionalString,

    // Comorbidities
    comorbidities: z
      .array(z.union([z.enum(COMORBIDITY_OPTIONS), z.string().trim().min(1)]))
      .default([]),
    includeOtherComorbidity: z.boolean().default(false),
    otherComorbidity: optionalString,

    // Surgery / Theatre / TID fields (NEW: tidNumber and tidStatus)
    procedureName: optionalString,
    surgeryCode: optionalString,
    surgeryDate: optionalIsoDateString,
    tidNumber: optionalString,   // Theatre ID number
    tidStatus: optionalString,   // Theatre ID status

    // Routing context
    assignedDoctor: optionalString,
    assignedDoctorId: optionalString,
    roomNumber: optionalString,
    filesUrl: optionalString,

    // Urgency
    isUrgent: z.boolean().default(false),
    urgentReason: optionalString,
    urgentUntil: optionalIsoDateString,

    // Emergency contact (person-level)
    emergencyContact: emergencyContactSchema,
  })
  .superRefine((values, ctx) => {
    if (values.includeOtherComorbidity && !values.otherComorbidity?.trim()) {
      ctx.addIssue({
        path: ["otherComorbidity"],
        code: z.ZodIssueCode.custom,
        message: "Add details for other comorbidities",
      });
    }
  });

export type PatientFormValues = z.infer<typeof patientSchema>;