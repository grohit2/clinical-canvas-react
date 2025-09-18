import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PatientRegistrationForm from "../patinet_form/PatientRegistrationForm";
import api from "@/lib/api";

// Mock the API
vi.mock("@/lib/api", () => ({
  default: {
    patients: {
      create: vi.fn().mockResolvedValue({ 
        patientId: "p1", 
        patient: { 
          id: "p1", 
          name: "John Doe",
          department: "General",
          age: 33,
          sex: "male",
          pathway: "surgical"
        } 
      }),
    },
  },
}));

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("PatientRegistrationForm smoke test", () => {
  const mockOnAddPatient = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders all required form sections", () => {
    render(<PatientRegistrationForm onAddPatient={mockOnAddPatient} onClose={mockOnClose} />);

    // Check that key form elements are present
    expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^age$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /male/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /female/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/abc-1234567/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/cardiology, orthopedics/i)).toBeInTheDocument();
    
    // Done button should be present but disabled initially
    expect(screen.getByRole("button", { name: /done/i })).toBeDisabled();
  });

  test("submits when all required fields are filled", async () => {
    render(<PatientRegistrationForm onAddPatient={mockOnAddPatient} onClose={mockOnClose} />);

    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText(/full name/i), { 
      target: { value: "John Doe" } 
    });
    fireEvent.change(screen.getByPlaceholderText(/^age$/i), { 
      target: { value: "33" } 
    });

    // Select sex
    fireEvent.click(screen.getByRole("button", { name: /male/i }));

    // Fill MRN
    fireEvent.change(screen.getByPlaceholderText(/abc-1234567/i), { 
      target: { value: "MRN-123" } 
    });

    // Fill department
    fireEvent.change(screen.getByPlaceholderText(/cardiology, orthopedics/i), { 
      target: { value: "General Surgery" } 
    });

    // Select pathway
    fireEvent.click(screen.getByRole("button", { name: /surgical/i }));

    // Wait for Done button to be enabled
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /done/i })).toBeEnabled();
    });

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /done/i }));

    // Verify API was called
    await waitFor(() => {
      expect(api.patients.create).toHaveBeenCalledWith({
        registrationNumber: "MRN-123",
        name: "John Doe",
        department: "General Surgery", 
        age: 33,
        sex: "male",
        pathway: "surgical",
        diagnosis: "",
        comorbidities: [],
        assignedDoctorId: undefined,
      });
    });

    // Verify callbacks were called
    expect(mockOnAddPatient).toHaveBeenCalledWith({
      id: "p1", 
      name: "John Doe",
      department: "General",
      age: 33,
      sex: "male",
      pathway: "surgical"
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  test("handles API error gracefully", async () => {
    // Mock API to throw error
    vi.mocked(api.patients.create).mockRejectedValueOnce(new Error("API Error"));

    render(<PatientRegistrationForm onAddPatient={mockOnAddPatient} onClose={mockOnClose} />);

    // Fill required fields (minimal)
    fireEvent.change(screen.getByPlaceholderText(/full name/i), { 
      target: { value: "Jane Doe" } 
    });
    fireEvent.change(screen.getByPlaceholderText(/^age$/i), { 
      target: { value: "25" } 
    });
    fireEvent.click(screen.getByRole("button", { name: /female/i }));
    fireEvent.change(screen.getByPlaceholderText(/abc-1234567/i), { 
      target: { value: "MRN-456" } 
    });
    fireEvent.change(screen.getByPlaceholderText(/cardiology, orthopedics/i), { 
      target: { value: "Emergency" } 
    });
    fireEvent.click(screen.getByRole("button", { name: /emergency/i }));

    // Wait for Done button to be enabled and click it
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /done/i })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /done/i }));

    // Verify API was called but callbacks were not called due to error
    await waitFor(() => {
      expect(api.patients.create).toHaveBeenCalled();
    });
    
    // Should not call success callbacks on error
    expect(mockOnAddPatient).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test("validates required fields before enabling submit", () => {
    render(<PatientRegistrationForm onAddPatient={mockOnAddPatient} onClose={mockOnClose} />);

    // Initially disabled
    expect(screen.getByRole("button", { name: /done/i })).toBeDisabled();

    // Fill name only - still disabled
    fireEvent.change(screen.getByPlaceholderText(/full name/i), { 
      target: { value: "Test Name" } 
    });
    expect(screen.getByRole("button", { name: /done/i })).toBeDisabled();

    // Add age - still disabled
    fireEvent.change(screen.getByPlaceholderText(/^age$/i), { 
      target: { value: "30" } 
    });
    expect(screen.getByRole("button", { name: /done/i })).toBeDisabled();

    // Add sex - still disabled
    fireEvent.click(screen.getByRole("button", { name: /male/i }));
    expect(screen.getByRole("button", { name: /done/i })).toBeDisabled();

    // Add MRN - still disabled
    fireEvent.change(screen.getByPlaceholderText(/abc-1234567/i), { 
      target: { value: "TEST-MRN" } 
    });
    expect(screen.getByRole("button", { name: /done/i })).toBeDisabled();

    // Add department - still disabled (need pathway)
    fireEvent.change(screen.getByPlaceholderText(/cardiology, orthopedics/i), { 
      target: { value: "Test Dept" } 
    });
    expect(screen.getByRole("button", { name: /done/i })).toBeDisabled();

    // Add pathway - now should be enabled
    fireEvent.click(screen.getByRole("button", { name: /consultation/i }));
    expect(screen.getByRole("button", { name: /done/i })).toBeEnabled();
  });
});