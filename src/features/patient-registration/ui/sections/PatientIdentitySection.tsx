import { useFormContext, Controller } from "react-hook-form";
import type { PatientFormValues } from "@entities/patient/model/validation";
import { ButtonGroup } from "./ButtonGroup";

export function PatientIdentitySection() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PatientFormValues>();

  return (
    <div id="patient-details" className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-1">Patient Details</h2>
        <p className="text-sm text-gray-600">Basic patient information</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register("name")}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Enter patient's full name"
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Age <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            {...register("age", { valueAsNumber: true })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Age"
            min={0}
            max={150}
          />
          {errors.age && (
            <p className="text-red-500 text-xs mt-1">{errors.age.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Sex <span className="text-red-500">*</span>
          </label>
          <Controller
            name="sex"
            control={control}
            render={({ field }) => (
              <ButtonGroup
                options={[
                  { value: "M" as const, label: "Male" },
                  { value: "F" as const, label: "Female" },
                  { value: "OTHER" as const, label: "Other" },
                ]}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors.sex && (
            <p className="text-red-500 text-xs mt-1">{errors.sex.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
