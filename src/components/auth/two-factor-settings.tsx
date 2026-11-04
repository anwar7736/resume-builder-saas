"use client";

import Image from "next/image";
import { Copy } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { FieldError } from "@/components/ui/field-validation";
import { useToast } from "@/components/ui/toast-provider";

type SetupData = {
  secret: string;
  qrCodeDataUrl: string;
};

function isSetupData(value: unknown): value is SetupData {
  return typeof value === "object" && value !== null &&
    "secret" in value && typeof value.secret === "string" &&
    "qrCodeDataUrl" in value && typeof value.qrCodeDataUrl === "string";
}

function responseError(value: unknown, fallback: string) {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
    ? value.error
    : fallback;
}

export function TwoFactorSettings({ scope }: { scope: "user" | "admin" }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [passwordError, setPasswordError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const toast = useToast();
  const endpoint = scope === "admin" ? "/api/admin/two-factor" : "/api/auth/two-factor";

  function validationMessage(input: HTMLInputElement) {
    if (input.validity.valueMissing) {
      return input.name === "password" ? "Enter your current password." : "Enter the 6-digit authenticator code.";
    }
    if (input.name === "code" && input.validity.patternMismatch) return "Enter a 6-digit authenticator code.";
    return input.validationMessage;
  }

  function handleInvalid(event: FormEvent<HTMLFormElement>) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    event.preventDefault();
    const message = validationMessage(input);
    if (input.name === "password") setPasswordError(message);
    if (input.name === "code") setCodeError(message);
  }

  function handleInput(event: FormEvent<HTMLFormElement>) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const message = input.validity.valid ? "" : validationMessage(input);
    if (input.name === "password") setPasswordError(message);
    if (input.name === "code") setCodeError(message);
  }

  async function copySetupKey(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success("Authenticator setup key copied.");
    } catch {
      toast.error("Unable to copy the setup key. Please copy it manually.");
    }
  }

  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (!response.ok || typeof result !== "object" || result === null ||
            !("enabled" in result) || typeof result.enabled !== "boolean") {
          throw new Error(responseError(result, "Unable to load two-factor settings."));
        }
        if (active) setEnabled(result.enabled);
      })
      .catch((error: unknown) => {
        if (active) setGeneralError(error instanceof Error ? error.message : "Unable to load two-factor settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [endpoint]);

  async function submit(action: "setup" | "enable" | "disable", event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setPasswordError("");
    setCodeError("");
    setGeneralError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, password, code }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = responseError(result, "Unable to update two-factor settings.");
        if (response.status === 403 || message.toLowerCase().includes("password")) setPasswordError(message);
        else if (action !== "setup" && (response.status === 400 || response.status === 429 || message.toLowerCase().includes("code"))) setCodeError(message);
        else setGeneralError(message);
        return;
      }
      if (action === "setup") {
        if (!isSetupData(result)) throw new Error("The server returned invalid authenticator setup data.");
        setSetup(result);
        setCode("");
        toast.info("Scan the QR code with your authenticator app, then enter its current 6-digit code.");
      } else if (action === "enable") {
        setEnabled(true);
        setSetup(null);
        setPassword("");
        setCode("");
        toast.success("Two-factor authentication enabled.");
      } else {
        setEnabled(false);
        setSetup(null);
        setPassword("");
        setCode("");
        toast.success("Two-factor authentication disabled.");
      }
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : "Unable to update two-factor settings.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="card two-factor-settings"><p>Loading security settings...</p></section>;

  return <section className="card two-factor-settings">
    <div>
      <h3>Authenticator app two-factor authentication</h3>
      <p>{enabled
        ? "Your account requires an authenticator code each time you sign in."
        : "Add a second sign-in step using an authenticator app such as Google Authenticator, Microsoft Authenticator, or 1Password."}</p>
    </div>
    {generalError && <p className="form-error" role="alert">{generalError}</p>}
    {!enabled && !setup && <form className="two-factor-form" onSubmit={(event) => void submit("setup", event)} onInvalidCapture={handleInvalid} onInputCapture={handleInput}>
      <label className="form-group">
        Current password
        <input className="form-field" name="password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(passwordError)} aria-describedby={passwordError ? "two-factor-password-error" : undefined} />
        <FieldError id="two-factor-password-error" error={passwordError} />
      </label>
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Preparing..." : "Set up authenticator"}</button>
    </form>}
    {setup && <div className="two-factor-setup">
      <p>Scan this QR code in your authenticator app. You can also enter the setup key manually.</p>
      <Image src={setup.qrCodeDataUrl} alt="Authenticator setup QR code" width={240} height={240} unoptimized />
      <div className="two-factor-secret"><strong>Setup key</strong><div className="two-factor-secret-value"><code>{setup.secret}</code><button className="button button-secondary button-small" type="button" onClick={() => void copySetupKey(setup.secret)}><Copy size={15} aria-hidden="true" />Copy key</button></div></div>
      <form className="two-factor-form" onSubmit={(event) => void submit("enable", event)} onInvalidCapture={handleInvalid} onInputCapture={handleInput}>
        <label className="form-group">
          6-digit authenticator code
          <input className="form-field" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} aria-invalid={Boolean(codeError)} aria-describedby={codeError ? "two-factor-code-error" : undefined} />
          <FieldError id="two-factor-code-error" error={codeError} />
        </label>
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Verifying..." : "Verify and enable"}</button>
      </form>
    </div>}
    {enabled && <form className="two-factor-form" onSubmit={(event) => void submit("disable", event)} onInvalidCapture={handleInvalid} onInputCapture={handleInput}>
      <label className="form-group">
        Current password
        <input className="form-field" name="password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(passwordError)} aria-describedby={passwordError ? "two-factor-password-error" : undefined} />
        <FieldError id="two-factor-password-error" error={passwordError} />
      </label>
      <label className="form-group">
        6-digit authenticator code
        <input className="form-field" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} aria-invalid={Boolean(codeError)} aria-describedby={codeError ? "two-factor-code-error" : undefined} />
        <FieldError id="two-factor-code-error" error={codeError} />
      </label>
      <button className="button button-secondary" type="submit" disabled={busy}>{busy ? "Updating..." : "Disable two-factor authentication"}</button>
    </form>}
  </section>;
}
