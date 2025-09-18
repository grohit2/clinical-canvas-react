import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DocumentsFolder() {
  const { id, category } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Documents" showBack onBack={() => navigate(-1)} />
      <main className="p-4">
        <Card className="p-6 space-y-3">
          <h2 className="text-xl font-semibold">Folder: {category}</h2>
          <p className="text-sm text-muted-foreground">
            Detail folder view goes here with sort, grid, and uploader. This route is wired; replace this placeholder with the full DocumentsFolder implementation when available.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate(`/patients/${id}/documents`)}>Open legacy Documents</Button>
          </div>
        </Card>
      </main>
      <BottomBar />
    </div>
  );
}

