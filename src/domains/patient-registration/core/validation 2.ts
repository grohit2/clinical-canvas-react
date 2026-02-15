// Patient Registration Validation
// Pure TypeScript (NO React/RN imports)
// Zod schemas for form validation

import { z } from 'zod';

export const patientIdentitySchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Gender is required',
  }),
  photoUrl: z.string().url().optional().or(z.literal('')),
});

export const contactSchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{10,}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
});

export const medicalDetailsSchema = z.object({
  diagnosis: z.string().optional(),
  comorbidities: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  bloodGroup: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .optional(),
});

export const emergencyContactSchema = z.object({
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z
    .string()
    .regex(/^\+?[\d\s-]{10,}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  emergencyContactRelation: z.string().optional(),
});

export const filesPrioritySchema = z.object({
  documents: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string().url(),
        type: z.string(),
        size: z.number(),
      })
    )
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

export const registrationSchema = z.object({
  registrationDate: z.string().optional(),
  registrationTime: z.string().optional(),
  assignedDoctor: z.string().optional(),
  ward: z.string().optional(),
});

// Combined schema for full form
export const fullRegistrationSchema = patientIdentitySchema
  .merge(contactSchema)
  .merge(medicalDetailsSchema)
  .merge(emergencyContactSchema)
  .merge(filesPrioritySchema)
  .merge(registrationSchema);

export type PatientIdentityData = z.infer<typeof patientIdentitySchema>;
export type ContactData = z.infer<typeof contactSchema>;
export type MedicalDetailsData = z.infer<typeof medicalDetailsSchema>;
export type EmergencyContactData = z.infer<typeof emergencyContactSchema>;
export type FilesPriorityData = z.infer<typeof filesPrioritySchema>;
export type RegistrationData = z.infer<typeof registrationSchema>;
export type FullRegistrationData = z.infer<typeof fullRegistrationSchema>;

// MRN validation
export const mrnSchema = z.object({
  uid: z.string().min(1, 'MRN is required'),
  hospital: z.string().min(1, 'Hospital is required'),
  isPrimary: z.boolean().default(false),
});

export type MrnData = z.infer<typeof mrnSchema>;
