"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/ui/toast-provider";

export function AccountForm({ mode }: { mode: "login" | "register" }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const registering = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(registering ? "/api/auth/register" : "/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "Unable to continue.";
        toast.error(message);
        return;
      }
      toast.success(registering ? "Your account has been created." : "You are now signed in.");
      const next = new URLSearchParams(window.location.search).get("next");
      const destination = next ? new URL(next, window.location.origin) : null;
      router.push(destination?.origin === window.location.origin
        ? `${destination.pathname}${destination.search}${destination.hash}`
        : "/account");
      router.refresh();
    } catch {
      toast.error("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="card account-auth-card">
    <span className="eyebrow">{registering ? "Start your next chapter" : "Welcome back"}</span>
    <h1>{registering ? "Create your account" : "Sign in"}</h1>
    <p>{registering ? "Create an account to save your resume requests and start on the Free plan." : "Sign in to manage your resume requests."}</p>
    <form className="account-auth-form" onSubmit={submit}>
      {registering && <div className="form-group"><label htmlFor="account-name">Full name</label><input className="form-field" id="account-name" name="name" autoComplete="name" required minLength={2} maxLength={100} /></div>}
      <div className="form-group"><label htmlFor="account-email">Email address</label><input className="form-field" id="account-email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>
      <div className="form-group"><label htmlFor="account-password">Password</label><input className="form-field" id="account-password" name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} required minLength={registering ? 8 : 1} maxLength={128} /></div>
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Please wait..." : registering ? "Create account" : "Sign in"}</button>
    </form>
    <p className="auth-switch">{registering ? "Already have an account?" : "New to ResumeCraft?"} <Link href={registering ? "/login" : "/register"}>{registering ? "Sign in" : "Create an account"}</Link></p>
  </section>;
}
