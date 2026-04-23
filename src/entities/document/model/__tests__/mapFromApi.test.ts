import { describe, it, expect } from "vitest";
import {
  mapDocumentFromApi,
  mapFolderSummariesFromApi,
  mapCategoryDocumentsFromApi,
  mapAllDocumentsFromApi,
  type ApiDocument,
  type ApiDocumentsProfile,
} from "../mapFromApi";

describe("mapDocumentFromApi", () => {
  it("should map a basic API document to DocumentItem", () => {
    const raw: ApiDocument = {
      key: "test-key-123",
      name: "test-image.jpg",
      cdnUrl: "https://cdn.example.com/test.jpg",
      uploadedAt: "2024-01-15T10:30:00Z",
      mimeType: "image/jpeg",
      size: 1024,
    };

    const result = mapDocumentFromApi(raw, "preop_pics");

    expect(result.id).toBe("test-key-123");
    expect(result.category).toBe("preop_pics");
    expect(result.name).toBe("test-image.jpg");
    expect(result.fileUrl).toBe("https://cdn.example.com/test.jpg");
    expect(result.thumbUrl).toBe("https://cdn.example.com/test.jpg");
    expect(result.uploadedAt).toBe("2024-01-15T10:30:00Z");
    expect(result.contentType).toBe("image/jpeg");
    expect(result.isImage).toBe(true);
    expect(result.size).toBe(1024);
  });

  it("should use thumbUrl when provided", () => {
    const raw: ApiDocument = {
      key: "test-key",
      cdnUrl: "https://cdn.example.com/full.jpg",
      thumbUrl: "https://cdn.example.com/thumb.jpg",
    };

    const result = mapDocumentFromApi(raw, "lab_reports");

    expect(result.fileUrl).toBe("https://cdn.example.com/full.jpg");
    expect(result.thumbUrl).toBe("https://cdn.example.com/thumb.jpg");
  });

  it("should detect image from extension when mimeType not provided", () => {
    const raw: ApiDocument = {
      key: "test-key",
      name: "photo.png",
      cdnUrl: "https://cdn.example.com/photo.png",
    };

    const result = mapDocumentFromApi(raw, "intraop_pics");

    expect(result.isImage).toBe(true);
  });

  it("should detect non-image files", () => {
    const raw: ApiDocument = {
      key: "test-key",
      name: "report.pdf",
      cdnUrl: "https://cdn.example.com/report.pdf",
      mimeType: "application/pdf",
    };

    const result = mapDocumentFromApi(raw, "lab_reports");

    expect(result.isImage).toBe(false);
  });

  it("should extract filename from key when name not provided", () => {
    const raw: ApiDocument = {
      key: "patients/123/docs/preop/my-photo.jpg",
      cdnUrl: "https://cdn.example.com/my-photo.jpg",
    };

    const result = mapDocumentFromApi(raw, "preop_pics");

    expect(result.name).toBe("my-photo.jpg");
  });

  it("should use fallback values for missing fields", () => {
    const raw: ApiDocument = {
      key: "test-key",
    };

    const result = mapDocumentFromApi(raw, "radiology");

    expect(result.id).toBe("test-key");
    // When only key is provided, name comes from filenameFromKey which returns the last path segment
    expect(result.name).toBe("test-key");
    expect(result.fileUrl).toBe("");
    expect(result.isImage).toBe(false);
  });
});

