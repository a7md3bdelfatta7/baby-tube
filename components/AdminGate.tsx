"use client";

import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, House, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <Card className="mx-auto mt-10 max-w-md overflow-hidden rounded-2xl border-border/70 bg-card/95 shadow-2xl shadow-black/10 ring-1 ring-black/[0.04] backdrop-blur-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 shadow-inner ring-1 ring-primary/15">
            <Lock className="size-7 text-primary" aria-hidden />
          </div>
          <CardTitle>Admin sign-in</CardTitle>
          <CardDescription>
            Enter the admin password to manage videos.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            />
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Checking…" : "Unlock"}
            </Button>
          </form>
          <Button
            render={<Link href="/" />}
            variant="ghost"
            size="sm"
            className="mt-6 w-full gap-2 text-muted-foreground"
          >
            <ArrowLeft className="size-4" data-icon="inline-start" />
            Back to Baby Tube
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button render={<Link href="/" />} variant="outline" size="sm">
          <House className="size-3.5" data-icon="inline-start" />
          Home
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          <Lock className="size-3.5" data-icon="inline-start" />
          Lock
        </Button>
      </div>
      {children}
    </div>
  );
}
