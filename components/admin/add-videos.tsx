"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { createVideo } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AdminCard } from "./shared";
import {
  blankVideoFormState,
  type VideoFormState,
  VideoFormFields,
  toVideoPayload,
} from "./video-form";

type AddVideoRow = VideoFormState & {
  status: "idle" | "uploading" | "saved" | "error";
  error?: string;
};

function createBlankRow(): AddVideoRow {
  return { ...blankVideoFormState, status: "idle" };
}

export function AddVideos(): ReactElement {
  const qc = useQueryClient();
  const [rows, setRows] = useState<AddVideoRow[]>([createBlankRow()]);
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (index: number, patch: Partial<AddVideoRow>): void =>
    setRows((items) =>
      items.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );

  const addRow = (): void => setRows((items) => [...items, createBlankRow()]);
  const removeRow = (index: number): void =>
    setRows((items) =>
      items.length === 1
        ? [createBlankRow()]
        : items.filter((_, rowIndex) => rowIndex !== index),
    );

  const validRowCount = rows.filter(
    (row) => row.status !== "saved" && row.title.trim() && row.videoUrl.trim(),
  ).length;
  const canSubmit = !submitting && validRowCount > 0;

  const submitAll = async (): Promise<void> => {
    setSubmitting(true);
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      if (row.status === "saved") continue;
      if (!row.title.trim() || !row.videoUrl.trim()) continue;
      updateRow(index, { status: "uploading", error: undefined });
      try {
        await createVideo(toVideoPayload(row));
        updateRow(index, { status: "saved" });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed";
        updateRow(index, { status: "error", error: message });
      }
    }
    qc.invalidateQueries({ queryKey: ["videos"] });
    qc.invalidateQueries({ queryKey: ["queue"] });
    setSubmitting(false);
    setTimeout(() => {
      setRows((items) => {
        const remaining = items.filter((row) => row.status !== "saved");
        return remaining.length ? remaining : [createBlankRow()];
      });
    }, 600);
  };

  const saveLabel =
    submitting
      ? "Saving…"
      : validRowCount > 1
        ? `Save ${validRowCount} videos`
        : "Save video";

  return (
    <AdminCard>
      <CardHeader>
        <CardTitle>Add videos</CardTitle>
        <CardDescription>
          Paste a title and YouTube link. Optional clip times trim the segment.
          Use <span className="font-medium text-foreground">Add another</span> to
          queue more at once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {rows.map((row, index) => (
            <Card
              key={index}
              className={cn(
                "rounded-2xl shadow-none ring-1 ring-black/[0.04]",
                row.status === "saved" &&
                  "border-emerald-500/40 bg-emerald-50/60",
                row.status === "error" &&
                  "border-destructive/50 bg-destructive/5",
                row.status === "uploading" &&
                  "border-amber-500/40 bg-amber-50/60",
              )}
            >
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Video {index + 1}
                  </span>
                  <span className="text-sm">
                    {row.status === "saved" && (
                      <span className="text-emerald-600">Saved</span>
                    )}
                    {row.status === "uploading" && (
                      <span className="text-amber-600">Uploading…</span>
                    )}
                    {row.status === "error" && (
                      <span className="text-destructive">{row.error}</span>
                    )}
                  </span>
                </div>
                <VideoFormFields
                  state={row}
                  setState={(next) => updateRow(index, next)}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => removeRow(index)}
                    disabled={rows.length === 1 && !row.title && !row.videoUrl}
                  >
                    <Trash2 className="size-3.5" data-icon="inline-start" />
                    {rows.length === 1 ? "Clear" : "Remove"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={addRow}
            className="rounded-full"
          >
            <Plus className="size-4" data-icon="inline-start" />
            Add another
          </Button>
          <Button
            type="button"
            onClick={() => void submitAll()}
            disabled={!canSubmit}
            className="rounded-full"
          >
            {saveLabel}
          </Button>
        </div>
      </CardContent>
    </AdminCard>
  );
}
