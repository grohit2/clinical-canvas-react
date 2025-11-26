import { renderHook, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useUnsavedGuard, useBeforeUnloadGuard } from "../use-unsaved-guard";
import React from "react";

// Wrapper component with router context
function RouterWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/current"]}>
      <Routes>
        <Route path="/current" element={<>{children}</>} />
        <Route path="/other" element={<div>Other Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("useUnsavedGuard", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    vi.clearAllMocks();
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  describe("beforeunload behavior", () => {
    it("adds beforeunload listener when mounted", () => {
      renderHook(() => useUnsavedGuard(true), { wrapper: RouterWrapper });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function)
      );
    });

    it("removes beforeunload listener when unmounted", () => {
      const { unmount } = renderHook(() => useUnsavedGuard(true), {
        wrapper: RouterWrapper,
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function)
      );
    });

    it("triggers beforeunload only when isDirty is true", () => {
      renderHook(() => useUnsavedGuard(true), { wrapper: RouterWrapper });

      // Get the handler that was registered
      const handler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === "beforeunload"
      )?.[1] as EventListener;

      expect(handler).toBeDefined();

      // Create a mock event
      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: "",
      } as unknown as BeforeUnloadEvent;

      // Call the handler
      handler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.returnValue).toBeTruthy();
    });

    it("does not trigger when isDirty is false", () => {
      renderHook(() => useUnsavedGuard(false), { wrapper: RouterWrapper });

      const handler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === "beforeunload"
      )?.[1] as EventListener;

      expect(handler).toBeDefined();

      const mockEvent = {
        preventDefault: vi.fn(),
        returnValue: "",
      } as unknown as BeforeUnloadEvent;

      handler(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("router blocking behavior", () => {
    it("returns isBlocked as false when not dirty", () => {
      const { result } = renderHook(() => useUnsavedGuard(false), {
        wrapper: RouterWrapper,
      });

      expect(result.current.isBlocked).toBe(false);
    });

    it("provides proceed and reset functions", () => {
      const { result } = renderHook(() => useUnsavedGuard(true), {
        wrapper: RouterWrapper,
      });

      expect(typeof result.current.proceed).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });

    it("returns blockerState", () => {
      const { result } = renderHook(() => useUnsavedGuard(false), {
        wrapper: RouterWrapper,
      });

      expect(result.current.blockerState).toBe("unblocked");
    });
  });
});

describe("useBeforeUnloadGuard", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    vi.clearAllMocks();
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("adds beforeunload listener when isDirty is true", () => {
    renderHook(() => useBeforeUnloadGuard(true));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function)
    );
  });

  it("does not add listener when isDirty is false", () => {
    renderHook(() => useBeforeUnloadGuard(false));

    // addEventListener might be called by other effects, but not for beforeunload
    const beforeUnloadCalls = addEventListenerSpy.mock.calls.filter(
      (call) => call[0] === "beforeunload"
    );
    expect(beforeUnloadCalls.length).toBe(0);
  });

  it("removes listener when isDirty changes from true to false", () => {
    const { rerender } = renderHook(
      ({ isDirty }) => useBeforeUnloadGuard(isDirty),
      {
        initialProps: { isDirty: true },
      }
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function)
    );

    rerender({ isDirty: false });

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function)
    );
  });

  it("uses custom message in handler", () => {
    const customMessage = "Custom warning message";
    renderHook(() => useBeforeUnloadGuard(true, customMessage));

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "beforeunload"
    )?.[1] as EventListener;

    const mockEvent = {
      preventDefault: vi.fn(),
      returnValue: "",
    } as unknown as BeforeUnloadEvent;

    const result = handler(mockEvent);

    expect(mockEvent.returnValue).toBe(customMessage);
    expect(result).toBe(customMessage);
  });
});
