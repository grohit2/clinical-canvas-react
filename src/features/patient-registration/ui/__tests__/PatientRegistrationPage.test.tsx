import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { PatientRegistrationPage } from "../PatientRegistrationPage";

// Mock the API
vi.mock("@/lib/api", () => ({
  default: {
    patients: {
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock toast
vi.mock("@shared/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock useParams to control mode
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({}), // No id = create mode
  };
});

describe("PatientRegistrationPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <PatientRegistrationPage />
        </BrowserRouter>
      </QueryClientProvider>
    );

  it("should render the page title for create mode", () => {
    renderPage();
    expect(screen.getByText("Add New Patient")).toBeInTheDocument();
  });

  it("should render back button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument();
  });

  it("should render Patient Details section", () => {
    renderPage();
    expect(screen.getByText("Patient Details")).toBeInTheDocument();
    expect(screen.getByText("Basic patient information")).toBeInTheDocument();
  });

  it("should render name input field", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Enter patient's full name")).toBeInTheDocument();
  });

  it("should render age input field", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Age")).toBeInTheDocument();
  });

  it("should render sex selection buttons", () => {
    renderPage();
    expect(screen.getByText("Male")).toBeInTheDocument();
    expect(screen.getByText("Female")).toBeInTheDocument();
    // "Other" appears in multiple button groups, use getAllByText
    expect(screen.getAllByText("Other").length).toBeGreaterThan(0);
  });

  it("should render Registration Details section", () => {
    renderPage();
    expect(screen.getByText("Registration Details")).toBeInTheDocument();
  });

  it("should render scheme options", () => {
    renderPage();
    expect(screen.getByText("ASP")).toBeInTheDocument();
    expect(screen.getByText("NAM")).toBeInTheDocument();
    expect(screen.getByText("EHS")).toBeInTheDocument();
    expect(screen.getByText("PAID")).toBeInTheDocument();
    expect(screen.getByText("OTHERS")).toBeInTheDocument();
  });

  it("should render Medical Details section", () => {
    renderPage();
    expect(screen.getByText("Medical Details")).toBeInTheDocument();
  });

  it("should render pathway options", () => {
    renderPage();
    expect(screen.getByText("Surgical")).toBeInTheDocument();
    expect(screen.getByText("Emergency")).toBeInTheDocument();
    expect(screen.getByText("Consultation")).toBeInTheDocument();
  });

  it("should render comorbidity options", () => {
    renderPage();
    expect(screen.getByText("T2DM")).toBeInTheDocument();
    expect(screen.getByText("HTN")).toBeInTheDocument();
    expect(screen.getByText("CAD")).toBeInTheDocument();
  });

  it("should render Files & Priority section", () => {
    renderPage();
    expect(screen.getByText("Files & Priority")).toBeInTheDocument();
  });

  it("should render Emergency Contact section", () => {
    renderPage();
    expect(screen.getByText("Emergency Contact")).toBeInTheDocument();
  });

  it("should render sidebar navigation", () => {
    renderPage();
    expect(screen.getByText("PD")).toBeInTheDocument();
    expect(screen.getByText("REG")).toBeInTheDocument();
    expect(screen.getByText("MD")).toBeInTheDocument();
    expect(screen.getByText("FILES")).toBeInTheDocument();
    expect(screen.getByText("EMER CONTACT")).toBeInTheDocument();
  });
});
