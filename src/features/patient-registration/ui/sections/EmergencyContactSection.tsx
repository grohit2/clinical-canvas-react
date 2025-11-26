import { useFormContext, Controller } from "react-hook-form";
import type { PatientFormValues } from "@entities/patient/model/validation";
import { ButtonGroup } from "./ButtonGroup";

export function EmergencyContactSection() {
  const { register, control } = useFormContext<PatientFormValues>();

  return (
    <div id="emergency-contact" className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-1">Emergency Contact</h2>
        <p className="text-sm text-gray-600">Contact person for emergencies</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Name</label>
          <input
            type="text"
            {...register("emergencyContact.name")}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship</label>
          <Controller
            name="emergencyContact.relationship"
            control={control}
            render={({ field }) => (
              <ButtonGroup
                options={[
                  { value: "Spouse", label: "Spouse" },
                  { value: "Parent", label: "Parent" },
                  { value: "Child", label: "Child" },
                  { value: "Sibling", label: "Sibling" },
                  { value: "Other", label: "Other" },
                ]}
                value={field.value || ""}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
          <input
            type="tel"
            {...register("emergencyContact.phone")}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="+91-9876543210"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Alt Phone</label>
          <input
            type="tel"
            {...register("emergencyContact.altPhone")}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="+91-9876543210"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
        <input
          type="email"
          {...register("emergencyContact.email")}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="contact@email.com"
        />
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-gray-700">Address</h4>
        <input
          type="text"
          {...register("emergencyContact.address.line1")}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Address Line 1"
        />
        <input
          type="text"
          {...register("emergencyContact.address.line2")}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Address Line 2 (Optional)"
        />
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            {...register("emergencyContact.address.city")}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="City"
          />
          <input
            type="text"
            {...register("emergencyContact.address.state")}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="State"
          />
          <input
            type="text"
            {...register("emergencyContact.address.postalCode")}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Postal Code"
          />
        </div>
        <input
          type="text"
          {...register("emergencyContact.address.country")}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Country"
        />
      </div>
    </div>
  );
}
