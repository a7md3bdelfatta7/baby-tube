"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importPlaylist } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminCard } from "./shared";

export function PlaylistImport(): ReactElement {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const mutation = useMutation({
    mutationFn: () => importPlaylist(url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });

  return (
    <AdminCard>
      <CardHeader>
        <CardTitle>Import a playlist</CardTitle>
        <CardDescription>
          Paste a YouTube playlist URL to bulk-import videos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="https://www.youtube.com/playlist?list=PL..."
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!url || mutation.isPending}
          >
            {mutation.isPending ? "Importing…" : "Import"}
          </Button>
        </div>
        {mutation.isSuccess ? (
          <p className="text-sm text-emerald-600">
            Imported {mutation.data.imported} videos
            {mutation.data.skipped > 0
              ? ` (skipped ${mutation.data.skipped})`
              : ""}.
          </p>
        ) : null}
        {mutation.isError ? (
          <p className="text-sm text-destructive">
            {(mutation.error as Error)?.message ?? "Import failed"}
          </p>
        ) : null}
      </CardContent>
    </AdminCard>
  );
}
