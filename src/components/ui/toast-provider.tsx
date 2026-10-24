"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++nextId.current;
    setToasts((current) => [...current.slice(-3), { id, kind, message }]);
    timers.current.set(id, setTimeout(() => dismiss(id), kind === "error" ? 7000 : 5000));
  }, [dismiss]);

  useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer);
  }, []);

  const value: ToastContextValue = {
    success: (message) => push("success", message),
    error: (message) => push("error", message),
    info: (message) => push("info", message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions text" aria-label="Notifications">
        {toasts.map((toast) => {
          const Icon = toast.kind === "success" ? CircleCheck : toast.kind === "error" ? CircleAlert : Info;
          return (
            <div className={`toast toast-${toast.kind}`} key={toast.id} role={toast.kind === "error" ? "alert" : "status"}>
              <Icon className="toast-icon" size={19} aria-hidden="true" />
              <p>{toast.message}</p>
              <button className="toast-dismiss" type="button" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context;
}
