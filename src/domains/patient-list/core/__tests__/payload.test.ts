import { describe, expect, it } from "vitest";
import type { Patient } from "@/types/api";
import {
  mapSexToApi,
  normalizeComorbidities,
  toCreatePayload,
  toUpdatePayload,
} from "../payload";
import type { PatientFormValues } from "../validation";

const baseFormValues = (overrides: Partial<PatientFormValues> = {}): PatientFormValues => ({
  name: "Jane Roe",
  age: 42,
  sex: "F",
  mrn: "ABC-123",
  scheme: "ASP",
  pathway: "surgical",
  status: "ACTIVE",
  department: "General",
  currentState: "onboarding",
  comorbidities: [],
  includeOtherComorbidity: false,
  otherComorbidity: "",
  isUrgent: false,
  ...overrides,
});

describe("mapSexToApi", () => {
  it("maps UI selections to API values", () => {
    expect(mapSexToApi("M")).toBe("male");
    expect(mapSexToApi("F")).toBe("female");
    expect(mapSexToApi("OTHER")).toBe("other");
  });
});

describe("normalizeComorbidities", () => {
  it("dedupes, uppercases, and includes custom other value", () => {
    const tokens = normalizeComorbidities({
      comorbidities: ["htn", "T2DM", "htn"],
      includeOtherComorbidity: true,
      otherComorbidity: "renal failure",
    });
    expect(tokens).toEqual(["HTN", "T2DM", "RENAL FAILURE"]);
  });
});

describe("toCreatePayload", () => {
  it("maps form values to create payload shape", () => {
    const payload = toCreatePayload(
      baseFormValues({
        comorbidities: ["htn"],
        includeOtherComorbidity: true,
        otherComorbidity: "asthma",
        roomNumber: " 12B ",
      })
    );

    expect(payload.registrationNumber).toBe("ABC-123");
    expect(payload.sex).toBe("female");
    expect(payload.scheme).toBe("ASP");
    expect(payload.roomNumber).toBe("12B");
    expect(payload.comorbidities).toEqual(["HTN", "ASTHMA"]);
    expect(payload.mrnHistory?.[0]).toEqual(
      expect.objectContaining({
        mrn: "ABC-123",
        scheme: "ASP",
      })
    );
  });
});

describe("toUpdatePayload", () => {
  const existingPatient: Patient = {
    id: "p1",
    name: "Jane Roe",
    latestMrn: "ABC-123",
    mrnHistory: [],
    department: "General",
    status: "ACTIVE",
    age: 42,
    sex: "female",
    scheme: "ASP",
    pathway: "surgical",
    currentState: "onboarding",
    comorbidities: ["HTN"],
  };

  it("only includes changed fields", () => {
    const payload = toUpdatePayload(
      baseFormValues({
        roomNumber: " 99 ",
        comorbidities: ["HTN", "CKD"],
        includeOtherComorbidity: false,
      }),
      existingPatient
    );

    expect(payload.roomNumber).toBe("99");
    expect(payload.comorbidities).toEqual(["HTN", "CKD"]);
    expect(payload.scheme).toBeUndefined();
    expect(payload.sex).toBeUndefined();
  });

  it("maps sex and scheme when changed", () => {
    const payload = toUpdatePayload(
      baseFormValues({
        sex: "M",
        mrn: "NEW-001",
        scheme: "NAM",
      }),
      existingPatient
    );

    expect(payload.sex).toBe("male");
    expect(payload.scheme).toBe("NAM");
    // latestMrn is only included if it differs from existing (diff-only semantics)
    expect(payload.latestMrn).toBeUndefined();
  });
});
