"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import type { ChildProfile } from "@/db/schema";
import { getProfiles, updateProfiles } from "@/lib/api";
import { createProfileId } from "@/lib/profiles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminCard, formatDuration } from "./shared";
import { CategoryPicker } from "./video-form";

type ProfileForm = {
  id: string;
  name: string;
  ageRange: string;
  screenTimeMinutes: string;
  screenTimeResetHours: string;
  preferredCategories: string[];
  watchHistory: ChildProfile["watchHistory"];
};

function toProfileForm(profile: ChildProfile): ProfileForm {
  return {
    id: profile.id,
    name: profile.name,
    ageRange: profile.ageRange,
    screenTimeMinutes: String(profile.screenTimeMinutes),
    screenTimeResetHours: String(profile.screenTimeResetHours ?? 24),
    preferredCategories: profile.preferredCategories,
    watchHistory: profile.watchHistory,
  };
}

function toChildProfile(profile: ProfileForm): ChildProfile {
  return {
    id: profile.id,
    name: profile.name.trim(),
    ageRange: profile.ageRange.trim(),
    screenTimeMinutes: Number(profile.screenTimeMinutes),
    screenTimeResetHours: Number(profile.screenTimeResetHours),
    preferredCategories: profile.preferredCategories,
    watchHistory: profile.watchHistory,
  };
}

function isValidProfile(profile: ProfileForm): boolean {
  const minutes = Number(profile.screenTimeMinutes);
  const resetHours = Number(profile.screenTimeResetHours);

  return (
    profile.name.trim().length > 0 &&
    Number.isInteger(minutes) &&
    minutes >= 1 &&
    minutes <= 180 &&
    Number.isInteger(resetHours) &&
    resetHours >= 1 &&
    resetHours <= 168
  );
}

export function ProfilesPanel(): ReactElement {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
  });
  const [profiles, setProfiles] = useState<ProfileForm[]>([]);
  const canSave = profiles.every(isValidProfile);

  useEffect(() => {
    if (!data) return;
    setProfiles(data.childProfiles.map(toProfileForm));
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      updateProfiles({ childProfiles: profiles.map(toChildProfile) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });

  const updateProfile = (id: string, patch: Partial<ProfileForm>): void => {
    setProfiles((items) =>
      items.map((profile) =>
        profile.id === id ? { ...profile, ...patch } : profile,
      ),
    );
  };

  const addProfile = (): void => {
    setProfiles((items) => [
      ...items,
      {
        id: createProfileId(),
        name: "",
        ageRange: "",
        screenTimeMinutes: "15",
        screenTimeResetHours: "24",
        preferredCategories: [],
        watchHistory: [],
      },
    ]);
  };

  const removeProfile = (id: string): void => {
    setProfiles((items) => items.filter((profile) => profile.id !== id));
  };

  return (
    <AdminCard>
      <CardHeader>
        <CardTitle>Child profiles</CardTitle>
        <CardDescription>
          Give each child their own timer, favorite categories, age range, and
          recent watch history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">
            Loading profiles…
          </p>
        ) : (
          <>
            <div className="space-y-4">
              {profiles.map((profile) => (
                <ProfileEditorCard
                  key={profile.id}
                  profile={profile}
                  onUpdate={updateProfile}
                  onRemove={removeProfile}
                />
              ))}

              {profiles.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-muted-foreground/25 bg-white/60 p-5 text-center text-sm text-muted-foreground">
                  No profiles yet. Add one to personalize the child experience.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={addProfile}
                className="rounded-full"
              >
                <Plus className="size-4" data-icon="inline-start" />
                Add profile
              </Button>
              <Button
                type="button"
                onClick={() => save.mutate()}
                disabled={!canSave || save.isPending}
                className="rounded-full"
              >
                {save.isPending ? "Saving…" : "Save profiles"}
              </Button>
            </div>

            {!canSave ? (
              <p className="text-sm text-destructive">
                Each profile needs a name, a whole-number timer from 1 to 180
                minutes, and a reset interval from 1 to 168 hours.
              </p>
            ) : null}
            {save.isSuccess ? (
              <p className="text-sm text-emerald-600">Profiles saved.</p>
            ) : null}
            {save.isError ? (
              <p className="text-sm text-destructive">
                {(save.error as Error)?.message ?? "Save failed"}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </AdminCard>
  );
}

function ProfileEditorCard({
  profile,
  onUpdate,
  onRemove,
}: {
  profile: ProfileForm;
  onUpdate: (id: string, patch: Partial<ProfileForm>) => void;
  onRemove: (id: string) => void;
}): ReactElement {
  const minutes = Number(profile.screenTimeMinutes);
  const resetHours = Number(profile.screenTimeResetHours);
  const isValidMinutes =
    Number.isInteger(minutes) && minutes >= 1 && minutes <= 180;
  const isValidResetHours =
    Number.isInteger(resetHours) && resetHours >= 1 && resetHours <= 168;

  return (
    <Card className="rounded-2xl bg-white/70 shadow-none ring-1 ring-black/[0.04]">
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Child name"
            value={profile.name}
            onChange={(event) =>
              onUpdate(profile.id, { name: event.target.value })
            }
            aria-invalid={!profile.name.trim() ? true : undefined}
          />
          <Input
            placeholder="Age range, e.g. 3-5"
            value={profile.ageRange}
            onChange={(event) =>
              onUpdate(profile.id, { ageRange: event.target.value })
            }
          />
          <Input
            type="number"
            min={1}
            max={180}
            step={1}
            placeholder="Minutes"
            value={profile.screenTimeMinutes}
            onChange={(event) =>
              onUpdate(profile.id, { screenTimeMinutes: event.target.value })
            }
            aria-invalid={!isValidMinutes ? true : undefined}
          />
          <Input
            type="number"
            min={1}
            max={168}
            step={1}
            placeholder="Reset every hours"
            value={profile.screenTimeResetHours}
            onChange={(event) =>
              onUpdate(profile.id, { screenTimeResetHours: event.target.value })
            }
            aria-invalid={!isValidResetHours ? true : undefined}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Timer reset interval is in hours. Use 24 for a daily reset.
        </p>

        <div className="space-y-2">
          <p className="text-sm font-medium">Preferred categories</p>
          <CategoryPicker
            value={profile.preferredCategories}
            onChange={(preferredCategories) =>
              onUpdate(profile.id, { preferredCategories })
            }
          />
        </div>

        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="text-sm font-medium">Recent watch history</p>
          {profile.watchHistory.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {profile.watchHistory.slice(0, 5).map((entry) => (
                <li key={`${entry.videoId}-${entry.watchedAt}`}>
                  {entry.title} · {entry.status} ·{" "}
                  {formatDuration(entry.watchedSeconds)} ·{" "}
                  {new Date(entry.watchedAt).toLocaleDateString()}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              No watched videos yet.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => onRemove(profile.id)}
          >
            <Trash2 className="size-3.5" data-icon="inline-start" />
            Remove profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
