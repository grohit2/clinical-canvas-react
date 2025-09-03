import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PatientRegistrationForm from "@/features/patient-details-input/PatientRegistrationForm";

vi.mock("@/lib/api", () => ({
  default: {
    patients: {
      create: vi.fn().mockResolvedValue({ patient: { id: "p1", name: "John" } }),
    },
  },
}));

test("submits when required fields filled", async () => {
  render(<PatientRegistrationForm onAddPatient={vi.fn()} />);

  fireEvent.change(screen.getByPlaceholderText(/enter patient\'s full name/i), { target: { value: "John" } });
  fireEvent.change(screen.getByPlaceholderText(/^age$/i), { target: { value: "33" } });

  // sex
  fireEvent.click(screen.getByRole("button", { name: /male/i }));

  // scheme
  fireEvent.click(screen.getByRole("button", { name: /^ASP$/i }));

  // mrn
  fireEvent.change(screen.getByPlaceholderText(/abc-1234567/i), { target: { value: "MRN-1" } });

  // department
  fireEvent.change(screen.getByPlaceholderText(/e\.g\., cardiology, orthopedics/i), { target: { value: "General" } });

  // pathway
  fireEvent.click(screen.getByRole("button", { name: /surgical/i }));

  // click Done
  fireEvent.click(screen.getByRole("button", { name: /done/i }));

  const api = (await import("@/lib/api")).default;
  await waitFor(() => expect(api.patients.create).toHaveBeenCalled());
});
