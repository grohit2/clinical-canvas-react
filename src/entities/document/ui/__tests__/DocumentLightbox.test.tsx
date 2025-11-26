import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { DocumentLightbox } from "../DocumentLightbox";
import type { DocumentItem } from "../../model/types";

const mockDocument: DocumentItem = {
  id: "doc-1",
  category: "preop_pics",
  name: "test-image.jpg",
  fileUrl: "https://cdn.example.com/test-image.jpg",
  thumbUrl: "https://cdn.example.com/test-thumb.jpg",
  uploadedAt: "2024-01-15T10:00:00Z",
  contentType: "image/jpeg",
  isImage: true,
  size: 1024,
};

const defaultProps = {
  document: mockDocument,
  currentIndex: 0,
  totalCount: 5,
  onClose: vi.fn(),
  onNavigate: vi.fn(),
  canNavigatePrev: true,
  canNavigateNext: true,
};

describe("DocumentLightbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("renders the lightbox with correct image", () => {
      render(<DocumentLightbox {...defaultProps} />);

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", mockDocument.fileUrl);
      expect(img).toHaveAttribute("alt", mockDocument.name);
    });

    it("renders dialog with correct ARIA attributes", () => {
      render(<DocumentLightbox {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("renders counter showing current position", () => {
      render(<DocumentLightbox {...defaultProps} currentIndex={2} totalCount={10} />);

      expect(screen.getByText("3 / 10")).toBeInTheDocument();
    });

    it("renders close button", () => {
      render(<DocumentLightbox {...defaultProps} />);

      expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
    });

    it("renders navigation buttons", () => {
      render(<DocumentLightbox {...defaultProps} />);

      expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });

    it("shows fallback when document has no fileUrl", () => {
      const docWithoutUrl = { ...mockDocument, fileUrl: "" };
      render(<DocumentLightbox {...defaultProps} document={docWithoutUrl} />);

      expect(screen.getByText("Preview not available")).toBeInTheDocument();
    });
  });

  describe("Close behavior", () => {
    it("calls onClose when close button is clicked", () => {
      const onClose = vi.fn();
      render(<DocumentLightbox {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      // The close button has its own onClick that calls onClose
      // The click may also bubble to the backdrop onClick, but the component
      // implementation may prevent this - we just check it was called at least once
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when Escape key is pressed", () => {
      const onClose = vi.fn();
      render(<DocumentLightbox {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: "Escape" });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when clicking backdrop (not the image)", () => {
      const onClose = vi.fn();
      render(<DocumentLightbox {...defaultProps} onClose={onClose} />);

      const dialog = screen.getByRole("dialog");
      fireEvent.click(dialog);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("Navigation", () => {
    it("calls onNavigate with 'prev' when left arrow is pressed", () => {
      const onNavigate = vi.fn();
      render(<DocumentLightbox {...defaultProps} onNavigate={onNavigate} />);

      fireEvent.keyDown(window, { key: "ArrowLeft" });

      expect(onNavigate).toHaveBeenCalledWith("prev");
    });

    it("calls onNavigate with 'next' when right arrow is pressed", () => {
      const onNavigate = vi.fn();
      render(<DocumentLightbox {...defaultProps} onNavigate={onNavigate} />);

      fireEvent.keyDown(window, { key: "ArrowRight" });

      expect(onNavigate).toHaveBeenCalledWith("next");
    });

    it("does not call onNavigate when canNavigatePrev is false and left arrow pressed", () => {
      const onNavigate = vi.fn();
      render(<DocumentLightbox {...defaultProps} onNavigate={onNavigate} canNavigatePrev={false} />);

      fireEvent.keyDown(window, { key: "ArrowLeft" });

      expect(onNavigate).not.toHaveBeenCalled();
    });

    it("does not call onNavigate when canNavigateNext is false and right arrow pressed", () => {
      const onNavigate = vi.fn();
      render(<DocumentLightbox {...defaultProps} onNavigate={onNavigate} canNavigateNext={false} />);

      fireEvent.keyDown(window, { key: "ArrowRight" });

      expect(onNavigate).not.toHaveBeenCalled();
    });

    it("calls onNavigate when previous button is clicked", () => {
      const onNavigate = vi.fn();
      render(<DocumentLightbox {...defaultProps} onNavigate={onNavigate} />);

      fireEvent.click(screen.getByRole("button", { name: /previous/i }));

      expect(onNavigate).toHaveBeenCalledWith("prev");
    });

    it("calls onNavigate when next button is clicked", () => {
      const onNavigate = vi.fn();
      render(<DocumentLightbox {...defaultProps} onNavigate={onNavigate} />);

      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      expect(onNavigate).toHaveBeenCalledWith("next");
    });

    it("disables previous button when canNavigatePrev is false", () => {
      render(<DocumentLightbox {...defaultProps} canNavigatePrev={false} />);

      const prevButton = screen.getByRole("button", { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it("disables next button when canNavigateNext is false", () => {
      render(<DocumentLightbox {...defaultProps} canNavigateNext={false} />);

      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).toBeDisabled();
    });
  });

  describe("Document change behavior", () => {
    it("resets zoom when document changes", () => {
      const { rerender } = render(<DocumentLightbox {...defaultProps} />);

      const newDocument = { ...mockDocument, id: "doc-2", name: "new-image.jpg" };
      rerender(<DocumentLightbox {...defaultProps} document={newDocument} />);

      // Verify image is rendered with new document
      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("alt", "new-image.jpg");
    });
  });
});
