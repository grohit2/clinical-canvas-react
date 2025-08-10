import { useQuery } from "@tanstack/react-query";

async function loadProfile() {
  const raw = localStorage.getItem("cc.profile");
  if (raw) return JSON.parse(raw);
  return {
    userId: "doc-001",
    doctorId: "doc-001",
    doctorName: "Dr. Sarah Wilson",
    email: "sarah.wilson@hospital.com",
    department: "surgery1",
  };
}

export function useProfile() {
  const { data } = useQuery({ queryKey: ["profile"], queryFn: loadProfile, staleTime: 5 * 60_000 });
  return data as { userId: string; doctorId?: string; doctorName?: string; email?: string; department?: string } | undefined;
}