// src/lib/support.ts
export function assertNever(x: never): never {
  throw new Error("Unreachable");
}

export function categoryToDocType(category: string) {
  const map: Record<string, string> = {
    preop_pics: "preop",
    lab_reports: "lab",
    radiology: "radiology",
    intraop_pics: "intraop",
    ot_notes: "otnotes",
    postop_pics: "postop",
    discharge_pics: "discharge",
  };
  return map[category] || "misc";
}

