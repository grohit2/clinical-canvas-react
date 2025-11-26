import { useFormContext, Controller } from "react-hook-form";
import type { PatientFormValues } from "@entities/patient/model/validation";
import { PATHWAY_OPTIONS, COMORBIDITY_OPTIONS } from "@entities/patient/model/validation";
import { ButtonGroup } from "./ButtonGroup";

export function MedicalDetailsSection() {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<PatientFormValues>();

  const comorbidities = watch("comorbidities");
  const includeOtherComorbidity = watch("includeOtherComorbidity");

  const toggleComorbidity = (value: string) => {
    if (value === "OTHER") {
      setValue("includeOtherComorbidity", !includeOtherComorbidity);
      if (includeOtherComorbidity) {
        setValue("otherComorbidity", "");
      }
      return;
    }

    const normalized = value.toUpperCase();
    const exists = comorbidities.includes(normalized);
    const next = exists
      ? comorbidities.filter((item) => item !== normalized)
      : [...comorbidities, normalized];
    setValue("comorbidities", next);
  };

  const buildPreview = () => {
    const tokens = [...comorbidities];
    if (includeOtherComorbidity) {
      const other = watch("otherComorbidity")?.trim().toUpperCase();
      if (other) tokens.push(other);
    }
    return tokens;
  };

  const previewTokens = buildPreview();

  return (
    <div id="medical-details" className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-1">Medical Details</h2>
        <p className="text-sm text-gray-600">Treatment pathway and medical information</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Pathway <span className="text-red-500">*</span>
          </label>
          <Controller
            name="pathway"
            control={control}
            render={({ field }) => (
              <ButtonGroup
                options={PATHWAY_OPTIONS.map((option) => ({
                  value: option,
                  label: option.charAt(0).toUpperCase() + option.slice(1),
                }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors.pathway && (
            <p className="text-red-500 text-xs mt-1">{errors.pathway.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned Doctor</label>
          <input
            type="text"
            {...register("assignedDoctor")}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Dr. Smith"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Diagnosis</label>
        <textarea
          {...register("diagnosis")}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
          rows={2}
          placeholder="Primary diagnosis"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Comorbidities</label>
        <div className="flex flex-wrap gap-2">
          {COMORBIDITY_OPTIONS.map((option) => {
            const isOther = option === "OTHER";
            const isActive = isOther
              ? includeOtherComorbidity
              : comorbidities.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleComorbidity(option)}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                }`}
              >
                {option === "OTHER" ? "Other" : option}
              </button>
            );
          })}
        </div>
        {includeOtherComorbidity && (
          <input
            type="text"
            {...register("otherComorbidity")}
            className="mt-3 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Specify other comorbidity"
            onChange={(e) => setValue("otherComorbidity", e.target.value.toUpperCase())}
          />
        )}
        {errors.otherComorbidity && (
          <p className="text-red-500 text-xs mt-1">{errors.otherComorbidity.message}</p>
        )}
        {previewTokens.length > 0 && (
          <p className="mt-2 text-xs text-gray-600">
            Will be saved as{" "}
            <span className="font-semibold text-gray-800">
              {previewTokens.join(" + ")}
            </span>
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Doctor ID</label>
        <input
          type="text"
          {...register("assignedDoctorId")}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="dr_smith_001"
        />
      </div>
    </div>
  );
}
