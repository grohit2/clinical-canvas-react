import { describe, expect, it } from 'vitest';
import { computePatch } from './opService';

describe('computePatch', () => {
  it('skips undefined and unchanged values', () => {
    const current = { name: 'A', priority: 'Low', notes: '' };
    const updates = { name: 'B', priority: undefined, notes: '' };

    const { patch, inversePatch } = computePatch(current, updates);

    expect(patch).toEqual({ name: 'B' });
    expect(inversePatch).toEqual({ name: 'A' });
  });
});
