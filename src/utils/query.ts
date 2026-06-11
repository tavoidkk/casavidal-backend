export const parsePositiveInt = (
  value: unknown,
  fallback: number,
  options: { min?: number; max?: number } = {}
) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  const min = options.min ?? 1;
  const max = options.max ?? 100;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

export const parseOptionalDate = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
};
