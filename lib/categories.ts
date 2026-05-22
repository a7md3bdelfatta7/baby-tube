export const CONTENT_CATEGORIES = [
  "Songs",
  "Learning",
  "Bedtime",
  "Arabic",
  "Animals",
  "Short Clips",
] as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

const CATEGORY_SET = new Set<string>(CONTENT_CATEGORIES);

export function isContentCategory(value: string): value is ContentCategory {
  return CATEGORY_SET.has(value);
}

export function normalizeCategories(
  categories: readonly string[] | null | undefined,
): ContentCategory[] {
  if (!categories) return [];

  return Array.from(
    new Set(
      categories
        .map((category) => category.trim())
        .filter((category): category is ContentCategory =>
          isContentCategory(category),
        ),
    ),
  );
}
