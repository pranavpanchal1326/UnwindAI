"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/app/components/ui";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sentEmail, setSentEmail] = useState(null);
  const [error, setError] = useState(null);

  const isExpiredLink = searchParams.get("error") === "expired";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.status === 200) {
        setSentEmail(email);
        return;
      }

      if (response.status === 400) {
        setError("invalid_email");
        return;
      }

      if (response.status === 429) {
        setError("too_many_requests");
        return;
      }

      setError("unknown");
    } catch {
      setError("unknown");
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setSentEmail(null);
    setError(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-8">
      {sentEmail ? (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Check your email</h2>
          <p className="text-sm text-secondary">
            We sent a secure sign-in link to {sentEmail}. It expires in 10 minutes.
          </p>
          <button
            type="button"
            onClick={resetForm}
            className="w-full rounded-xl border border-border bg-transparent px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-muted"
          >
            Wrong email? Start over
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm text-secondary">
              Your email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSending}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-2 transition-shadow focus:ring-2 focus:ring-accent"
            />
            {isExpiredLink ? (
              <p className="text-sm text-warning">Your link expired. Request a new one.</p>
            ) : null}
            {error ? (
              <p className="text-sm text-danger">
                {error === "too_many_requests"
                  ? "Too many requests. Try again later."
                  : "Something went wrong. Try again."}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? (
              <>
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  style={{ animationDuration: "150ms" }}
                  aria-hidden="true"
                />
                Sending...
              </>
            ) : (
              "Send secure link"
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm items-center justify-center">
        <div className="w-full space-y-4">
          <header className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-primary">UnwindAI</h1>
            <p className="text-sm text-secondary">A secure space to manage your case.</p>
          </header>

          <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-surface" />}>
            <LoginForm />
          </Suspense>

          <p className="text-center text-xs text-muted">Your information is encrypted and private.</p>
        </div>
      </section>
    </main>
  );
}
