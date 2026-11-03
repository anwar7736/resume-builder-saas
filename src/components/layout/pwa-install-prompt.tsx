"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-provider";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const toast = useToast();

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
    if (!installPrompt) {
      toast.error("Installation is unavailable. Try your browser menu instead.");
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setInstallPrompt(null);
    } catch (error) {
      console.error("Unable to show the PWA install prompt.", error);
      toast.error("Installation could not be started. Try your browser menu instead.");
    }
  };

  if (installed) return null;

  return (
      <button className="button button-primary button-small pwa-install-action" type="button" onClick={install}>
        <Download size={16} aria-hidden="true" />
        Install App
      </button>
  );
}
