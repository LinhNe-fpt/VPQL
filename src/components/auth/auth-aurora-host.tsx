import { useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";

import { LogoutTransitionOverlay } from "@/components/auth/logout-transition-overlay";
import {
  finishAuthAuroraTransition,
  getAuthAuroraServerSnapshot,
  getAuthAuroraSnapshot,
  markLogoutHandoff,
  subscribeAuthAurora,
} from "@/lib/auth-aurora-bridge";
import { clearSession, getSession, setUnlockHint } from "@/lib/auth";

/** Overlay aurora sống ở root — không bị gỡ khi chuyển route logout → login. */
export function AuthAuroraHost() {
  const { phase, displayName } = useSyncExternalStore(
    subscribeAuthAurora,
    getAuthAuroraSnapshot,
    getAuthAuroraServerSnapshot,
  );
  const navigate = useNavigate();

  const handleNavigate = useCallback(() => {
    const session = getSession();
    if (session) {
      setUnlockHint({ username: session.username, displayName: session.displayName });
    }
    clearSession();
    markLogoutHandoff();
    navigate({ to: "/login" });
  }, [navigate]);

  const handleFadeComplete = useCallback(() => {
    finishAuthAuroraTransition();
  }, []);

  if (phase === "idle" || typeof document === "undefined") return null;

  return createPortal(
    <LogoutTransitionOverlay
      displayName={displayName}
      onNavigate={handleNavigate}
      onFadeComplete={handleFadeComplete}
    />,
    document.body,
  );
}