describe("mapFolderSummariesFromApi", () => {
  it("should map API profile to folder summaries with counts", () => {
    const profile: ApiDocumentsProfile = {
      preopPics: [{ key: "1" }, { key: "2" }],
      labReports: [{ key: "3" }],
      radiology: [],
      intraopPics: undefined,
      otNotes: [{ key: "4" }, { key: "5" }, { key: "6" }],
      postopPics: [],
      dischargePics: [{ key: "7" }],
    };

    const result = mapFolderSummariesFromApi(profile);

    expect(result).toHaveLength(7);
    expect(result.find((s) => s.category === "preop_pics")?.count).toBe(2);
    expect(result.find((s) => s.category === "lab_reports")?.count).toBe(1);
    expect(result.find((s) => s.category === "radiology")?.count).toBe(0);
    expect(result.find((s) => s.category === "intraop_pics")?.count).toBe(0);
    expect(result.find((s) => s.category === "ot_notes")?.count).toBe(3);
    expect(result.find((s) => s.category === "postop_pics")?.count).toBe(0);
    expect(result.find((s) => s.category === "discharge_pics")?.count).toBe(1);
  });

  it("should include lastUpdatedAt for categories with documents", () => {
    const profile: ApiDocumentsProfile = {
      preopPics: [
        { key: "1", uploadedAt: "2024-01-10T10:00:00Z" },
        { key: "2", uploadedAt: "2024-01-15T10:00:00Z" },
      ],
      labReports: [],
    };

    const result = mapFolderSummariesFromApi(profile);

    const preopSummary = result.find((s) => s.category === "preop_pics");
    expect(preopSummary?.lastUpdatedAt).toBe("2024-01-15T10:00:00Z");

    const labSummary = result.find((s) => s.category === "lab_reports");
    expect(labSummary?.lastUpdatedAt).toBeUndefined();
  });
});

describe("mapCategoryDocumentsFromApi", () => {
  it("should return documents for specific category sorted by date descending", () => {
    const profile: ApiDocumentsProfile = {
      preopPics: [
        { key: "1", uploadedAt: "2024-01-10T10:00:00Z", name: "first" },
        { key: "2", uploadedAt: "2024-01-15T10:00:00Z", name: "second" },
        { key: "3", uploadedAt: "2024-01-12T10:00:00Z", name: "middle" },
      ],
    };

    const result = mapCategoryDocumentsFromApi(profile, "preop_pics", "desc");

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("second"); // Most recent first
    expect(result[1].name).toBe("middle");
    expect(result[2].name).toBe("first");
  });

  it("should sort ascending when specified", () => {
    const profile: ApiDocumentsProfile = {
      labReports: [
        { key: "1", uploadedAt: "2024-01-10T10:00:00Z", name: "first" },
        { key: "2", uploadedAt: "2024-01-15T10:00:00Z", name: "second" },
      ],
    };

    const result = mapCategoryDocumentsFromApi(profile, "lab_reports", "asc");

    expect(result[0].name).toBe("first"); // Oldest first
    expect(result[1].name).toBe("second");
  });

  it("should return empty array for missing category", () => {
    const profile: ApiDocumentsProfile = {};

    const result = mapCategoryDocumentsFromApi(profile, "radiology");

    expect(result).toEqual([]);
  });
});

describe("mapAllDocumentsFromApi", () => {
  it("should return all documents from all categories sorted by date", () => {
    const profile: ApiDocumentsProfile = {
      preopPics: [{ key: "1", uploadedAt: "2024-01-15T10:00:00Z" }],
      labReports: [{ key: "2", uploadedAt: "2024-01-20T10:00:00Z" }],
      radiology: [{ key: "3", uploadedAt: "2024-01-10T10:00:00Z" }],
    };

    const result = mapAllDocumentsFromApi(profile, "desc");

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("2"); // Most recent (lab_reports)
    expect(result[1].id).toBe("1"); // preop_pics
    expect(result[2].id).toBe("3"); // Oldest (radiology)
  });

  it("should assign correct category to each document", () => {
    const profile: ApiDocumentsProfile = {
      preopPics: [{ key: "1" }],
      otNotes: [{ key: "2" }],
    };

    const result = mapAllDocumentsFromApi(profile);

    const preopDoc = result.find((d) => d.id === "1");
    const otDoc = result.find((d) => d.id === "2");

    expect(preopDoc?.category).toBe("preop_pics");
    expect(otDoc?.category).toBe("ot_notes");
  });

  it("should return empty array when all categories are empty", () => {
    const profile: ApiDocumentsProfile = {
      preopPics: [],
      labReports: undefined,
    };

    const result = mapAllDocumentsFromApi(profile);

    expect(result).toEqual([]);
  });
});
