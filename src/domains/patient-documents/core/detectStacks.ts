import type { DocumentItem } from './types';

export interface StackInfo {
  representativeId: string;
  memberIds: string[];
  count: number;
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;

  return 0;
}

export function detectStacks(
  documents: DocumentItem[],
  windowMs = 120_000
): Map<string, StackInfo> {
  if (documents.length <= 1) {
    return new Map();
  }

  const sorted = [...documents].sort((a, b) => toTimestamp(a.uploadedAt) - toTimestamp(b.uploadedAt));
  const stacks = new Map<string, StackInfo>();

  let currentBurst: DocumentItem[] = [];

  const flushBurst = () => {
    if (currentBurst.length <= 1) {
      currentBurst = [];
      return;
    }

    const representative = currentBurst[0];
    const memberIds = currentBurst.map((item) => item.id);
    stacks.set(representative.id, {
      representativeId: representative.id,
      memberIds,
      count: memberIds.length,
    });

    currentBurst = [];
  };

  for (const doc of sorted) {
    if (currentBurst.length === 0) {
      currentBurst = [doc];
      continue;
    }

    const last = currentBurst[currentBurst.length - 1];
    const delta = toTimestamp(doc.uploadedAt) - toTimestamp(last.uploadedAt);
    const sameCategory = doc.category === last.category;

    if (sameCategory && delta >= 0 && delta <= windowMs) {
      currentBurst.push(doc);
      continue;
    }

    flushBurst();
    currentBurst = [doc];
  }

  flushBurst();
  return stacks;
}
