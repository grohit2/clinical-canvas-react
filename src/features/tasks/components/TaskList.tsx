import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PatientTasksApi } from "@/lib/api/patients";
import { toast } from "@/components/ui/sonner";

export default function TaskList({ mrn }: { mrn: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["tasks", mrn], queryFn: () => PatientTasksApi.list(mrn, "open", 50) });
  const update = useMutation({
    mutationFn: ({ taskId, patch }: { taskId: string; patch: any }) => PatientTasksApi.update(mrn, taskId, patch),
    onMutate: async ({ taskId, patch }) => {
      const key = ["tasks", mrn]; await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<any[]>(key) || [];
      qc.setQueryData<any[]>(key, prev.map(t => t.taskId === taskId ? { ...t, ...patch } : t));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["tasks", mrn], ctx.prev); (toast as any)?.error?.("Failed to update task"); },
    onSuccess: () => (toast as any)?.success?.("Task updated"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks", mrn] }),
  });
  return (
    <div className="space-y-2">
      {(data ?? []).map(t => (
        <div key={t.taskId} className="border rounded p-2 flex items-center gap-2">
          <div className="font-medium flex-1">{t.title}</div>
          <div className="text-xs text-muted-foreground">{new Date(t.due).toLocaleString()}</div>
          <select className="border rounded px-1 py-0.5" value={t.status}
            onChange={e => update.mutate({ taskId: t.taskId, patch: { status: e.target.value } })}>
            <option>open</option><option>in-progress</option><option>done</option><option>cancelled</option>
          </select>
        </div>
      ))}
      {(data ?? []).length === 0 && <div className="text-sm text-muted-foreground">No open tasks</div>}
    </div>
  );
}