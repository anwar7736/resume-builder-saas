"use client";

import Link from "next/link";
import { FileText, Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { authStateChangedEvent } from "@/components/auth/auth-state";
import { ButtonLink } from "@/components/ui/button-link";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [labels, setLabels] = useState({ about: "About", plans: "Plans", account: "Sign in", build: "Build Resume" });
  const refreshAuthState = useCallback(async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to check account session.");
    const data: unknown = await response.json();
    return typeof data === "object" && data !== null && "user" in data && Boolean(data.user);
  }, []);
  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    const checkAuth = () => {
      const requestId = ++latestRequest;
      refreshAuthState().then((isSignedIn) => {
        if (active && requestId === latestRequest) setSignedIn(isSignedIn);
      }).catch((error: unknown) => {
        if (active && requestId === latestRequest) console.error("Unable to check account session.", error);
      });
    };
    const handleAuthStateChanged = () => checkAuth();
    checkAuth();
    window.addEventListener(authStateChangedEvent, handleAuthStateChanged);
    fetch("/api/site-content").then((response) => response.json()).then((data: unknown) => {
      if (typeof data === "object" && data !== null && "navigation" in data && typeof data.navigation === "object" && data.navigation !== null) {
        const navigation = data.navigation;
        if ("about" in navigation && "plans" in navigation && "account" in navigation && "build" in navigation &&
            [navigation.about, navigation.plans, navigation.account, navigation.build].every((value) => typeof value === "string")) {
          setLabels({
            about: navigation.about as string,
            plans: navigation.plans as string,
            account: navigation.account as string,
            build: navigation.build as string,
          });
        }
      }
    }).catch((error: unknown) => console.error("Unable to load navigation labels.", error));
    return () => {
      active = false;
      window.removeEventListener(authStateChangedEvent, handleAuthStateChanged);
    };
  }, [refreshAuthState]);
  const links = [
    { href: "/pricing", label: labels.plans },
    { href: "/about", label: labels.about },
  ];
  return (
    <header className="nav-wrap">
      <div className="container nav">
        <Link className="brand" href="/" aria-label="ResumeCraft AI home" onClick={() => setOpen(false)}>
          <span className="brand-mark"><FileText size={18} strokeWidth={2.2} /></span>
          <span>ResumeCraft <span style={{ color: "var(--purple)" }}>AI</span></span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">{links.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
        <div className="nav-actions">
          <ButtonLink href={signedIn ? "/account" : "/login"} variant="secondary" small>{signedIn ? "My account" : labels.account}</ButtonLink>
          <ButtonLink href="/build" small>{labels.build}</ButtonLink>
        </div>
        <button className="mobile-toggle" type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      {open && <nav className="mobile-menu" aria-label="Mobile navigation">
        {links.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
        <Link href={signedIn ? "/account" : "/login"} onClick={() => setOpen(false)}>{signedIn ? "My account" : labels.account}</Link>
        <ButtonLink href="/build" onClick={() => setOpen(false)}>{labels.build}</ButtonLink>
      </nav>}
    </header>
  );
}
