import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "@/app/navigation";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DocumentsRoot() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Documents" showBack onBack={() => navigate(-1)} />
      <main className="p-4">
        <Card className="p-6 space-y-3">
          <h2 className="text-xl font-semibold">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Folder grid view goes here. This route is wired; replace this placeholder
            with the full DocumentsRoot implementation when available.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => id && navigate(paths.docsLegacyRoot(id))}>Open legacy Documents</Button>
          </div>
        </Card>
      </main>
      <BottomBar />
    </div>
  );
}
