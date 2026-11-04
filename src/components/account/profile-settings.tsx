"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FieldError, useFieldValidation } from "@/components/ui/field-validation";
import { useToast } from "@/components/ui/toast-provider";

function responseError(value: unknown, fallback: string) {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
    ? value.error
    : fallback;
}

export function ProfileSettings({ name: initialName, email: initialEmail }: { name: string; email: string }) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const { errors, handleInvalid, handleInput, setFieldError, clearErrors } = useFieldValidation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    clearErrors();
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = responseError(result, "Unable to update your profile.");
        if (response.status === 403) setFieldError("password", message);
        else if (response.status === 409) setFieldError("email", message);
        else toast.error(message);
        return;
      }
      setName(name.trim());
      setEmail(email.trim().toLowerCase());
      setPassword("");
      toast.success("Your profile has been updated.");
      router.refresh();
    } catch {
      toast.error("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="card profile-settings">
    <div>
      <h2>Profile details</h2>
      <p>Confirm your current password to save changes to your name or email.</p>
    </div>
    <form onSubmit={submit} onInvalidCapture={handleInvalid} onInputCapture={handleInput}>
      <div className="form-group">
        <label htmlFor="profile-name">Full name</label>
        <input className="form-field" id="profile-name" name="name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "profile-name-error" : undefined} />
        <FieldError id="profile-name-error" error={errors.name} />
      </div>
      <div className="form-group">
        <label htmlFor="profile-email">Email address</label>
        <input className="form-field" id="profile-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "profile-email-error" : undefined} />
        <FieldError id="profile-email-error" error={errors.email} />
      </div>
      <div className="form-group">
        <label htmlFor="profile-password">Current password</label>
        <input className="form-field" id="profile-password" name="password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "profile-password-error" : undefined} />
        <FieldError id="profile-password-error" error={errors.password} />
      </div>
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving..." : "Save profile"}</button>
    </form>
  </section>;
}
