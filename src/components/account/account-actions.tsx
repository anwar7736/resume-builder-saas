"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";

export function AccountActions() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to sign out. Please try again.");
      toast.success("You have been signed out.");
      router.push("/");
      router.refresh();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to sign out. Please try again.");
      setBusy(false);
    }
  }
  return <div className="account-signout"><button className="button button-secondary" type="button" onClick={signOut} disabled={busy}>{busy ? "Signing out..." : "Sign out"}</button></div>;
}
