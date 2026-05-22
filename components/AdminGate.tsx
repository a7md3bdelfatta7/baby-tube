"use client";

import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, House, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const KEY = "babytube.admin.pw";

export function useAdminPassword(): {
  password: string | null;
  save: (p: string) => void;
  clear: () => void;
} {
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

export function AdminGate({
  children,
}: {
  children: ReactNode;
}): ReactElement | null {
  const { password, save, clear } = useAdminPassword();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  if (!ready) return null;

  if (!password) {
    return (
      <div className="mx-auto mt-6 max-w-md overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 shadow-[0_30px_70px_-20px_rgba(80,90,160,0.4)] ring-1 ring-black/[0.04] backdrop-blur-xl">
        <div className="px-6 pt-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/tots-brand-kit/svg/tots-icon.svg"
            alt="Tots"
            className="mx-auto mb-3 size-20 rounded-2xl shadow-md"
          />
          <div className="mx-auto -mt-7 mb-3 flex size-8 items-center justify-center rounded-full bg-[color:var(--tots-ink)] text-[color:var(--tots-cream)] shadow-lg ring-4 ring-white">
            <Lock className="size-4" aria-hidden />
          </div>
          <h2 className="font-display text-2xl font-bold">Parents only</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the password to manage videos.
          </p>
        </div>
        <div className="px-6 pb-8 pt-6">
          <form
            className="space-y-4"
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
          >
            <Input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              aria-invalid={error ? true : undefined}
              className="h-12 rounded-2xl bg-white/80 px-4 text-base"
            />
            {error ? (
              <Alert variant="destructive" className="rounded-2xl">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-[color:var(--tots-ink)] text-base font-semibold text-[color:var(--tots-cream)] shadow-lg shadow-[color:var(--tots-ink)]/25 hover:brightness-110"
              disabled={loading}
            >
              {loading ? "Checking…" : "Unlock"}
            </Button>
          </form>
          <Button
            render={<Link href="/" />}
            variant="ghost"
            size="sm"
            className="mt-5 w-full gap-2 rounded-full text-muted-foreground"
          >
            <ArrowLeft className="size-4" data-icon="inline-start" />
            Back to Baby Tube
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button
          render={<Link href="/" />}
          variant="outline"
          size="sm"
          className="rounded-full bg-white/80"
        >
          <House className="size-3.5" data-icon="inline-start" />
          Home
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          className="rounded-full bg-white/80"
        >
          <Lock className="size-3.5" data-icon="inline-start" />
          Lock
        </Button>
      </div>
      {children}
    </div>
  );
}
