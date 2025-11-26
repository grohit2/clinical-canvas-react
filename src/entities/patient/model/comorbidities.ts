import { COMORBIDITY_OPTIONS } from "./validation";

const BASE_VALUES = COMORBIDITY_OPTIONS.filter((opt) => opt !== "OTHER");
const BASE_SET = new Set(BASE_VALUES);

const toUpperTrim = (value: string) => value.trim().toUpperCase();

export const tokenizeComorbidities = (list?: string[]) => {
  const flattened = (list || [])
    .flatMap((item) =>
      String(item)
        .split(/\s*\+\s*|\s*,\s*/)
        .map((token) => token.trim())
        .filter(Boolean)
    )
    .map((token) => token.toUpperCase());

  const baseSelections = Array.from(new Set(flattened.filter((token) => BASE_SET.has(token))));
  const customTokens = flattened.filter((token) => !BASE_SET.has(token));

  return {
    selections: baseSelections,
    includeOther: customTokens.length > 0,
    otherValue: customTokens.join(" + "),
  };
};

export const parseComorbiditiesFromList = tokenizeComorbidities;

export const buildComorbidityResult = (
  selections: string[],
  includeOther: boolean,
  otherValue: string
) => {
  const tokens = Array.from(new Set(selections.map(toUpperTrim)));
  if (includeOther) {
    const custom = toUpperTrim(otherValue);
    if (custom) tokens.push(custom);
  }
  const summary = tokens.length ? [tokens.join(" + ")] : [];
  return { tokens, summary };
};
