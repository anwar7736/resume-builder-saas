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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
        body: JSON.stringify({ name, email, currentPassword, newPassword, confirmPassword }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = responseError(result, "Unable to update your profile.");
        const code = typeof result === "object" && result !== null && "code" in result
          ? result.code
          : undefined;
        if (response.status === 403) setFieldError("currentPassword", message);
        else if (response.status === 409) setFieldError("email", message);
        else if (code === "invalid_new_password") setFieldError("newPassword", message);
        else if (code === "password_mismatch") setFieldError("confirmPassword", message);
        else toast.error(message);
        return;
      }
      setName(name.trim());
      setEmail(email.trim().toLowerCase());
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(newPassword ? "Your profile and password have been updated." : "Your profile has been updated.");
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
      <p>Enter your current password to save profile changes or set a new password.</p>
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
        <label htmlFor="profile-current-password">Current password</label>
        <input className="form-field" id="profile-current-password" name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} aria-invalid={Boolean(errors.currentPassword)} aria-describedby={errors.currentPassword ? "profile-current-password-error" : undefined} />
        <FieldError id="profile-current-password-error" error={errors.currentPassword} />
      </div>
      <div className="form-group">
        <label htmlFor="profile-new-password">New password <small>(optional)</small></label>
        <input className="form-field" id="profile-new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} aria-invalid={Boolean(errors.newPassword)} aria-describedby={errors.newPassword ? "profile-new-password-error" : undefined} />
        <FieldError id="profile-new-password-error" error={errors.newPassword} />
      </div>
      <div className="form-group">
        <label htmlFor="profile-confirm-password">Confirm new password <small>(optional)</small></label>
        <input className="form-field" id="profile-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? "profile-confirm-password-error" : undefined} />
        <FieldError id="profile-confirm-password-error" error={errors.confirmPassword} />
      </div>
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving..." : "Save profile"}</button>
    </form>
  </section>;
}
