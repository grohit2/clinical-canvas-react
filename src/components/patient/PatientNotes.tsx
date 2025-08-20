import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Note } from "@/types/api";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import AttachBar from "@/components/AttachBar";
import FileGrid from "@/components/FileGrid";

interface PatientNotesProps {
  patientId: string;
}

export function PatientNotes({ patientId }: PatientNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [gridTokens, setGridTokens] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    api.notes
      .list(patientId, 50)
      .then((res) => setNotes(res.items))
      .catch((err) => console.error(err));
  }, [patientId]);

  if (notes.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-lg border border-dashed">
        No clinical notes for this patient
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <Card key={note.noteId} className="p-3 space-y-2">
          <div className="flex items-start justify-between mb-2">
            <Badge variant="outline" className="capitalize">
              {note.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(note.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Author: {note.authorId}</span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2"
              onClick={() => navigate(`/patients/${patientId}/notes/${note.noteId}/edit`)}
            >
              Edit
            </Button>
          </div>
          <div className="border-t pt-2">
            <AttachBar
              mrn={patientId}
              ctx={{ kind: "note", refId: note.noteId }}
              onAdded={() => setGridTokens((t) => ({ ...t, [note.noteId]: (t[note.noteId] || 0) + 1 }))}
            />
            <div className="mt-2">
              <FileGrid mrn={patientId} kind="note" refId={note.noteId} detachable refreshToken={gridTokens[note.noteId] || 0} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
