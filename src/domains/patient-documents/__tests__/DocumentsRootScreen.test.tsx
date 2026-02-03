import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { DocumentsRootPage } from "../DocumentsRootPage";

// Mock the document hooks
vi.mock("@entities/document", async () => {
  const actual = await vi.importActual("@entities/document");
  return {
    ...actual,
    useDocumentFolderSummaries: vi.fn(),
  };
});

// Mock navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { useDocumentFolderSummaries } from "@entities/document";

const mockFolderSummaries = [
  { category: "preop_pics" as const, count: 5, lastUpdatedAt: "2024-01-15T10:00:00Z" },
  { category: "lab_reports" as const, count: 3, lastUpdatedAt: "2024-01-14T10:00:00Z" },
  { category: "radiology" as const, count: 0, lastUpdatedAt: undefined },
  { category: "intraop_pics" as const, count: 2, lastUpdatedAt: "2024-01-13T10:00:00Z" },
  { category: "ot_notes" as const, count: 1, lastUpdatedAt: "2024-01-12T10:00:00Z" },
  { category: "postop_pics" as const, count: 4, lastUpdatedAt: "2024-01-11T10:00:00Z" },
  { category: "discharge_pics" as const, count: 0, lastUpdatedAt: undefined },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithRouter(patientId: string = "test-patient-id") {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/patients/${patientId}/docs`]}>
        <Routes>
          <Route path="/patients/:id/docs" element={<DocumentsRootPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("DocumentsRootPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it("renders loading state initially", () => {
    vi.mocked(useDocumentFolderSummaries).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    renderWithRouter();

    // Should show loading skeletons
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error state when fetch fails", () => {
    vi.mocked(useDocumentFolderSummaries).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed to fetch"),
    } as any);

    renderWithRouter();

    expect(screen.getByText(/Failed to load documents/i)).toBeInTheDocument();
  });

  it("renders folder grid when data loads successfully", async () => {
    vi.mocked(useDocumentFolderSummaries).mockReturnValue({
      data: mockFolderSummaries,
      isLoading: false,
      error: null,
    } as any);

    renderWithRouter();

    // Should render "All Documents" heading
    expect(screen.getByText("All Documents")).toBeInTheDocument();

    // Should show total document count
    // The text "Total: {n} documents across all categories" is split across elements
    await waitFor(() => {
      // Check that the total section exists by looking for "documents across all categories"
      expect(screen.getByText(/documents across all categories/i)).toBeInTheDocument();
    });
  });

  it("renders folder cards for each category", async () => {
    vi.mocked(useDocumentFolderSummaries).mockReturnValue({
      data: mockFolderSummaries,
      isLoading: false,
      error: null,
    } as any);

    renderWithRouter();

    // Should render folder cards (look for document counts)
    await waitFor(() => {
      expect(screen.getByText("5 Documents")).toBeInTheDocument();
      expect(screen.getByText("3 Documents")).toBeInTheDocument();
      expect(screen.getByText("2 Documents")).toBeInTheDocument();
      expect(screen.getByText("1 Document")).toBeInTheDocument(); // singular
      expect(screen.getByText("4 Documents")).toBeInTheDocument();
    });
  });

  it("navigates to category page when folder is clicked", async () => {
    vi.mocked(useDocumentFolderSummaries).mockReturnValue({
      data: mockFolderSummaries,
      isLoading: false,
      error: null,
    } as any);

    renderWithRouter("patient-123");

    // Find and click on the Pre-operative folder button
    const preopButton = screen.getByRole("button", { name: /Open Pre-operative/i });
    fireEvent.click(preopButton);

    expect(mockNavigate).toHaveBeenCalledWith("/patients/patient-123/docs/preop_pics");
  });

  it("renders FAB button for quick upload", () => {
    vi.mocked(useDocumentFolderSummaries).mockReturnValue({
      data: mockFolderSummaries,
      isLoading: false,
      error: null,
    } as any);

    renderWithRouter("patient-123");

    const fabButton = screen.getByTitle("Add Photo");
    expect(fabButton).toBeInTheDocument();
  });

  it("FAB navigates to upload when clicked", () => {
    vi.mocked(useDocumentFolderSummaries).mockReturnValue({
      data: mockFolderSummaries,
      isLoading: false,
      error: null,
    } as any);

    renderWithRouter("patient-123");

    const fabButton = screen.getByTitle("Add Photo");
    fireEvent.click(fabButton);

    expect(mockNavigate).toHaveBeenCalledWith("/patients/patient-123/docs/preop_pics");
  });

  it("handles empty summaries gracefully", () => {
    vi.mocked(useDocumentFolderSummaries).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderWithRouter();

    // Should still render the page without crashing
    expect(screen.getByText("All Documents")).toBeInTheDocument();
    expect(screen.getByText(/Total:/)).toBeInTheDocument();
    expect(screen.getByText(/0/)).toBeInTheDocument();
  });

  it("displays correct singular/plural for document counts", () => {
    vi.mocked(useDocumentFolderSummaries).mockReturnValue({
      data: [
        { category: "preop_pics" as const, count: 1, lastUpdatedAt: "2024-01-15T10:00:00Z" },
        { category: "lab_reports" as const, count: 2, lastUpdatedAt: "2024-01-14T10:00:00Z" },
      ],
      isLoading: false,
      error: null,
    } as any);

    renderWithRouter();

    expect(screen.getByText("1 Document")).toBeInTheDocument();
    expect(screen.getByText("2 Documents")).toBeInTheDocument();
  });
});
