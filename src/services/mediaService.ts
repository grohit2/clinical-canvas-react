import { apiService, fetchWithFallback } from "./api";
import { API_CONFIG, FEATURE_FLAGS } from "@/config/api";

export type MediaItem = {
  id?: string;
  s3_key: string;
  mime?: string;
  size?: number;
  created_at?: string;
  variants?: { thumb_128?: string; thumb_512?: string; preview?: string };
};

export const mediaService = {
  async presignUpload(mrn: string, file: File) {
    if (!FEATURE_FLAGS.ENABLE_MEDIA) {
      throw new Error("Media feature disabled");
    }
    const r = await apiService.post(API_CONFIG.MEDIA.PRESIGN, {
      mrn,
      filename: file.name,
      content_type: file.type,
      size: file.size,
    });
    return r.data as {
      upload: { url: string; fields: Record<string, string> };
      s3_key: string;
    };
  },

  async finalize(
    mrn: string,
    s3_key: string,
    content_type: string,
    size: number,
    uploaded_by?: string,
  ) {
    if (!FEATURE_FLAGS.ENABLE_MEDIA) {
      throw new Error("Media feature disabled");
    }
    return apiService.post(API_CONFIG.MEDIA.FINALIZE, {
      mrn,
      s3_key,
      content_type,
      size,
      uploaded_by,
    });
  },

  async listImages(mrn: string) {
    if (!FEATURE_FLAGS.ENABLE_MEDIA) {
      return [] as Array<{ id: string; s3_key: string; variants?: Record<string, string>; created_at: string }>;
    }
    const r = await apiService.get(API_CONFIG.MEDIA.LIST_FOR_PATIENT, { mrn });
    return r.data as Array<{
      id: string;
      s3_key: string;
      variants?: Record<string, string>;
      created_at: string;
    }>;
  },

  async viewUrl(s3_key: string, variant?: string) {
    if (!FEATURE_FLAGS.ENABLE_MEDIA) {
      return { url: "", expires_in: 0 };
    }
    const r = await apiService.post(API_CONFIG.MEDIA.VIEW_URL, { s3_key, variant });
    return r.data as { url: string; expires_in: number };
  },

  // New: listPatientImages compatible with Images tab spec
  async listPatientImages(mrn: string): Promise<MediaItem[]> {
    return fetchWithFallback(
      async () => {
        const r = await apiService.get<MediaItem[]>(API_CONFIG.MEDIA.LIST_FOR_PATIENT, { mrn });
        return r;
      },
      [],
      FEATURE_FLAGS.ENABLE_MEDIA,
    );
  },

  // New: getSignedImageUrl compatible with Images tab spec
  async getSignedImageUrl(s3_key: string): Promise<string> {
    const res = await fetchWithFallback(
      async () => {
        const r = await apiService.post<{ url: string }>(API_CONFIG.MEDIA.VIEW_URL, { s3_key });
        return r;
      },
      { url: "" } as any,
      FEATURE_FLAGS.ENABLE_MEDIA,
    );
    return (res as any).url || "";
  },
};