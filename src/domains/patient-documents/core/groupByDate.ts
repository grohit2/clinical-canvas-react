import { CATEGORY_META } from './categoryMeta';
import type { DocCategory, DocumentItem } from './types';

export interface DateSection {
  key: string;
  label: string;
  year: number;
  month: number;
  documents: DocumentItem[];
}

export interface YearSummary {
  year: number;
  documentCount: number;
  firstSectionIndex: number;
  dominantGradient: [string, string];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_MONTH_DAY = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const MONTH_DAY_YEAR = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;

  return 0;
}

function toDayStart(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function toDayKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toSectionLabel(value: Date, referenceDate: Date): string {
  const sectionStart = toDayStart(value);
  const referenceStart = toDayStart(referenceDate);

  if (sectionStart === referenceStart) {
    return 'Today';
  }

  if (sectionStart === referenceStart - DAY_MS) {
    return 'Yesterday';
  }

  if (value.getFullYear() === referenceDate.getFullYear()) {
    return WEEKDAY_MONTH_DAY.format(value);
  }

  return MONTH_DAY_YEAR.format(value);
}

export function groupDocumentsByDate(
  documents: DocumentItem[],
  referenceDate: Date = new Date()
): DateSection[] {
  if (!documents.length) {
    return [];
  }

  const sorted = [...documents].sort((a, b) => toTimestamp(b.uploadedAt) - toTimestamp(a.uploadedAt));
  const byDay = new Map<string, DateSection>();

  for (const document of sorted) {
    const uploadedDate = new Date(toTimestamp(document.uploadedAt));
    const key = toDayKey(uploadedDate);
    const existing = byDay.get(key);

    if (existing) {
      existing.documents.push(document);
      continue;
    }

    byDay.set(key, {
      key,
      label: toSectionLabel(uploadedDate, referenceDate),
      year: uploadedDate.getFullYear(),
      month: uploadedDate.getMonth(),
      documents: [document],
    });
  }

  return Array.from(byDay.values());
}

export function extractYearSummaries(sections: DateSection[]): YearSummary[] {
  if (!sections.length) {
    return [];
  }

  const yearIndexes = new Map<number, number>();
  const counts = new Map<number, number>();
  const categoryCounts = new Map<number, Map<DocCategory, number>>();

  sections.forEach((section, index) => {
    if (!yearIndexes.has(section.year)) {
      yearIndexes.set(section.year, index);
    }

    counts.set(section.year, (counts.get(section.year) || 0) + section.documents.length);

    const yearCategoryCounts = categoryCounts.get(section.year) || new Map<DocCategory, number>();
    for (const document of section.documents) {
      yearCategoryCounts.set(document.category, (yearCategoryCounts.get(document.category) || 0) + 1);
    }
    categoryCounts.set(section.year, yearCategoryCounts);
  });

  const summaries: YearSummary[] = [];
  for (const [year, firstSectionIndex] of yearIndexes.entries()) {
    const yearCategoryCounts = categoryCounts.get(year) || new Map<DocCategory, number>();

    let dominantCategory: DocCategory | null = null;
    let dominantCount = -1;
    for (const [category, count] of yearCategoryCounts.entries()) {
      if (count > dominantCount) {
        dominantCategory = category;
        dominantCount = count;
      }
    }

    const gradientSource = dominantCategory ? CATEGORY_META[dominantCategory] : CATEGORY_META.all;

    summaries.push({
      year,
      documentCount: counts.get(year) || 0,
      firstSectionIndex,
      dominantGradient: [gradientSource.gradientFrom, gradientSource.gradientTo],
    });
  }

  return summaries;
}
