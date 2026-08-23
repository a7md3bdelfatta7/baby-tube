export const DEFAULT_CONTENT_CATEGORIES = [
  "Songs",
  "Learning",
  "Bedtime",
  "Arabic",
  "Animals",
  "Short Clips",
] as const;

/** @deprecated Use settings-backed categories via `useContentCategories` or `loadContentCategories`. */
export const CONTENT_CATEGORIES = DEFAULT_CONTENT_CATEGORIES;

export type ContentCategory = string;

export function normalizeCategoryName(value: string): string {
  return value.trim();
}

export function normalizeCategoryList(
  categories: readonly string[] | null | undefined,
): string[] {
  if (!categories) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of categories) {
    const name = normalizeCategoryName(raw);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }

  return result;
}

export function normalizeCategories(
  categories: readonly string[] | null | undefined,
  allowed: readonly string[],
): string[] {
  if (!categories) return [];

  const allowedSet = new Set(allowed);

  return Array.from(
    new Set(
      categories
        .map((category) => normalizeCategoryName(category))
        .filter((category) => allowedSet.has(category)),
    ),
  );
}

export function isContentCategory(
  value: string,
  allowed: readonly string[],
): boolean {
  return allowed.includes(normalizeCategoryName(value));
}
