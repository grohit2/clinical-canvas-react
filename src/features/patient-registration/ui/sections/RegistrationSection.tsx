import { useRef } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Calendar, X } from "lucide-react";
import type { PatientFormValues } from "@entities/patient/model/validation";
import { SCHEME_OPTIONS } from "@entities/patient/model/validation";
import { MrnEditor } from "@entities/patient/ui";
import { ButtonGroup } from "./ButtonGroup";

interface RegistrationSectionProps {
  isEditMode: boolean;
  patientId?: string;
}

export function RegistrationSection({ isEditMode, patientId }: RegistrationSectionProps) {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<PatientFormValues>();

  const surgeryDateRef = useRef<HTMLInputElement | null>(null);
  const surgeryDate = watch("surgeryDate");

  return (
    <div id="registration" className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-1">Registration Details</h2>
        <p className="text-sm text-gray-600">Hospital registration and department information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Scheme <span className="text-red-500">*</span>
          </label>
          <Controller
            name="scheme"
            control={control}
            render={({ field }) => (
              <ButtonGroup
                options={SCHEME_OPTIONS.map((option) => ({ value: option, label: option }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors.scheme && (
            <p className="text-red-500 text-xs mt-1">{errors.scheme.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Room Number (R#)
          </label>
          <input
            type="text"
            {...register("roomNumber")}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Procedure Name
        </label>
        <input
          type="text"
          {...register("procedureName")}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Optional"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Surgery Code</label>
          <input
            type="text"
            {...register("surgeryCode")}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="e.g., KNEE-ARTHRO"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Surgery Date</label>
          <div className="relative">
            <input
              type="date"
              {...register("surgeryDate")}
              ref={(e) => {
                register("surgeryDate").ref(e);
                surgeryDateRef.current = e;
              }}
              className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-600"
              onClick={() => {
                if (isEditMode && surgeryDate) {
                  setValue("surgeryDate", "");
                } else {
                  try {
                    (surgeryDateRef.current as HTMLInputElement & { showPicker?: () => void })?.showPicker?.();
                  } catch {
                    // showPicker not supported
                  }
                  surgeryDateRef.current?.focus();
                }
              }}
              aria-label={isEditMode && surgeryDate ? "Clear surgery date" : "Pick surgery date"}
            >
              {isEditMode && surgeryDate ? (
                <X className="h-4 w-4" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isEditMode && patientId ? (
        <div className="space-y-3">
          <MrnEditor patientId={patientId} />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <ButtonGroup
                  options={[
                    { value: "ACTIVE" as const, label: "Active" },
                    { value: "INACTIVE" as const, label: "Inactive" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              MRN <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register("mrn")}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="ABC-1234567"
            />
            {errors.mrn && (
              <p className="text-red-500 text-xs mt-1">{errors.mrn.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <ButtonGroup
                  options={[
                    { value: "ACTIVE" as const, label: "Active" },
                    { value: "INACTIVE" as const, label: "Inactive" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Department <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register("department")}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="e.g., Cardiology, Orthopedics"
        />
        {errors.department && (
          <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>
        )}
      </div>
    </div>
  );
}
