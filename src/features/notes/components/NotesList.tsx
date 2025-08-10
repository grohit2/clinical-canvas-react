import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NotesApi } from "@/lib/api/patients";

export default function NotesList({ mrn }: { mrn: string }) {
  const [cursor, setCursor] = useState<string|undefined>(undefined);
  const { data } = useQuery({
    queryKey: ["notes", mrn, cursor],
    queryFn: () => NotesApi.list(mrn, 50, cursor),
  });
  const items = data?.items ?? [];
  return (
    <div className="space-y-3">
      {items.map(n => <article key={n.noteId} className="border rounded p-2"><div className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()} — {n.category}</div><p>{n.content}</p></article>)}
      <div>{data?.nextCursor ? <button className="btn" onClick={() => setCursor(data!.nextCursor!)}>Load more</button> : <span className="text-xs text-muted-foreground">No more</span>}</div>
    </div>
  );
}