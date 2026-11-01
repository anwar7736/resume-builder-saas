"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { notifyAuthStateChanged } from "@/components/auth/auth-state";
import { FieldError, useFieldValidation } from "@/components/ui/field-validation";
import { useToast } from "@/components/ui/toast-provider";

export function AccountForm({ mode }: { mode: "login" | "register" }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const registering = mode === "register";
  const { errors, handleInvalid, handleInput, setFieldError } = useFieldValidation();
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (registering && typeof values.name === "string" && values.name.trim().length < 2) {
      setFieldError("name", "Enter a name with at least two characters.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(registering ? "/api/auth/register" : "/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, ...(twoFactorRequired ? { totpCode: twoFactorCode } : {}) }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "Unable to continue.";
        if (registering && response.status === 409) {
          setFieldError("email", message);
          return;
        }
        if (!registering && response.status === 429) {
          setFieldError("totpCode", message);
          return;
        }
        if (!registering && response.status === 401) {
          if (typeof result === "object" && result !== null && "code" in result && result.code === "invalid_two_factor") {
            setFieldError("totpCode", message);
          } else {
            setFieldError("password", message);
          }
          return;
        }
        toast.error(message);
        return;
      }
      if (!registering && typeof result === "object" && result !== null &&
          "requiresTwoFactor" in result && result.requiresTwoFactor === true) {
        setTwoFactorRequired(true);
        setTwoFactorCode("");
        return;
      }
      notifyAuthStateChanged();
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
    <form className="account-auth-form" onSubmit={submit} onInvalidCapture={handleInvalid} onInputCapture={handleInput} onChangeCapture={handleInput}>
      {registering && <div className="form-group"><label htmlFor="account-name">Full name</label><input className="form-field" id="account-name" name="name" autoComplete="name" required minLength={2} maxLength={100} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "account-name-error" : undefined} /><FieldError id="account-name-error" error={errors.name} /></div>}
      <div className="form-group"><label htmlFor="account-email">Email address</label><input className="form-field" id="account-email" name="email" type="email" autoComplete="email" required maxLength={254} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "account-email-error" : undefined} /><FieldError id="account-email-error" error={errors.email} /></div>
      <div className="form-group"><label htmlFor="account-password">Password</label><input className="form-field" id="account-password" name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} required minLength={registering ? 8 : 1} maxLength={128} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "account-password-error" : undefined} /><FieldError id="account-password-error" error={errors.password} /></div>
      {twoFactorRequired && <div className="form-group"><label htmlFor="account-totp-code">Authenticator code</label><input className="form-field" id="account-totp-code" name="totpCode" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={twoFactorCode} onChange={(event) => { setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6)); }} aria-invalid={Boolean(errors.totpCode)} aria-describedby={errors.totpCode ? "account-totp-code-error" : undefined} /><FieldError id="account-totp-code-error" error={errors.totpCode} /></div>}
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Please wait..." : registering ? "Create account" : "Sign in"}</button>
    </form>
    <p className="auth-switch">{registering ? "Already have an account?" : "New to ResumeCraft?"} <Link href={registering ? "/login" : "/register"}>{registering ? "Sign in" : "Create an account"}</Link></p>
  </section>;
}
