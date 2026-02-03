import React from "react";
import ImageUploader from "./ImageUploader";
import type { UploadContext } from "../hooks/useUploader";

type Props = {
  patientId: string;
  ctx: UploadContext; // {kind:'note'|'med'|'task', refId}
  currentUserId?: string;
  onAdded?: (key: string) => void;
};

export const AttachBar: React.FC<Props> = ({ patientId, ctx, currentUserId, onAdded }) => {
  return (
    <div className="flex items-center justify-between py-2">
      <ImageUploader patientId={patientId} ctx={ctx} currentUserId={currentUserId} onDone={onAdded} />
    </div>
  );
};

export default AttachBar;

