import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DoctorsApi } from "@/lib/api/patients";
import { useState } from "react";

export default function DoctorsList() {
  const qc = useQueryClient();
  const [department, setDepartment] = useState("");
  const { data = [] } = useQuery({ queryKey: ["doctors", department], queryFn: () => DoctorsApi.list(department || undefined) });
  const create = useMutation({
    mutationFn: (body: any) => DoctorsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctors"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => DoctorsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctors"] }),
  });
  const [form, setForm] = useState({ name: "", email: "", department: "" });

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-xs text-muted-foreground">Department</label>
          <input className="border px-2 py-1 rounded" value={department} onChange={e=>setDepartment(e.target.value)} placeholder="Cardiology" />
        </div>
        <div className="ml-auto flex gap-2 items-end">
          <div>
            <label className="block text-xs text-muted-foreground">Name</label>
            <input className="border px-2 py-1 rounded" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">Email</label>
            <input className="border px-2 py-1 rounded" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">Department</label>
            <input className="border px-2 py-1 rounded" value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))} />
          </div>
          <button className="btn" onClick={()=>create.mutate(form)}>Create</button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead><tr><th className="text-left">Name</th><th className="text-left">Email</th><th>Department</th><th></th></tr></thead>
        <tbody>
          {data.map((d:any)=>(
            <tr key={d.doctorId} className="border-t">
              <td>{d.name}</td>
              <td>{d.email}</td>
              <td>{d.department}</td>
              <td className="text-right"><button className="text-red-600" onClick={()=>remove.mutate(d.doctorId)}>Delete</button></td>
            </tr>
          ))}
          {data.length===0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No doctors</td></tr>}
        </tbody>
      </table>
    </div>
  );
}