import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

import { getInitials } from "@/lib/auth";

const LAND_FLAG = "stockflow_land";
const LOADING_MS = 720;
const SUCCESS_MS = 580;
const FADE_MS = 480;

export function markLoginLand() {
  sessionStorage.setItem(LAND_FLAG, "1");
}

export function consumeLoginLand(): boolean {
  if (sessionStorage.getItem(LAND_FLAG) !== "1") return false;
  sessionStorage.removeItem(LAND_FLAG);
  return true;
}

type Phase = "loading" | "success" | "fade";

export function LoginTransitionOverlay({
  displayName,
  onComplete,
}: {
  displayName: string;
  onComplete: () => void;
}) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("loading");
  const [mounted, setMounted] = useState(false);
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    markLoginLand();
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const mountFrame = requestAnimationFrame(() => setMounted(true));

    const successTimer = window.setTimeout(() => setPhase("success"), LOADING_MS);
    const fadeTimer = window.setTimeout(() => setPhase("fade"), LOADING_MS + SUCCESS_MS);
    const completeTimer = window.setTimeout(() => finish(), LOADING_MS + SUCCESS_MS + FADE_MS);

    return () => {
      cancelAnimationFrame(mountFrame);
      window.clearTimeout(successTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(completeTimer);
    };
  }, [finish]);

  const shortName = displayName.trim().split(/\s+/).pop() || displayName;

  return (
    <div
      className={[
        "login-enter-overlay fixed inset-0 z-[100] grid place-items-center",
        mounted && "login-enter-overlay--in",
        phase === "fade" && "login-enter-overlay--fade",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
      aria-busy={phase !== "fade"}
    >
      <div
        className={[
          "login-enter-overlay__card",
          phase === "success" && "login-enter-overlay__card--success",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="login-enter-overlay__icon" aria-hidden>
          {phase === "loading" ? (
            <div className="login-enter-overlay__ring">
              <div className="login-enter-overlay__ring-track" />
              <div className="login-enter-overlay__ring-spin" />
            </div>
          ) : (
            <div className="login-enter-overlay__badge">
              <span className="login-enter-overlay__avatar">{getInitials(displayName)}</span>
              <span className="login-enter-overlay__check">
                <Check className="size-4" strokeWidth={2.8} />
              </span>
            </div>
          )}
        </div>

        <div className="login-enter-overlay__copy">
          {phase === "loading" ? (
            <p className="login-enter-overlay__text" key="loading">
              {t("login.verifying")}
            </p>
          ) : (
            <>
              <p className="login-enter-overlay__welcome" key="welcome">
                {t("login.transitionWelcome", { name: shortName })}
              </p>
              <p className="login-enter-overlay__hint">{t("login.transitionRedirect")}</p>
            </>
          )}
        </div>

        <div className="login-enter-overlay__progress" aria-hidden>
          <div
            className="login-enter-overlay__progress-bar"
            style={{
              animationDuration: `${LOADING_MS + SUCCESS_MS + FADE_MS}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
