"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/db/client";

export default function ProfessionalPendingPage() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/auth/professional-login");
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-sm items-center justify-center">
        <div className="w-full rounded-2xl border border-border bg-surface p-8 text-center">
          <Clock3 className="mx-auto h-12 w-12 text-warning" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold">Verification in progress</h1>
          <p className="mt-3 text-sm text-secondary">
            Your license details are being reviewed. This usually takes 1-2 business days. You will
            receive an email when your account is approved.
          </p>
          <p className="mt-4 text-sm text-muted">Questions? Contact support@unwindai.com</p>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="mt-6 w-full rounded-xl border border-border bg-transparent px-4 py-2 text-sm font-medium text-secondary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </section>
    </main>
  );
}
