import { monotonicFactory } from 'ulid';

function randomFraction(): number {
  const maybeCrypto = (globalThis as {
    crypto?: {
      getRandomValues?: (buffer: Uint8Array) => Uint8Array;
    };
  }).crypto;

  if (maybeCrypto?.getRandomValues) {
    const bytes = new Uint8Array(6);
    maybeCrypto.getRandomValues(bytes);
    let value = 0;
    for (let i = 0; i < bytes.length; i += 1) {
      value = value * 256 + bytes[i];
    }
    return value / 281_474_976_710_656; // 2^48
  }

  return Math.random();
}

let nextUlid: (() => string) | null = null;

function getUlidFactory(): () => string {
  if (!nextUlid) {
    nextUlid = monotonicFactory(randomFraction);
  }
  return nextUlid;
}

export const ulid = () => {
  try {
    return getUlidFactory()();
  } catch {
    return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
};
