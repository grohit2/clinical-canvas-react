import { getDocuments, DocumentsProfile, DocumentsCategory } from "@/lib/filesApi";

function listForCategory(p: DocumentsProfile, c: DocumentsCategory) {
  switch (c) {
    case "preop_pics": return p.preopPics || [];
    case "lab_reports": return p.labReports || [];
    case "radiology": return p.radiology || [];
    case "intraop_pics": return p.intraopPics || [];
    case "ot_notes": return p.otNotes || [];
    case "postop_pics": return p.postopPics || [];
    case "discharge_pics": return p.dischargePics || [];
  }
}

export async function waitForS3EventMaterialization(
  patientId: string,
  category: DocumentsCategory,
  uploadedKey: string,
  timeoutMs = 4000,
  intervalMs = 300
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const profile = await getDocuments(patientId);
    const arr = listForCategory(profile, category);
    if (arr.some((e: any) => e.key === uploadedKey)) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}
