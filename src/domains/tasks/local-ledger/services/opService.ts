export function computePatch<T extends Record<string, unknown>, U extends Record<string, unknown>>(
  current: T,
  updates: U,
): { patch: Partial<U>; inversePatch: Partial<T> } {
  const patch: Partial<U> = {};
  const inversePatch: Partial<T> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      continue;
    }

    const currentValue = current[key as keyof T];
    if (JSON.stringify(currentValue) === JSON.stringify(value)) {
      continue;
    }

    (patch as Record<string, unknown>)[key] = value;
    (inversePatch as Record<string, unknown>)[key] = currentValue ?? null;
  }

  return { patch, inversePatch };
}
