import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "@/app/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadS3 } from "@/components/ImageUploadS3";
import { listFiles, type FilesListItem } from "@/lib/filesApi";
import api from "@/lib/api";
import type { Note } from "@/types/api";
import { ArrowLeft } from "lucide-react";

export default function EditNote() {
  const { id: uid, noteId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Note['category'] | "">("");
  const [content, setContent] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<FilesListItem[]>([]);
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    document.title = "Edit Note | Clinical Canvas";
  }, []);

  useEffect(() => {
    if (!uid || !noteId) return;

    api.patients
      .get(uid)
      .then((p) => {
        setPatientName(p.name);
      })
      .catch(() => {});

    listFiles(uid, { kind: "note", refId: noteId })
      .then((response) => {
        setImages(response.items);
      })
      .catch(console.error);

    api.notes
      .list(uid, 50)
      .then((res) => {
        const foundNote = res.items.find((n) => n.noteId === noteId);
        if (foundNote) {
          setNote(foundNote);
          setCategory(foundNote.category);
          setContent(foundNote.content);
          setAuthorId(foundNote.authorId);
        }
      })
      .catch(() => {});
  }, [uid, noteId]);

  const handleSave = async () => {
    if (!uid || !noteId || !category || !content) return;
    setSubmitting(true);
    try {
      await api.notes.update(uid, noteId, { category, content });
      navigate(paths.noteDetail(uid, noteId));
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!note) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="p-4 flex items-center justify-between">
          <button
            className="text-gray-600 hover:text-gray-800"
            onClick={() => uid && noteId && navigate(paths.noteDetail(uid, noteId))}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Edit Note</h1>
          <button 
            className="text-blue-600 font-semibold text-sm"
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="note-type">
              Note Type
            </label>
            <Select value={category} onValueChange={v => setCategory(v as Note['category'])}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select note type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doctorNote">Doctor Note</SelectItem>
                <SelectItem value="nurseNote">Nurse Note</SelectItem>
                <SelectItem value="pharmacy">Pharmacy Note</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="note-content">
              Content
            </label>
            <Textarea
              id="note-content"
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter note content..."
            />
          </div>

          {/* Image Upload Component */}
          <ImageUploadS3
            patientId={uid!}
            kind="note"
            refId={noteId!}
            images={images}
            onImagesChange={setImages}
            maxImages={10}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-gray-200 bg-white">
        <p className="text-xs text-gray-500 text-center">Author: {authorId}</p>
        <p className="text-xs text-gray-500 text-center mt-1">
          Last updated: {formatDate(note.updatedAt)}
        </p>
      </footer>
    </div>
  );
}
