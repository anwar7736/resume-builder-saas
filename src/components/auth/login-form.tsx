"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setNotice("Sign in is not available yet. Authentication has not been connected, and your details were not sent or saved.");
  }

  return (
    <div className="login-card">
      <div className="login-card-heading">
        <span className="eyebrow">Welcome back</span>
        <h2>Sign in to your account</h2>
        <p>Pick up where your next chapter begins.</p>
      </div>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-field">
          <label htmlFor="login-email">Email address</label>
          <div className="login-input-wrap"><Mail size={17} aria-hidden="true" /><input id="login-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} /></div>
        </div>
        <div className="login-field">
          <div className="login-password-label"><label htmlFor="login-password">Password</label><button type="button" className="login-text-button" onClick={() => setNotice("Password recovery will be available when authentication is added.")}>Forgot password?</button></div>
          <div className="login-input-wrap"><LockKeyhole size={17} aria-hidden="true" /><input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required minLength={8} maxLength={128} /><button className="login-password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
        </div>
        <button className="login-submit" type="submit">Sign in <ArrowRight size={16} /></button>
        {notice && <p className="login-notice" role="status">{notice}</p>}
      </form>
      <div className="login-divider"><span>New to ResumeCraft?</span></div>
      <p className="login-signup-note">Account creation is coming soon. For now, explore our <Link href="/templates">resume templates</Link>.</p>
      <p className="login-legal">By continuing, you acknowledge that this sign-in screen is a frontend preview. See our <Link href="/terms">draft terms</Link> and <Link href="/privacy">draft privacy notice</Link>.</p>
    </div>
  );
}
