"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminCard } from "./shared";

export function SettingsPanel(): ReactElement {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const [screenTimeMinutes, setScreenTimeMinutes] = useState("15");
  const parsedMinutes = Number(screenTimeMinutes);
  const isValid =
    Number.isInteger(parsedMinutes) && parsedMinutes >= 1 && parsedMinutes <= 180;

  useEffect(() => {
    if (!data) return;
    setScreenTimeMinutes(String(data.screenTimeMinutes));
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => updateSettings({ screenTimeMinutes: parsedMinutes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  return (
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
            aria-invalid={!isValid ? true : undefined}
          />
          <p className="text-xs text-muted-foreground">
            Use a whole number between 1 and 180 minutes.
          </p>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!isValid || isLoading || mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
        {!isValid ? (
          <p className="text-sm text-destructive">
            Enter a valid screen-time limit before saving.
          </p>
        ) : null}
        {mutation.isSuccess ? (
          <p className="text-sm text-emerald-600">Settings saved.</p>
        ) : null}
        {mutation.isError ? (
          <p className="text-sm text-destructive">
            {(mutation.error as Error)?.message ?? "Save failed"}
          </p>
        ) : null}
      </CardContent>
    </AdminCard>
  );
}
