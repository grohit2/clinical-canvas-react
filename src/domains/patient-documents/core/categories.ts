import type { DocCategory } from './types';

export const DOC_CATEGORIES: DocCategory[] = [
  'staging_area',
  'preop_pics',
  'lab_reports',
  'radiology',
  'intraop_pics',
  'ot_notes',
  'postop_pics',
  'discharge_pics',
];

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  staging_area: 'Staging',
  preop_pics: 'Pre-op',
  lab_reports: 'Lab Reports',
  radiology: 'Radiology',
  intraop_pics: 'Intra-op',
  ot_notes: 'OT Notes',
  postop_pics: 'Post-op',
  discharge_pics: 'Discharge',
};

export const CATEGORY_FULL_LABELS: Record<DocCategory, string> = {
  staging_area: 'Staging Area',
  preop_pics: 'Pre-operative',
  lab_reports: 'Lab Reports',
  radiology: 'Radiology',
  intraop_pics: 'Intra-operative',
  ot_notes: 'OT Notes',
  postop_pics: 'Post-operative',
  discharge_pics: 'Discharge',
};

export type DocType = 'staging' | 'preop' | 'lab' | 'radiology' | 'intraop' | 'otnotes' | 'postop' | 'discharge';

const DOC_TYPE_BY_CATEGORY: Record<DocCategory, DocType> = {
  staging_area: 'staging',
  preop_pics: 'preop',
  lab_reports: 'lab',
  radiology: 'radiology',
  intraop_pics: 'intraop',
  ot_notes: 'otnotes',
  postop_pics: 'postop',
  discharge_pics: 'discharge',
};

export function isValidCategory(value: unknown): value is DocCategory {
  return DOC_CATEGORIES.includes(value as DocCategory);
}

export function categoryToDocType(category: DocCategory): DocType {
  return DOC_TYPE_BY_CATEGORY[category];
}
