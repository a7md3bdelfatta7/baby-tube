"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { getSettings, listVideos, updateSettings } from "@/lib/api";
import { normalizeCategoryName } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminCard } from "./shared";

export function SettingsPanel(): ReactElement {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const { data: videos = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });

  const [screenTimeMinutes, setScreenTimeMinutes] = useState("15");
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const parsedMinutes = Number(screenTimeMinutes);
  const isScreenTimeValid =
    Number.isInteger(parsedMinutes) && parsedMinutes >= 1 && parsedMinutes <= 180;

  useEffect(() => {
    if (!data) return;
    setScreenTimeMinutes(String(data.screenTimeMinutes));
    setCategories(data.contentCategories ?? []);
  }, [data]);

  const screenTimeMutation = useMutation({
    mutationFn: () => updateSettings({ screenTimeMinutes: parsedMinutes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  const categoriesMutation = useMutation({
    mutationFn: (input: {
      contentCategories: string[];
      categoryRename?: { from: string; to: string };
    }) => updateSettings(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setCategoryError(null);
      setEditingCategory(null);
      setPendingDelete(null);
    },
    onError: (error) => {
      setCategoryError((error as Error).message ?? "Failed to save categories");
    },
  });

  const categoryUsage = (name: string): number =>
    videos.filter((video) => video.categories.includes(name)).length;

  const hasDuplicate = (name: string, exclude?: string): boolean => {
    const normalized = name.toLowerCase();
    return categories.some(
      (category) =>
        category.toLowerCase() === normalized && category !== exclude,
    );
  };

  const saveCategories = (
    nextCategories: string[],
    categoryRename?: { from: string; to: string },
  ): void => {
    categoriesMutation.mutate({ contentCategories: nextCategories, categoryRename });
  };

  const handleAddCategory = (): void => {
    const name = normalizeCategoryName(newCategory);
    if (!name) {
      setCategoryError("Enter a category name.");
      return;
    }
    if (hasDuplicate(name)) {
      setCategoryError(`"${name}" already exists.`);
      return;
    }

    saveCategories([...categories, name]);
    setNewCategory("");
  };

  const startEditing = (name: string): void => {
    setCategoryError(null);
    setEditingCategory(name);
    setEditingValue(name);
  };

  const handleSaveEdit = (): void => {
    if (!editingCategory) return;

    const name = normalizeCategoryName(editingValue);
    if (!name) {
      setCategoryError("Category name cannot be empty.");
      return;
    }
    if (hasDuplicate(name, editingCategory)) {
      setCategoryError(`"${name}" already exists.`);
      return;
    }

    const nextCategories = categories.map((category) =>
      category === editingCategory ? name : category,
    );

    if (name === editingCategory) {
      setEditingCategory(null);
      return;
    }

    saveCategories(nextCategories, { from: editingCategory, to: name });
  };

  const handleDeleteCategory = (): void => {
    if (!pendingDelete) return;
    if (categories.length <= 1) {
      setCategoryError("Keep at least one category.");
      setPendingDelete(null);
      return;
    }

    saveCategories(categories.filter((category) => category !== pendingDelete));
  };

  return (
    <div className="space-y-6">
      <AdminCard>
        <CardHeader>
          <CardTitle>Screen time</CardTitle>
          <CardDescription>
            Set how many minutes a watch session can run before the break screen
            appears.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:max-w-xs">
            <Input
              type="number"
              min={1}
              max={180}
              step={1}
              placeholder="15"
              value={screenTimeMinutes}
              onChange={(event) => setScreenTimeMinutes(event.target.value)}
              disabled={isLoading}
              aria-invalid={!isScreenTimeValid ? true : undefined}
            />
            <p className="text-xs text-muted-foreground">
              Use a whole number between 1 and 180 minutes.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => screenTimeMutation.mutate()}
              disabled={
                !isScreenTimeValid || isLoading || screenTimeMutation.isPending
              }
            >
              {screenTimeMutation.isPending ? "Saving…" : "Save screen time"}
            </Button>
          </div>
          {!isScreenTimeValid ? (
            <p className="text-sm text-destructive">
              Enter a valid screen-time limit before saving.
            </p>
          ) : null}
          {screenTimeMutation.isSuccess ? (
            <p className="text-sm text-emerald-600">Screen time saved.</p>
          ) : null}
          {screenTimeMutation.isError ? (
            <p className="text-sm text-destructive">
              {(screenTimeMutation.error as Error)?.message ?? "Save failed"}
            </p>
          ) : null}
        </CardContent>
      </AdminCard>

      <AdminCard>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Add, rename, or remove content categories used across the library,
            home page filters, and child profiles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {categories.map((category) => {
              const usage = categoryUsage(category);
              const isEditing = editingCategory === category;

              return (
                <li
                  key={category}
                  className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/70 p-3 ring-1 ring-black/[0.04]"
                >
                  {isEditing ? (
                    <Input
                      className="max-w-xs flex-1"
                      value={editingValue}
                      onChange={(event) => setEditingValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleSaveEdit();
                        if (event.key === "Escape") setEditingCategory(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{category}</p>
                      <p className="text-xs text-muted-foreground">
                        {usage === 0
                          ? "Not used by any videos"
                          : `${usage} video${usage === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={categoriesMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCategory(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Edit ${category}`}
                          onClick={() => startEditing(category)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Delete ${category}`}
                          onClick={() => setPendingDelete(category)}
                          disabled={categories.length <= 1}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="max-w-xs flex-1"
              placeholder="New category name"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleAddCategory();
              }}
              disabled={isLoading || categoriesMutation.isPending}
            />
            <Button
              type="button"
              onClick={handleAddCategory}
              disabled={
                isLoading ||
                categoriesMutation.isPending ||
                !normalizeCategoryName(newCategory)
              }
            >
              <Plus className="size-4" />
              Add category
            </Button>
          </div>

          {categoryError ? (
            <p className="text-sm text-destructive">{categoryError}</p>
          ) : null}
          {categoriesMutation.isSuccess ? (
            <p className="text-sm text-emerald-600">Categories updated.</p>
          ) : null}
        </CardContent>
      </AdminCard>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Remove "${pendingDelete}" from settings${
                    categoryUsage(pendingDelete) > 0
                      ? ` and untag ${categoryUsage(pendingDelete)} video${
                          categoryUsage(pendingDelete) === 1 ? "" : "s"
                        }`
                      : ""
                  }.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteCategory}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
