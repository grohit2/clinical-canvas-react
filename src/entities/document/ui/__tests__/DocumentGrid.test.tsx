import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { DocumentGrid } from "../DocumentGrid";
import type { DocumentItem } from "../../model/types";

const mockDocuments: DocumentItem[] = [
  {
    id: "doc-1",
    category: "preop_pics",
    name: "image-1.jpg",
    fileUrl: "https://cdn.example.com/image-1.jpg",
    thumbUrl: "https://cdn.example.com/thumb-1.jpg",
    uploadedAt: "2024-01-15T10:00:00Z",
    contentType: "image/jpeg",
    isImage: true,
    size: 1024,
  },
  {
    id: "doc-2",
    category: "preop_pics",
    name: "image-2.jpg",
    fileUrl: "https://cdn.example.com/image-2.jpg",
    thumbUrl: "https://cdn.example.com/thumb-2.jpg",
    uploadedAt: "2024-01-14T10:00:00Z",
    contentType: "image/jpeg",
    isImage: true,
    size: 2048,
  },
  {
    id: "doc-3",
    category: "lab_reports",
    name: "report.pdf",
    fileUrl: "https://cdn.example.com/report.pdf",
    thumbUrl: "https://cdn.example.com/thumb-report.jpg",
    uploadedAt: "2024-01-13T10:00:00Z",
    contentType: "application/pdf",
    isImage: false,
    size: 4096,
  },
];

describe("DocumentGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all documents", () => {
      render(<DocumentGrid documents={mockDocuments} />);

      // Images have alt text
      expect(screen.getByAltText("image-1.jpg")).toBeInTheDocument();
      expect(screen.getByAltText("image-2.jpg")).toBeInTheDocument();
      // Non-image documents show their name as text content (appears multiple times in card)
      expect(screen.getAllByText("report.pdf").length).toBeGreaterThan(0);
    });

    it("renders empty message when no documents", () => {
      render(<DocumentGrid documents={[]} />);

      expect(screen.getByText("No documents found")).toBeInTheDocument();
    });

    it("renders custom empty message", () => {
      render(<DocumentGrid documents={[]} emptyMessage="Upload your first photo" />);

      expect(screen.getByText("Upload your first photo")).toBeInTheDocument();
    });
  });

  describe("Lightbox open/close behavior", () => {
    // Helper to find a document card by its image alt text
    const getCardByImageAlt = (alt: string) => {
      const img = screen.getByAltText(alt);
      // The card is a div wrapper containing the img
      return img.closest(".aspect-square");
    };

    // Helper to find card by document name text (for non-images)
    const getCardByText = (text: string) => {
      const els = screen.getAllByText(text);
      return els[0].closest(".aspect-square");
    };

    it("opens lightbox when clicking on an image document", () => {
      render(<DocumentGrid documents={mockDocuments} />);

      // Click on first image card by alt text
      const firstCard = getCardByImageAlt("image-1.jpg");
      fireEvent.click(firstCard!);

      // Lightbox should be visible
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      // Should show the counter
      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });

    it("closes lightbox when close button is clicked", () => {
      render(<DocumentGrid documents={mockDocuments} />);

      // Open lightbox
      const firstCard = getCardByImageAlt("image-1.jpg");
      fireEvent.click(firstCard!);

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Close lightbox
      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      // Lightbox should be gone
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes lightbox when Escape key is pressed", () => {
      render(<DocumentGrid documents={mockDocuments} />);

      // Open lightbox
      const firstCard = getCardByImageAlt("image-1.jpg");
      fireEvent.click(firstCard!);

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(window, { key: "Escape" });

      // Lightbox should be gone
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("navigates to next image with right arrow key", () => {
      render(<DocumentGrid documents={mockDocuments} />);

      // Open lightbox at first image
      const firstCard = getCardByImageAlt("image-1.jpg");
      fireEvent.click(firstCard!);

      expect(screen.getByText("1 / 3")).toBeInTheDocument();

      // Press right arrow
      fireEvent.keyDown(window, { key: "ArrowRight" });

      // Should show second image
      expect(screen.getByText("2 / 3")).toBeInTheDocument();
    });

    it("navigates to previous image with left arrow key", () => {
      render(<DocumentGrid documents={mockDocuments} />);

      // Open lightbox at second image
      const secondCard = getCardByImageAlt("image-2.jpg");
      fireEvent.click(secondCard!);

      expect(screen.getByText("2 / 3")).toBeInTheDocument();

      // Press left arrow
      fireEvent.keyDown(window, { key: "ArrowLeft" });

      // Should show first image
      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });

    it("does not navigate past first image", () => {
      render(<DocumentGrid documents={mockDocuments} />);

      // Open lightbox at first image
      const firstCard = getCardByImageAlt("image-1.jpg");
      fireEvent.click(firstCard!);

      expect(screen.getByText("1 / 3")).toBeInTheDocument();

      // Press left arrow - should stay at first
      fireEvent.keyDown(window, { key: "ArrowLeft" });

      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });

    it("does not navigate past last image", () => {
      render(<DocumentGrid documents={mockDocuments} />);

      // Open lightbox at second image (image-2.jpg)
      const secondCard = getCardByImageAlt("image-2.jpg");
      fireEvent.click(secondCard!);

      expect(screen.getByText("2 / 3")).toBeInTheDocument();

      // Press right arrow - should go to 3/3
      fireEvent.keyDown(window, { key: "ArrowRight" });
      expect(screen.getByText("3 / 3")).toBeInTheDocument();

      // Press right arrow again - should stay at last
      fireEvent.keyDown(window, { key: "ArrowRight" });
      expect(screen.getByText("3 / 3")).toBeInTheDocument();
    });

    it("does not open lightbox for non-image documents", () => {
      const nonImageDocs: DocumentItem[] = [
        {
          id: "doc-1",
          category: "lab_reports",
          name: "report.pdf",
          fileUrl: "https://cdn.example.com/report.pdf",
          thumbUrl: "",
          uploadedAt: "2024-01-15T10:00:00Z",
          contentType: "application/pdf",
          isImage: false,
          size: 4096,
        },
      ];

      render(<DocumentGrid documents={nonImageDocs} />);

      // Click on non-image card by text (text appears multiple times in card)
      const pdfCard = screen.getAllByText("report.pdf")[0].closest(".aspect-square");
      fireEvent.click(pdfCard!);

      // Lightbox should NOT open for non-images
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Selection mode", () => {
    it("toggles selection when card is clicked in selection mode", () => {
      const onSelectionChange = vi.fn();
      render(
        <DocumentGrid
          documents={mockDocuments}
          selectionMode={true}
          selectedIds={new Set()}
          onSelectionChange={onSelectionChange}
        />
      );

      // Find card by alt text for images
      const firstCard = screen.getByAltText("image-1.jpg").closest(".aspect-square");
      fireEvent.click(firstCard!);

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(["doc-1"]));
    });

    it("deselects when already selected item is clicked", () => {
      const onSelectionChange = vi.fn();
      render(
        <DocumentGrid
          documents={mockDocuments}
          selectionMode={true}
          selectedIds={new Set(["doc-1"])}
          onSelectionChange={onSelectionChange}
        />
      );

      const firstCard = screen.getByAltText("image-1.jpg").closest(".aspect-square");
      fireEvent.click(firstCard!);

      expect(onSelectionChange).toHaveBeenCalledWith(new Set());
    });
  });
});
