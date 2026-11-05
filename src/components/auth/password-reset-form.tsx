"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FieldError, useFieldValidation } from "@/components/ui/field-validation";

type FormPhase = "request" | "confirm" | "done";

export function PasswordResetForm() {
  const [phase, setPhase] = useState<FormPhase>("request");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const { errors, handleInvalid, handleInput, setFieldError, clearErrors } = useFieldValidation();

  async function sendCode(address: string) {
    setBusy(true);
    setFormError("");
    setMessage("");
    clearErrors();
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ email: address }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const errorMessage = typeof result === "object" && result !== null && "error" in result &&
          typeof result.error === "string" ? result.error : "Unable to send a reset code.";
        if (typeof result === "object" && result !== null && "field" in result && result.field === "email") {
          setFieldError("email", errorMessage);
        } else {
          setFormError(errorMessage);
        }
        return;
      }
      setEmail(address.trim().toLowerCase());
      setPhase("confirm");
      setMessage(typeof result === "object" && result !== null && "message" in result &&
        typeof result.message === "string"
        ? result.message
        : "If an account exists for that email, a reset code will be sent.");
    } catch {
      setFormError("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (phase === "request") {
      await sendCode(typeof values.email === "string" ? values.email : "");
      return;
    }
    if (values.password !== values.confirmPassword) {
      setFieldError("confirmPassword", "Passwords do not match.");
      return;
    }

    setBusy(true);
    setFormError("");
    setMessage("");
    clearErrors();
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ email, otp: values.otp, password: values.password }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const errorMessage = typeof result === "object" && result !== null && "error" in result &&
          typeof result.error === "string" ? result.error : "Unable to reset your password.";
        if (typeof result === "object" && result !== null && "field" in result &&
            (result.field === "otp" || result.field === "password" || result.field === "email")) {
          setFieldError(result.field, errorMessage);
        } else {
          setFormError(errorMessage);
        }
        return;
      }
      setPhase("done");
      setMessage("Your password has been updated. You can now sign in.");
    } catch {
      setFormError("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="card account-auth-card">
    <span className="eyebrow">{phase === "request" ? "Account recovery" : "Choose a new password"}</span>
    <h1>{phase === "request" ? "Forgot your password?" : phase === "done" ? "Password updated" : "Reset your password"}</h1>
    <p>{phase === "request"
      ? "Enter the email address linked to your account. We'll send a reset code if the account exists."
      : phase === "done"
        ? "Your account is ready to use with the new password."
        : "Enter the 6-digit code from your email and choose a new password. The code expires in 10 minutes."}</p>
    {message && <p className="form-success" role="status">{message}</p>}
    {phase !== "done" && <form className="account-auth-form" onSubmit={submit}
      onInvalidCapture={handleInvalid} onInputCapture={handleInput} onChangeCapture={handleInput}>
      {phase === "request" ? <div className="form-group">
        <label htmlFor="reset-email">Email address</label>
        <input className="form-field" id="reset-email" name="email" type="email" autoComplete="email" required
          maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "reset-email-error" : undefined} />
        <FieldError id="reset-email-error" error={errors.email} />
      </div> : <>
        <div className="form-group">
          <label htmlFor="reset-otp">Email verification code</label>
          <input className="form-field" id="reset-otp" name="otp" type="text" inputMode="numeric"
            autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus
            aria-invalid={Boolean(errors.otp)} aria-describedby={errors.otp ? "reset-otp-error" : undefined} />
          <FieldError id="reset-otp-error" error={errors.otp} />
        </div>
        <div className="form-group">
          <label htmlFor="reset-password">New password</label>
          <input className="form-field" id="reset-password" name="password" type="password"
            autoComplete="new-password" required minLength={8} maxLength={128}
            aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "reset-password-error" : undefined} />
          <FieldError id="reset-password-error" error={errors.password} />
        </div>
        <div className="form-group">
          <label htmlFor="confirm-password">Confirm new password</label>
          <input className="form-field" id="confirm-password" name="confirmPassword" type="password"
            autoComplete="new-password" required minLength={8} maxLength={128}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined} />
          <FieldError id="confirm-password-error" error={errors.confirmPassword} />
        </div>
      </>}
      {formError && <small className="field-error" role="alert">{formError}</small>}
      <button className="button button-primary" type="submit" disabled={busy}>
        {busy ? "Please wait..." : phase === "request" ? "Send verification code" : "Update password"}
      </button>
    </form>}
    {phase === "confirm" && <div className="auth-switch">
      <button className="button button-secondary button-small" type="button" disabled={busy} onClick={() => sendCode(email)}>
        Resend code
      </button>
      <p><button className="login-text-button" type="button" disabled={busy} onClick={() => {
        setPhase("request");
        setMessage("");
        setFormError("");
        clearErrors();
      }}>Change email address</button></p>
    </div>}
    {phase === "request" && <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>}
    {phase === "done" && <p className="auth-switch"><Link href="/login">Sign in</Link></p>}
  </section>;
}
