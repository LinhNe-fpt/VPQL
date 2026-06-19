const HANDOFF_KEY = "stockflow_logout_handoff";

export type AuthAuroraPhase = "idle" | "logout";

export type AuthAuroraState = {
  phase: AuthAuroraPhase;
  displayName: string;
};

let state: AuthAuroraState = { phase: "idle", displayName: "" };
const SERVER_SNAPSHOT: AuthAuroraState = { phase: "idle", displayName: "" };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeAuthAurora(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthAuroraSnapshot(): AuthAuroraState {
  return state;
}

export function getAuthAuroraServerSnapshot(): AuthAuroraState {
  return SERVER_SNAPSHOT;
}

export function startAuthAuroraLogout(displayName: string) {
  state = { phase: "logout", displayName };
  emit();
}

export function markLogoutHandoff() {
  try {
    sessionStorage.setItem(HANDOFF_KEY, "1");
  } catch {
    /* private browsing */
  }
}

export function hasLogoutHandoff(): boolean {
  try {
    return sessionStorage.getItem(HANDOFF_KEY) === "1";
  } catch {
    return false;
  }
}

export function finishAuthAuroraTransition() {
  try {
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    /* private browsing */
  }
  state = { phase: "idle", displayName: "" };
  emit();
}
