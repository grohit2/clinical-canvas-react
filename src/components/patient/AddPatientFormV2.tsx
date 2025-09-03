import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Patient } from "@/types/api";
import PatientRegistrationForm from "@/features/patient-details-input/PatientRegistrationForm";

export function AddPatientFormV2({
  open,
  onOpenChange,
  onAddPatient,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPatient?: (p: Patient) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden w-[95vw] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Add New Patient</DialogTitle>
        </DialogHeader>

        {/* Let the registration form drive its own scroll area */}
        <div className="h-[70vh]">
          <PatientRegistrationForm
            onAddPatient={onAddPatient}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
