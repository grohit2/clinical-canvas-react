// src/lib/support.ts
export function assertNever(x: never): never {
  throw new Error("Unreachable");
}
