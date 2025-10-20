import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "@/app/navigation";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { listFiles, type FilesListItem } from "@/lib/filesApi";
import type { Note } from "@/types/api";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

export default function NoteDetail() {
  const { id: uid, noteId } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [images, setImages] = useState<FilesListItem[]>([]);

  useEffect(() => {
    document.title = "Note Details | Clinical Canvas";
  }, []);

  useEffect(() => {
    if (!uid || !noteId) return;

    api.notes
      .list(uid, 50)
      .then((res) => {
        const foundNote = res.items.find((n) => n.noteId === noteId);
        if (foundNote) {
          setNote(foundNote);
        }
      })
      .catch(() => {});

    listFiles(uid, { kind: "note", refId: noteId })
      .then((response) => {
        setImages(response.items);
      })
      .catch(console.error);
  }, [uid, noteId]);

  const handleDelete = async () => {
    if (!uid || !noteId) return;
    try {
      await api.notes.remove(uid, noteId);
      navigate(paths.patient(uid));
    } catch (e) {
      console.error(e);
    }
  };

  if (!note) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center bg-slate-50 p-4 pb-2 justify-between">
        <button 
          className="text-gray-800 flex items-center justify-center w-12 h-12"
          onClick={() => uid && navigate(paths.patient(uid))}
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-gray-800 text-lg font-bold flex-1 text-center">Note Details</h2>
        <div className="flex w-12 items-center justify-end">
          <button
            className="flex items-center justify-center w-12 h-12 text-gray-800 hover:bg-gray-100 rounded-lg"
            onClick={() => uid && noteId && navigate(paths.noteEdit(uid, noteId))}
          >
            <Pencil size={24} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="text-gray-800 text-lg font-bold px-4 pb-2 pt-4">Note</h3>
        <p className="text-gray-800 text-base px-4 pb-3 pt-1">{note.content}</p>
        
        {/* Images */}
        {images.length > 0 && images.map((image, index) => (
          <div key={image.key} className="mb-4">
            <div className="w-full p-4">
              <div className="w-full aspect-[3/2] rounded-lg overflow-hidden">
                <img
                  src={image.cdnUrl ?? image.url ?? ''}
                  alt={`Note image ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
            <p className="text-blue-600 text-sm px-4 pb-3">
              Image {index + 1}/{images.length} · Added on {formatDate(image.lastModified || note?.createdAt || '')} by {note?.authorId || 'Unknown'}
            </p>
          </div>
        ))}

        <p className="text-blue-600 text-sm px-4 pb-3 pt-1">
          Added by Dr. Olivia Bennett on {formatDate(note.createdAt)}
        </p>
      </div>

      {/* Bottom Actions */}
      <div className="bg-slate-50">
        <div className="px-4 py-2">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-col items-center gap-2 bg-slate-50 py-2.5 text-center">
              <button
                className="rounded-full bg-gray-200 p-2.5 hover:bg-gray-300 transition-colors"
                onClick={handleDelete}
              >
                <Trash2 className="text-gray-800 w-5 h-5" />
              </button>
              <p className="text-gray-800 text-sm font-medium">Delete</p>
            </div>
          </div>
        </div>
        <div className="h-5 bg-slate-50"></div>
      </div>
    </div>
  );
}
