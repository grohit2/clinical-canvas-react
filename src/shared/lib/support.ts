// src/lib/support.ts
export function assertNever(x: never): never {
  throw new Error("Unreachable");
}

import type { DocumentsCategory, DocType } from "./filesApi";

export function categoryToDocType(category: DocumentsCategory): DocType {
  const map: Record<DocumentsCategory, DocType> = {
    preop_pics: "preop",
    lab_reports: "lab",
    radiology: "radiology",
    intraop_pics: "intraop",
    ot_notes: "otnotes",
    postop_pics: "postop",
    discharge_pics: "discharge",
  };
  return map[category];
}

