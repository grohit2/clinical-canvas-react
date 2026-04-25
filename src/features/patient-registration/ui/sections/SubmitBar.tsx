import { Check } from "lucide-react";

interface SubmitBarProps {
  onSubmit: () => void;
  isLoading: boolean;
  isValid: boolean;
  isEditMode: boolean;
}

export function SubmitBar({ onSubmit, isLoading, isValid, isEditMode }: SubmitBarProps) {
  if (!isValid) return null;

  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={isLoading}
      className={`fixed bottom-8 right-8 ${
        isLoading ? "opacity-70 cursor-not-allowed" : ""
      } bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all flex items-center space-x-2 z-50`}
    >
      <Check size={20} />
      <span className="font-semibold">
        {isLoading ? (isEditMode ? "Updating..." : "Adding...") : "Done"}
      </span>
    </button>
  );
}
