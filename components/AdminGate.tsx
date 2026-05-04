"use client";

import { useEffect, useState } from "react";

const KEY = "babytube.admin.pw";

export function useAdminPassword() {
  const [pw, setPw] = useState<string | null>(null);
  useEffect(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    setPw(v);
  }, []);
  return {
    password: pw,
    save: (p: string) => {
      localStorage.setItem(KEY, p);
      setPw(p);
    },
    clear: () => {
      localStorage.removeItem(KEY);
      setPw(null);
    },
  };
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { password, save, clear } = useAdminPassword();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  if (!ready) return null;

  if (!password) {
    return (
      <div className="max-w-sm mx-auto mt-20 bg-white/80 backdrop-blur rounded-3xl shadow-xl p-8 border-4 border-pink-200">
        <div className="text-4xl text-center mb-2">🔒</div>
        <h1 className="text-2xl font-extrabold text-center text-pink-600 mb-4">
          Admin password
        </h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);
            const res = await fetch("/api/admin/login", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ password: input }),
            });
            setLoading(false);
            if (res.ok) save(input);
            else setError("Wrong password");
          }}
          className="space-y-3"
        >
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border-2 border-pink-200 px-4 py-3 focus:outline-none focus:border-pink-400"
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl py-3 disabled:opacity-50"
          >
            {loading ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          onClick={clear}
          className="text-sm bg-white/70 px-3 py-1 rounded-full border border-pink-200 hover:bg-white"
        >
          🔒 Lock
        </button>
      </div>
      {children}
    </div>
  );
}
