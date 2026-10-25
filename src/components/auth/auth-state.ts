export const authStateChangedEvent = "resumecraft:auth-state-changed";

export function notifyAuthStateChanged() {
  window.dispatchEvent(new Event(authStateChangedEvent));
}
