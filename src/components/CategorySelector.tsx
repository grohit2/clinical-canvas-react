import React from "react";
import { DocumentsCategory } from "../lib/filesApi";
import {
  Camera,
  FileText,
  Stethoscope,
  Scissors,
  ClipboardList,
  Activity,
  FileCheck,
  X,
} from "lucide-react";

const CATEGORY_CONFIG: Record<DocumentsCategory, {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  preop_pics: {
    title: "Pre-operative",
    icon: Camera,
    color: "text-blue-600",
  },
  lab_reports: {
    title: "Lab Reports",
    icon: FileText,
    color: "text-green-600",
  },
  radiology: {
    title: "Radiology",
    icon: Activity,
    color: "text-purple-600",
  },
  intraop_pics: {
    title: "Intra-operative",
    icon: Scissors,
    color: "text-red-600",
  },
  ot_notes: {
    title: "OT Notes",
    icon: ClipboardList,
    color: "text-orange-600",
  },
  postop_pics: {
    title: "Post-operative",
    icon: Stethoscope,
    color: "text-teal-600",
  },
  discharge_pics: {
    title: "Discharge",
    icon: FileCheck,
    color: "text-indigo-600",
  },
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: DocumentsCategory) => void;
};

export const CategorySelector: React.FC<Props> = ({ isOpen, onClose, onSelectCategory }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Select Document Category</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="grid gap-3">
            {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={category}
                  onClick={() => {
                    onSelectCategory(category as DocumentsCategory);
                    onClose();
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={`p-2 rounded-full bg-gray-100 ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{config.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategorySelector;