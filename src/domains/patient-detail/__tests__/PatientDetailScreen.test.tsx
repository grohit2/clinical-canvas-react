import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { api } from "@/lib/api";
import { PatientDetailPage } from "../PatientDetailPage";

vi.mock("@/lib/api", async (orig) => {
  const actual = await orig();
  return {
    api: {
      ...actual.api,
      patients: {
        ...actual.api.patients,
        get: vi.fn(),
      },
    },
  };
});

const queryClient = new QueryClient();

function renderWithRouter(initialPath: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/patients/:id" element={<PatientDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("PatientDetailPage", () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it("renders patient summary when data loads", async () => {
    vi.mocked(api.patients.get).mockResolvedValueOnce({
      id: "p1",
      name: "Jane Roe",
      latestMrn: "MRN-1",
      scheme: "ASP",
      currentState: "onboarding",
      department: "General",
      status: "ACTIVE",
    } as any);

    renderWithRouter("/patients/p1");

    await waitFor(() => expect(screen.getByText("Jane Roe")).toBeInTheDocument());
    // The summary shows "MRN: MRN-1 • Scheme: ASP • Pathway: —"
    // MRN text might appear multiple times, so use getAllByText
    expect(screen.getAllByText(/MRN: MRN-1/).length).toBeGreaterThan(0);
  });
});
