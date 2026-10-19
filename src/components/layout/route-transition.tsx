"use client";

import { FileText } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function RouteTransition() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const [active, setActive] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const clearTimers = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (finishRef.current) clearTimeout(finishRef.current);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
      intervalRef.current = null;
      finishRef.current = null;
      fallbackRef.current = null;
    };

    const finish = () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
      setProgress(100);
      setLoaderVisible(false);
      fallbackRef.current = null;
      finishRef.current = setTimeout(() => {
        setActive(false);
        setProgress(0);
      }, 220);
    };

    const start = () => {
      if (activeRef.current) return;
      if (finishRef.current) clearTimeout(finishRef.current);
      activeRef.current = true;
      setActive(true);
      setLoaderVisible(true);
      setProgress(8);
      intervalRef.current = setInterval(() => {
        setProgress((current) => Math.min(current + Math.max(1, (90 - current) * 0.12), 90));
      }, 180);
      fallbackRef.current = setTimeout(finish, 12000);
    };

    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) return;

      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      start();
    };

    const handlePopState = () => {
      if (window.location.pathname !== pathnameRef.current) start();
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      activeRef.current = false;
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (!activeRef.current) return;

    activeRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    fallbackRef.current = null;
    setProgress(100);
    setLoaderVisible(false);
    finishRef.current = setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 220);
  }, [pathname]);

  return (
    <>
      {active && (
        <div
          className="route-progress"
          role="progressbar"
          aria-label="Loading page"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
      )}
      {active && (
        <div className={`route-loader${loaderVisible ? " is-visible" : ""}`} role="status" aria-label="Loading page" aria-live="polite">
          <div className="route-loader-indicator" aria-hidden="true">
            <span className="route-loader-orbit"><i /></span>
            <span className="route-loader-core"><FileText size={24} strokeWidth={1.8} /></span>
            <span className="route-loader-spark" />
          </div>
        </div>
      )}
    </>
  );
}
