import { useQuery } from "@tanstack/react-query";
import { MedsApi } from "@/lib/api/patients";

export default function MedicationList({ mrn }: { mrn: string }) {
  const { data } = useQuery({
    queryKey: ["meds", mrn],
    queryFn: () => MedsApi.list(mrn, 1, 50),
  });
  const items = data?.items ?? [];
  return <ul className="space-y-1">{items.map(m => <li key={m.medId} className="border rounded p-2">{m.name} — {m.dose} {m.route} / {m.freq}</li>)}</ul>;
}