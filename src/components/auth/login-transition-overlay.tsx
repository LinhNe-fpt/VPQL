import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

import { XiaomiSupergraphic } from "@/components/auth/xiaomi-supergraphic";
import { getInitials } from "@/lib/auth";

const ENTER_FLAG = "stockflow_enter";
const FLIGHT_MS = 1850;
const COMPLETE_MS = 2000;

export function setEnterAnimationFlag() {
  sessionStorage.setItem(ENTER_FLAG, "1");
}

export function consumeEnterAnimationFlag(): boolean {
  if (sessionStorage.getItem(ENTER_FLAG) !== "1") return false;
  sessionStorage.removeItem(ENTER_FLAG);
  return true;
}

type Phase = "boot" | "sync" | "welcome";

export function LoginTransitionOverlay({
  displayName,
  onComplete,
}: {
  displayName: string;
  onComplete: () => void;
}) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("boot");
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setEnterAnimationFlag();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => onComplete());
    });
  }, [onComplete]);

  useEffect(() => {
    const syncTimer = window.setTimeout(() => setPhase("sync"), 520);
    const welcomeTimer = window.setTimeout(() => setPhase("welcome"), FLIGHT_MS);
    const completeTimer = window.setTimeout(() => finish(), COMPLETE_MS);

    return () => {
      window.clearTimeout(syncTimer);
      window.clearTimeout(welcomeTimer);
      window.clearTimeout(completeTimer);
    };
  }, [finish]);

  const status =
    phase === "boot"
      ? t("login.transitionBoot")
      : phase === "sync"
        ? t("login.transitionSync")
        : t("login.transitionWelcome", { name: displayName });

  return (
    <div
      className="mi-transition-root fixed inset-0 z-[100]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mi-transition-camera">
        <div className="mi-transition-camera-zoom">
          <XiaomiSupergraphic variant="fullscreen" staticLayer />
        </div>
      </div>

      <div className="mi-transition-ui">
        {phase === "welcome" ? (
          <div className="mi-transition-welcome-badge">
            <Check className="size-5" strokeWidth={2.5} />
          </div>
        ) : null}
        <p className="mi-transition-status" key={phase}>{status}</p>
        {phase === "welcome" && (
          <div className="mi-transition-user">
            <span className="mi-transition-avatar">{getInitials(displayName)}</span>
            <span>{t("login.transitionRedirect")}</span>
          </div>
        )}
        <div className="mi-transition-progress">
          <div className="mi-transition-progress-bar" />
        </div>
      </div>
    </div>
  );
}
