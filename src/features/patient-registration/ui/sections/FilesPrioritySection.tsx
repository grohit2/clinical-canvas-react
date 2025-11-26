import { useFormContext, Controller } from "react-hook-form";
import type { PatientFormValues } from "@entities/patient/model/validation";
import { ButtonGroup } from "./ButtonGroup";

export function FilesPrioritySection() {
  const { register, control, watch } = useFormContext<PatientFormValues>();
  const isUrgent = watch("isUrgent");

  return (
    <div id="files-priority" className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-1">Files & Priority</h2>
        <p className="text-sm text-gray-600">Documents and urgency settings</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Files URL</label>
        <input
          type="url"
          {...register("filesUrl")}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="https://example.com/documents"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Priority Level</label>
        <Controller
          name="isUrgent"
          control={control}
          render={({ field }) => (
            <ButtonGroup
              options={[
                { value: false, label: "Standard" },
                { value: true, label: "Urgent" },
              ]}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {isUrgent && (
        <div className="space-y-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div>
            <label className="block text-sm font-semibold text-red-700 mb-2">Urgent Reason</label>
            <textarea
              {...register("urgentReason")}
              className="w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none"
              rows={2}
              placeholder="Why is this urgent?"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-red-700 mb-2">Urgent Until</label>
            <input
              type="datetime-local"
              {...register("urgentUntil")}
              className="w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
