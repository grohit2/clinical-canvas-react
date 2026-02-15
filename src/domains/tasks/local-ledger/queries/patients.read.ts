// Patient writes/reads are intentionally deferred per current task scope.

export interface PatientReadModel {
  id: string;
  wardId: string;
  name: string;
  stage: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  deletedAt: string | null;
}

export const PATIENT_SELECT = `SELECT * FROM patients`;

export async function getPatientById(_id: string): Promise<PatientReadModel | null> {
  return null;
}

export async function getPatientsByWard(_wardId: string): Promise<PatientReadModel[]> {
  return [];
}
