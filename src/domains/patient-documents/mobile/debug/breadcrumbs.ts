const DEBUG_BREADCRUMBS_ENABLED = process.env.EXPO_PUBLIC_DEBUG_BREADCRUMBS === '1';
const KEEP_AWAKE_ERROR_PATTERN = /unable to activate keep awake/i;

let diagnosticsInstalled = false;

interface ErrorUtilsLike {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
}

type UnhandledRejectionEventLike = {
  reason?: unknown;
  preventDefault?: () => void;
};

type GlobalDiagnosticsLike = typeof globalThis & {
  ErrorUtils?: ErrorUtilsLike;
  addEventListener?: (name: string, handler: (event: unknown) => void) => void;
  onunhandledrejection?: ((event: UnhandledRejectionEventLike) => unknown) | null;
  process?: {
    on?: (event: string, handler: (reason: unknown) => void) => void;
  };
};

function summarizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 6).join('\n'),
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return {
    message: String(error),
  };
}

function isKeepAwakeActivationError(reason: unknown): boolean {
  if (!reason) return false;

  if (reason instanceof Error) {
    return KEEP_AWAKE_ERROR_PATTERN.test(reason.message);
  }

  if (typeof reason === 'string') {
    return KEEP_AWAKE_ERROR_PATTERN.test(reason);
  }

  if (typeof reason === 'object' && 'message' in reason) {
    const message = (reason as { message?: unknown }).message;
    return typeof message === 'string' && KEEP_AWAKE_ERROR_PATTERN.test(message);
  }

  return false;
}

export function isDebugBreadcrumbsEnabled(): boolean {
  return DEBUG_BREADCRUMBS_ENABLED;
}

export function debugBreadcrumb(event: string, payload?: Record<string, unknown>): void {
  if (!DEBUG_BREADCRUMBS_ENABLED) return;

  const prefix = `[cc-debug] ${new Date().toISOString()} ${event}`;
  if (!payload || Object.keys(payload).length === 0) {
    console.log(prefix);
    return;
  }

  console.log(prefix, payload);
}

export function debugBreadcrumbError(
  event: string,
  error: unknown,
  payload?: Record<string, unknown>
): void {
  if (!DEBUG_BREADCRUMBS_ENABLED) return;

  debugBreadcrumb(event, {
    ...payload,
    error: summarizeError(error),
  });
}

function handleUnhandledRejection(event: unknown): void {
  const normalized = event as UnhandledRejectionEventLike;
  const reason = normalized?.reason ?? event;

  if (isKeepAwakeActivationError(reason)) {
    debugBreadcrumb('runtime.unhandled_rejection.keep_awake_ignored', {
      reason: summarizeError(reason),
    });
    normalized?.preventDefault?.();
    return;
  }

  debugBreadcrumbError('runtime.unhandled_rejection', reason);
}

function attachUnhandledRejectionListener(globalDiagnostics: GlobalDiagnosticsLike): void {
  try {
    if (typeof globalDiagnostics.addEventListener === 'function') {
      globalDiagnostics.addEventListener('unhandledrejection', handleUnhandledRejection);
      debugBreadcrumb('runtime.unhandled_rejection_listener.attached', { method: 'addEventListener' });
      return;
    }
  } catch (error) {
    debugBreadcrumbError('runtime.unhandled_rejection_listener.attach_failed', error, {
      method: 'addEventListener',
    });
  }

  try {
    const previous = globalDiagnostics.onunhandledrejection;
    globalDiagnostics.onunhandledrejection = (event) => {
      handleUnhandledRejection(event);
      return previous?.(event);
    };

    debugBreadcrumb('runtime.unhandled_rejection_listener.attached', {
      method: 'onunhandledrejection',
    });
    return;
  } catch (error) {
    debugBreadcrumbError('runtime.unhandled_rejection_listener.attach_failed', error, {
      method: 'onunhandledrejection',
    });
  }

  try {
    globalDiagnostics.process?.on?.('unhandledRejection', (reason) => {
      handleUnhandledRejection({ reason });
    });

    debugBreadcrumb('runtime.unhandled_rejection_listener.attached', {
      method: 'process.on',
    });
  } catch (error) {
    debugBreadcrumbError('runtime.unhandled_rejection_listener.attach_failed', error, {
      method: 'process.on',
    });
  }
}

export function installDebugDiagnostics(): void {
  if (diagnosticsInstalled) return;
  diagnosticsInstalled = true;

  const globalDiagnostics = globalThis as GlobalDiagnosticsLike;
  attachUnhandledRejectionListener(globalDiagnostics);

  if (!DEBUG_BREADCRUMBS_ENABLED) return;

  debugBreadcrumb('runtime.diagnostics.install');

  const errorUtils = globalDiagnostics.ErrorUtils;
  if (errorUtils?.setGlobalHandler) {
    const previousHandler = errorUtils.getGlobalHandler?.();

    errorUtils.setGlobalHandler((error, isFatal) => {
      debugBreadcrumbError('runtime.unhandled_error', error, { isFatal: Boolean(isFatal) });

      if (typeof previousHandler === 'function') {
        try {
          previousHandler(error, isFatal);
        } catch (handlerError) {
          debugBreadcrumbError('runtime.previous_error_handler_failed', handlerError);
        }
      }
    });
  }
}
