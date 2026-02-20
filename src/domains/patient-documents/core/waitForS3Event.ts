import type { DocCategory } from './types';
import type { ApiDocumentsProfile } from './mapFromApi';

export type FetchDocumentsProfile = (patientId: string) => Promise<ApiDocumentsProfile>;

function listForCategory(profile: ApiDocumentsProfile, category: DocCategory) {
  switch (category) {
    case 'preop_pics':
      return profile.preopPics || [];
    case 'lab_reports':
      return profile.labReports || [];
    case 'radiology':
      return profile.radiology || [];
    case 'intraop_pics':
      return profile.intraopPics || [];
    case 'ot_notes':
      return profile.otNotes || [];
    case 'postop_pics':
      return profile.postopPics || [];
    case 'discharge_pics':
      return profile.dischargePics || [];
  }
}

export async function waitForS3EventMaterialization(
  fetchProfile: FetchDocumentsProfile,
  patientId: string,
  category: DocCategory,
  uploadedKey: string,
  timeoutMs = 4000,
  intervalMs = 300
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const profile = await fetchProfile(patientId);
    const docs = listForCategory(profile, category);

    if (docs.some((entry: { key?: string }) => entry.key === uploadedKey)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}
