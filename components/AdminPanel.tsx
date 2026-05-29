"use client";

import type { ComponentType, ReactElement } from "react";
import { useState } from "react";
import {
  AlarmClock,
  Baby,
  BarChart3,
  ListMusic,
  ListVideo,
  Plus,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddVideos } from "@/components/admin/add-videos";
import { ParentDashboard } from "@/components/admin/dashboard";
import { VideoList } from "@/components/admin/library";
import { PlaylistImport } from "@/components/admin/playlist-import";
import { ProfilesPanel } from "@/components/admin/profiles";
import { QueueBuilder } from "@/components/admin/queue";
import { SettingsPanel } from "@/components/admin/settings";

type Tab =
  | "dashboard"
  | "list"
  | "queue"
  | "profiles"
  | "settings"
  | "add"
  | "playlist";

type AdminTab = {
  value: Tab;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

const ADMIN_TABS: AdminTab[] = [
  { value: "dashboard", label: "Dashboard", Icon: BarChart3 },
  { value: "list", label: "Library", Icon: ListVideo },
  { value: "queue", label: "Queue", Icon: ListVideo },
  { value: "settings", label: "Settings", Icon: AlarmClock },
  { value: "profiles", label: "Profiles", Icon: Baby },
  { value: "add", label: "Add videos", Icon: Plus },
  { value: "playlist", label: "Playlist", Icon: ListMusic },
];

const TAB_TRIGGER_CLASS =
  "gap-1.5 rounded-2xl px-4 font-medium data-[active]:bg-white data-[active]:text-[color:var(--tots-ink)] data-[active]:shadow-md data-[active]:ring-1 data-[active]:ring-black/[0.04]";

export function AdminPanel(): ReactElement {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as Tab)}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
        <TabsList className="flex h-auto min-h-12 w-full flex-wrap justify-start gap-1.5 rounded-[1.5rem] border border-white/60 bg-white/70 p-2 shadow-[0_10px_30px_-15px_rgba(80,90,160,0.3)] ring-1 ring-black/[0.03] backdrop-blur-md sm:max-w-none md:flex-1">
          {ADMIN_TABS.map(({ value, label, Icon }) => (
            <TabsTrigger key={value} value={value} className={TAB_TRIGGER_CLASS}>
              <Icon className="size-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="dashboard" className="mt-0 outline-none">
        <ParentDashboard />
      </TabsContent>
      <TabsContent value="list" className="mt-0 outline-none">
        <VideoList />
      </TabsContent>
      <TabsContent value="queue" className="mt-0 outline-none">
        <QueueBuilder />
      </TabsContent>
      <TabsContent value="settings" className="mt-0 outline-none">
        <SettingsPanel />
      </TabsContent>
      <TabsContent value="profiles" className="mt-0 outline-none">
        <ProfilesPanel />
      </TabsContent>
      <TabsContent value="add" className="mt-0 outline-none">
        <AddVideos />
      </TabsContent>
      <TabsContent value="playlist" className="mt-0 outline-none">
        <PlaylistImport />
      </TabsContent>
    </Tabs>
  );
}
