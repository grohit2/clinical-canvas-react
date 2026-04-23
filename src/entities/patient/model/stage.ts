import type { Stage } from "./types";

export const STAGE_OPTIONS: Stage[] = [
  "onboarding",
  "preop",
  "intraop",
  "postop",
  "discharge-init",
  "discharge",
];

const STAGE_ORDER: Record<string, number> = STAGE_OPTIONS.reduce((acc, s, i) => {
  acc[s] = i;
  return acc;
}, {} as Record<string, number>);

export const normalizeStage = (value?: string | null): Stage | undefined => {
  if (!value) return undefined;
  const key = value.toLowerCase().replace(/\s+/g, "-");
  if (STAGE_ORDER[key] !== undefined) return key as Stage;
  if (key === "pre-op") return "preop";
  if (key === "intra-op") return "intraop";
  if (key === "post-op") return "postop";
  return undefined;
};

export const stageLabel = (stage?: string) => {
  const key = normalizeStage(stage);
  if (!key) return "—";
  const labels: Record<Stage, string> = {
    onboarding: "Onboarding",
    preop: "Pre-Op",
    intraop: "OT",
    postop: "Post-Op",
    "discharge-init": "Discharge Init",
    discharge: "Discharge",
  };
  return labels[key];
};

export const stageColors: Record<Stage, { bg: string; text: string }> = {
  onboarding: { bg: "bg-blue-50", text: "text-blue-700" },
  preop: { bg: "bg-amber-50", text: "text-amber-700" },
  intraop: { bg: "bg-indigo-50", text: "text-indigo-700" },
  postop: { bg: "bg-emerald-50", text: "text-emerald-700" },
  "discharge-init": { bg: "bg-slate-50", text: "text-slate-700" },
  discharge: { bg: "bg-slate-100", text: "text-slate-700" },
};

export const getStageOptions = () => STAGE_OPTIONS;
