"use client";

import { useQuery } from "@tanstack/react-query";
import { DEFAULT_CONTENT_CATEGORIES } from "@/lib/categories";
import { getSettings } from "@/lib/api";

export function useContentCategories(): {
  categories: string[];
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const categories =
    data?.contentCategories && data.contentCategories.length > 0
      ? data.contentCategories
      : [...DEFAULT_CONTENT_CATEGORIES];

  return { categories, isLoading };
}
