import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDocuments } from "../lib/filesApi";
import DocumentCategory from "../components/DocumentCategory";
import ImageUploader from "../components/ImageUploader";
import FileGrid from "../components/FileGrid";
import { categoryToDocType } from "../lib/support";

const CATEGORY_TITLES: Record<string, string> = {
  preop_pics: "Pre-op",
  lab_reports: "Lab Reports",
  radiology: "Radiology",
  intraop_pics: "Intra-op",
  ot_notes: "OT Notes",
  postop_pics: "Post-op",
  discharge_pics: "Discharge",
};

export default function DocumentsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<any>(null);
  const [opened, setOpened] = useState<string | null>(null);

  async function refresh() {
    if (!id) return;
    setDocs(await getDocuments(id));
  }
  const debounceRef = useRef<number | null>(null);
  function debouncedRefresh(delay = 200) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      refresh();
    }, delay);
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cats = docs
    ? [
        { k: "preop_pics", count: docs.preopPics?.length ?? 0 },
        { k: "lab_reports", count: docs.labReports?.length ?? 0 },
        { k: "radiology", count: docs.radiology?.length ?? 0 },
        { k: "intraop_pics", count: docs.intraopPics?.length ?? 0 },
        { k: "ot_notes", count: docs.otNotes?.length ?? 0 },
        { k: "postop_pics", count: docs.postopPics?.length ?? 0 },
        { k: "discharge_pics", count: docs.dischargePics?.length ?? 0 },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Documents" showBack onBack={() => navigate(-1)} />
      <main className="p-4 space-y-4">
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {cats.map(({ k, count }) => (
              <DocumentCategory key={k} title={CATEGORY_TITLES[k]} count={count} onOpen={() => setOpened(k)} />
            ))}
          </div>
        </Card>

        {opened && id && (
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{CATEGORY_TITLES[opened]}</h3>
              <Button variant="outline" onClick={() => setOpened(null)}>
                Close
              </Button>
            </div>

            <ImageUploader
              mrn={id}
              ctx={{ kind: "doc", docType: categoryToDocType(opened) as any, category: opened as any }}
              onDone={() => debouncedRefresh()}
            />

            <FileGrid mrn={id} kind="doc" docType={categoryToDocType(opened)} detachable docCategory={opened} onDetached={() => debouncedRefresh()} />
          </Card>
        )}
      </main>
      <BottomBar />
    </div>
  );
}
