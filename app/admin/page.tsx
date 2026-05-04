"use client";

import { AdminGate } from "@/components/AdminGate";
import { AdminPanel } from "@/components/AdminPanel";

export default function AdminPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 pt-6">
      <h1 className="text-4xl font-extrabold text-pink-600 text-center mb-6">
        Baby Tube Admin 🛠️
      </h1>
      <AdminGate>
        <AdminPanel />
      </AdminGate>
    </main>
  );
}
