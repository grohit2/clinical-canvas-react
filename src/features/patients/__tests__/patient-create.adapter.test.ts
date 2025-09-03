import { mapSexToApi, normalizePathway, normalizeComorbidities, toCreatePayload } from "@/features/patient-details-input/patient-create.adapter";

test("mapSexToApi", () => {
  expect(mapSexToApi("M")).toBe("male");
  expect(mapSexToApi("F")).toBe("female");
  expect(mapSexToApi("Other")).toBe("other");
});

test("normalizePathway", () => {
  expect(normalizePathway("surgical")).toBe("surgical");
  expect(normalizePathway("ER")).toBe("emergency");
  expect(normalizePathway("OPD consult")).toBe("consultation");
});

test("normalizeComorbidities", () => {
  expect(normalizeComorbidities([" DM2 ", "HTN", "DM2"])).toEqual(["DM2","HTN"]);
  expect(normalizeComorbidities("DM2, HTN , ")).toEqual(["DM2","HTN"]);
});

test("toCreatePayload happy path", () => {
  const p = toCreatePayload({
    name: "Jane Roe",
    age: "42",
    sex: "F",
    mrn: "ABC-123",
    department: "General",
    pathway: "surgical",
    diagnosis: "Appendicitis",
    comorbidities: [" DM2 "],
    assignedDoctorId: "dr_smith",
    assignedDoctor: "dr_smith",
  } as any);
  expect(p.registrationNumber).toBe("ABC-123");
  expect(p.sex).toBe("female");
  expect(p.pathway).toBe("surgical");
  expect(p.comorbidities).toEqual(["DM2"]);
});
