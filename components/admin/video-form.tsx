"use client";

import type { ChangeEvent, ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useContentCategories } from "@/lib/use-content-categories";
import { cn } from "@/lib/utils";
import { fmtCategories } from "./shared";

export type VideoFormState = {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  categories: string[];
  startSeconds: string;
  endSeconds: string;
};

export const blankVideoFormState: VideoFormState = {
  title: "",
  description: "",
  videoUrl: "",
  thumbnailUrl: "",
  categories: [],
  startSeconds: "",
  endSeconds: "",
};

export type VideoPayload = {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  categories: string[];
  startSeconds: number | null;
  endSeconds: number | null;
};

export function toVideoPayload(state: VideoFormState): VideoPayload {
  return {
    title: state.title.trim(),
    description: state.description,
    videoUrl: state.videoUrl.trim(),
    thumbnailUrl: state.thumbnailUrl.trim() || null,
    categories: state.categories,
    startSeconds:
      state.startSeconds === "" ? null : Number(state.startSeconds),
    endSeconds: state.endSeconds === "" ? null : Number(state.endSeconds),
  };
}

function nextClipValue(value: string, delta: number): string {
  const current = value === "" ? 0 : Number(value);
  if (!Number.isFinite(current)) return String(Math.max(0, delta));
  return String(Math.max(0, Math.round(current + delta)));
}

export function VideoFormFields({
  state,
  setState,
}: {
  state: VideoFormState;
  setState: (next: VideoFormState) => void;
}): ReactElement {
  const set =
    (key: keyof VideoFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
      setState({ ...state, [key]: event.target.value });

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Input placeholder="Title" value={state.title} onChange={set("title")} />
      <Input
        placeholder="YouTube URL"
        value={state.videoUrl}
        onChange={set("videoUrl")}
      />
      <Input
        placeholder="Thumbnail URL (optional)"
        value={state.thumbnailUrl}
        onChange={set("thumbnailUrl")}
      />
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            className="flex-1"
            type="number"
            min={0}
            step={1}
            placeholder="Start (s)"
            value={state.startSeconds}
            onChange={set("startSeconds")}
          />
          <Input
            className="flex-1"
            type="number"
            min={0}
            step={1}
            placeholder="End (s)"
            value={state.endSeconds}
            onChange={set("endSeconds")}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() =>
              setState({
                ...state,
                startSeconds: nextClipValue(state.startSeconds, -5),
              })
            }
          >
            Start -5s
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() =>
              setState({
                ...state,
                startSeconds: nextClipValue(state.startSeconds, 5),
              })
            }
          >
            Start +5s
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() =>
              setState({
                ...state,
                endSeconds: nextClipValue(state.endSeconds, -5),
              })
            }
          >
            End -5s
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() =>
              setState({
                ...state,
                endSeconds: nextClipValue(state.endSeconds, 5),
              })
            }
          >
            End +5s
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() =>
              setState({ ...state, startSeconds: "", endSeconds: "" })
            }
          >
            Clear clip
          </Button>
        </div>
      </div>
      <Textarea
        className="md:col-span-2 min-h-[5rem]"
        placeholder="Description (optional)"
        value={state.description}
        onChange={set("description")}
      />
      <div className="space-y-2 md:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Categories</p>
          <p className="text-xs text-muted-foreground">
            {fmtCategories(state.categories)}
          </p>
        </div>
        <CategoryPicker
          value={state.categories}
          onChange={(categories) => setState({ ...state, categories })}
        />
      </div>
    </div>
  );
}

export function CategoryPicker({
  value,
  onChange,
  categories: categoriesProp,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  categories?: readonly string[];
}): ReactElement {
  const { categories: loadedCategories, isLoading } = useContentCategories();
  const categories = categoriesProp ?? loadedCategories;

  const toggle = (category: string): void => {
    onChange(
      value.includes(category)
        ? value.filter((item) => item !== category)
        : [...value, category],
    );
  };

  if (isLoading && !categoriesProp) {
    return <p className="text-sm text-muted-foreground">Loading categories…</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const selected = value.includes(category);

        return (
          <Button
            key={category}
            type="button"
            variant={selected ? "default" : "secondary"}
            size="sm"
            className={cn(
              "rounded-full",
              !selected && "bg-white/80 hover:bg-white",
            )}
            aria-pressed={selected}
            onClick={() => toggle(category)}
          >
            {category}
          </Button>
        );
      })}
    </div>
  );
}
