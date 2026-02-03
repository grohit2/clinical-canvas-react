import { describe, it, expect } from "vitest";
import {
  DOC_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_FULL_LABELS,
  isValidCategory,
} from "../types";

describe("Document Types", () => {
  describe("DOC_CATEGORIES", () => {
    it("should contain all 7 document categories", () => {
      expect(DOC_CATEGORIES).toHaveLength(7);
      expect(DOC_CATEGORIES).toContain("preop_pics");
      expect(DOC_CATEGORIES).toContain("lab_reports");
      expect(DOC_CATEGORIES).toContain("radiology");
      expect(DOC_CATEGORIES).toContain("intraop_pics");
      expect(DOC_CATEGORIES).toContain("ot_notes");
      expect(DOC_CATEGORIES).toContain("postop_pics");
      expect(DOC_CATEGORIES).toContain("discharge_pics");
    });
  });

  describe("CATEGORY_LABELS", () => {
    it("should have short labels for all categories", () => {
      expect(CATEGORY_LABELS.preop_pics).toBe("Pre-op");
      expect(CATEGORY_LABELS.lab_reports).toBe("Lab Reports");
      expect(CATEGORY_LABELS.radiology).toBe("Radiology");
      expect(CATEGORY_LABELS.intraop_pics).toBe("Intra-op");
      expect(CATEGORY_LABELS.ot_notes).toBe("OT Notes");
      expect(CATEGORY_LABELS.postop_pics).toBe("Post-op");
      expect(CATEGORY_LABELS.discharge_pics).toBe("Discharge");
    });
  });

  describe("CATEGORY_FULL_LABELS", () => {
    it("should have full labels for all categories", () => {
      expect(CATEGORY_FULL_LABELS.preop_pics).toBe("Pre-operative");
      expect(CATEGORY_FULL_LABELS.lab_reports).toBe("Lab Reports");
      expect(CATEGORY_FULL_LABELS.radiology).toBe("Radiology");
      expect(CATEGORY_FULL_LABELS.intraop_pics).toBe("Intra-operative");
      expect(CATEGORY_FULL_LABELS.ot_notes).toBe("OT Notes");
      expect(CATEGORY_FULL_LABELS.postop_pics).toBe("Post-operative");
      expect(CATEGORY_FULL_LABELS.discharge_pics).toBe("Discharge");
    });
  });

  describe("isValidCategory", () => {
    it("should return true for valid categories", () => {
      expect(isValidCategory("preop_pics")).toBe(true);
      expect(isValidCategory("lab_reports")).toBe(true);
      expect(isValidCategory("radiology")).toBe(true);
      expect(isValidCategory("intraop_pics")).toBe(true);
      expect(isValidCategory("ot_notes")).toBe(true);
      expect(isValidCategory("postop_pics")).toBe(true);
      expect(isValidCategory("discharge_pics")).toBe(true);
    });

    it("should return false for invalid categories", () => {
      expect(isValidCategory("invalid")).toBe(false);
      expect(isValidCategory("")).toBe(false);
      expect(isValidCategory(null)).toBe(false);
      expect(isValidCategory(undefined)).toBe(false);
      expect(isValidCategory(123)).toBe(false);
      expect(isValidCategory("preop")).toBe(false);
      expect(isValidCategory("PREOP_PICS")).toBe(false);
    });
  });
});
