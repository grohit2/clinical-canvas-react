import { describe, test, expect } from "vitest";
import { 
  mapSexToApi, 
  normalizePathway, 
  normalizeComorbidities, 
  toCreatePayload 
} from "../patinet_form/patient-create.adapter";

describe("mapSexToApi", () => {
  test("maps male variants", () => {
    expect(mapSexToApi("M")).toBe("male");
    expect(mapSexToApi("male")).toBe("male");
    expect(mapSexToApi("Male")).toBe("male");
    expect(mapSexToApi("MALE")).toBe("male");
  });

  test("maps female variants", () => {
    expect(mapSexToApi("F")).toBe("female");
    expect(mapSexToApi("female")).toBe("female");
    expect(mapSexToApi("Female")).toBe("female");
    expect(mapSexToApi("FEMALE")).toBe("female");
  });

  test("maps other variants", () => {
    expect(mapSexToApi("Other")).toBe("other");
    expect(mapSexToApi("unknown")).toBe("other");
    expect(mapSexToApi("")).toBe("other");
    expect(mapSexToApi("invalid")).toBe("other");
  });
});

describe("normalizePathway", () => {
  test("maps surgical variants", () => {
    expect(normalizePathway("surgical")).toBe("surgical");
    expect(normalizePathway("surg")).toBe("surgical");
    expect(normalizePathway("OT")).toBe("surgical");
    expect(normalizePathway("OR")).toBe("surgical");
  });

  test("maps emergency variants", () => {
    expect(normalizePathway("emergency")).toBe("emergency");
    expect(normalizePathway("ER")).toBe("emergency");
    expect(normalizePathway("ED")).toBe("emergency");
    expect(normalizePathway("emer")).toBe("emergency");
  });

  test("maps consultation variants", () => {
    expect(normalizePathway("consultation")).toBe("consultation");
    expect(normalizePathway("OPD consult")).toBe("consultation");
    expect(normalizePathway("clinic")).toBe("consultation");
    expect(normalizePathway("consult")).toBe("consultation");
  });

  test("defaults to consultation for unknown", () => {
    expect(normalizePathway("")).toBe("consultation");
    expect(normalizePathway("unknown")).toBe("consultation");
    expect(normalizePathway(undefined)).toBe("consultation");
  });
});

describe("normalizeComorbidities", () => {
  test("handles array input", () => {
    expect(normalizeComorbidities([" DM2 ", "HTN", "DM2", ""])).toEqual(["DM2", "HTN"]);
    expect(normalizeComorbidities(["diabetes", "hypertension"])).toEqual(["DIABETES", "HYPERTENSION"]);
    expect(normalizeComorbidities([])).toEqual([]);
  });

  test("handles string input", () => {
    expect(normalizeComorbidities("DM2, HTN , ")).toEqual(["DM2", "HTN"]);
    expect(normalizeComorbidities("diabetes,hypertension")).toEqual(["DIABETES", "HYPERTENSION"]);
    expect(normalizeComorbidities("")).toEqual([]);
  });

  test("splits on plus separators", () => {
    expect(normalizeComorbidities(["T2DM + CKD"])).toEqual(["T2DM", "CKD"]);
  });

  test("handles undefined input", () => {
    expect(normalizeComorbidities(undefined)).toEqual([]);
  });

  test("removes duplicates and empty values", () => {
    expect(normalizeComorbidities(["DM", "HTN", "DM", "", "   "])).toEqual(["DM", "HTN"]);
  });
});

describe("toCreatePayload", () => {
  test("transforms complete form data", () => {
    const formData = {
      name: "Jane Roe",
      age: "42",
      sex: "F",
      mrn: "ABC-123",
      department: "General",
      pathway: "surgical",
      diagnosis: "Appendicitis",
      comorbidities: [" DM2 ", "HTN"],
      assignedDoctorId: "dr_smith",
    };

    const result = toCreatePayload(formData);

    expect(result).toMatchObject({
      registrationNumber: "ABC-123",
      name: "Jane Roe",
      department: "General",
      age: 42,
      sex: "female",
      pathway: "surgical",
      diagnosis: "Appendicitis",
      comorbidities: ["DM2", "HTN"],
      assignedDoctorId: "dr_smith",
      scheme: "OTHERS",
      latestMrn: "ABC-123",
    });
    expect(result.roomNumber).toBeUndefined();
    expect(result.mrnHistory).toBeDefined();
    expect(result.mrnHistory).toHaveLength(1);
    expect(result.mrnHistory?.[0]).toMatchObject({
      mrn: "ABC-123",
      scheme: "OTHERS",
    });
    expect(new Date(result.mrnHistory?.[0]?.date || '').toString()).not.toBe('Invalid Date');
  });

  test("handles minimal form data", () => {
    const formData = {
      name: "John Doe",
      age: "30",
      sex: "M",
      mrn: "XYZ-456",
      department: "Cardiology",
    };

    const result = toCreatePayload(formData);

    expect(result).toMatchObject({
      registrationNumber: "XYZ-456",
      name: "John Doe", 
      department: "Cardiology",
      age: 30,
      sex: "male",
      pathway: "consultation", // default
      diagnosis: "", // empty default
      comorbidities: [], // empty default
      assignedDoctorId: undefined,
      scheme: "OTHERS",
      latestMrn: "XYZ-456",
    });
    expect(result.mrnHistory).toHaveLength(1);
    expect(result.mrnHistory?.[0]).toMatchObject({ mrn: "XYZ-456", scheme: "OTHERS" });
  });

  test("throws error for invalid age", () => {
    const formData = {
      name: "Test Patient",
      age: "invalid",
      sex: "M",
      mrn: "TEST-123",
      department: "General",
    };

    expect(() => toCreatePayload(formData)).toThrow("Invalid age");
  });

  test("prefers assignedDoctorId over assignedDoctor", () => {
    const formData = {
      name: "Test Patient",
      age: "25",
      sex: "F",
      mrn: "TEST-456",
      department: "General",
      assignedDoctor: "Dr. Legacy",
      assignedDoctorId: "dr_new",
    };

    const result = toCreatePayload(formData);
    expect(result.assignedDoctorId).toBe("dr_new");
  });

  test("falls back to assignedDoctor when no assignedDoctorId", () => {
    const formData = {
      name: "Test Patient",
      age: "25",
      sex: "F",
      mrn: "TEST-789",
      department: "General",
      assignedDoctor: "dr_fallback",
    };

    const result = toCreatePayload(formData);
    expect(result.assignedDoctorId).toBe("dr_fallback");
  });

  test("trims whitespace from string fields", () => {
    const formData = {
      name: "  Spaced Name  ",
      age: "35",
      sex: "M",
      mrn: "  TRIM-123  ",
      department: "  Surgery  ",
      diagnosis: "  Acute condition  ",
    };

    const result = toCreatePayload(formData);

    expect(result.name).toBe("Spaced Name");
    expect(result.registrationNumber).toBe("TRIM-123");
    expect(result.department).toBe("Surgery");
    expect(result.diagnosis).toBe("Acute condition");
  });
});
