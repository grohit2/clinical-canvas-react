import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { mediaService } from "@/services/mediaService";
import { Card } from "@/components/ui/card";

export default function PatientGallery({ mrn }: { mrn: string }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["media", mrn],
    queryFn: () => mediaService.listPatientImages(mrn),
    staleTime: 30_000,
  });

  useEffect(() => {
    // prefetch signed URLs on hover later if desired
  }, []);

  if (isLoading) return <Card className="p-4">Loading images…</Card>;
  if (!items.length) return <Card className="p-4 text-sm text-muted-foreground">No images uploaded</Card>;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {items.map((it, idx) => {
        const key = it.variants?.thumb_512 || it.s3_key;
        return (
          <div key={it.s3_key + idx} className="aspect-square overflow-hidden rounded-md border">
            <img
              src={`/api/media/view-direct?s3_key=${encodeURIComponent(key)}`}
              alt="patient media"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        );
      })}
    </div>
  );
}