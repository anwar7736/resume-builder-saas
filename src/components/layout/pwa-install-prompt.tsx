"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installError, setInstallError] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setInstallPrompt(null);
    } catch (error) {
      console.error("Unable to show the PWA install prompt.", error);
      setInstallError(true);
    }
  };

  if (!installPrompt || dismissed || installed) return null;

  return (
    <aside className="pwa-install" aria-label="Install ResumeCraft">
      <div className="pwa-install-copy">
        <strong>Take ResumeCraft with you</strong>
        <span>
          {installError
            ? "Installation could not be started. Try your browser menu instead."
            : "Install the app for quick access from your home screen."}
        </span>
      </div>
      <button className="pwa-install-action" type="button" onClick={install}>
        <Download size={16} aria-hidden="true" />
        Install
      </button>
      <button
        className="pwa-install-dismiss"
        type="button"
        aria-label="Dismiss install prompt"
        onClick={() => setDismissed(true)}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </aside>
  );
}
