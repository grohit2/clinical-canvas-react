import React from "react";

type Props = {
  title: string;
  count: number;
  onOpen: () => void;
};

export const DocumentCategory: React.FC<Props> = ({ title, count, onOpen }) => {
  const color = count > 0 ? "#2563eb" : "#9ca3af";
  return (
    <button onClick={onOpen} className="flex items-center justify-between border rounded-md px-3 py-2" style={{ borderColor: color, color }}>
      <div className="font-medium">{title}</div>
      <div className="text-xs bg-muted rounded px-2 py-0.5">{count}</div>
    </button>
  );
};

export default DocumentCategory;

