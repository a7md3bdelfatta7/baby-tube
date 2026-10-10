import type { ReactElement } from "react";
import { AdminGate } from "@/components/AdminGate";
import { AdminPanel } from "@/components/AdminPanel";

export default function AdminPage(): ReactElement {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-6 md:pt-8">
      <AdminGate>
        <AdminPanel />
      </AdminGate>
    </main>
  );
}
