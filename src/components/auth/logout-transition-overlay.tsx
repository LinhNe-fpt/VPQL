import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuroraFlowerSvg } from "@/components/auth/login-aurora-flower";
import { formatShortName } from "@/lib/auth";
import { getStoredLoginThemeId, LOGIN_THEMES } from "@/lib/login-theme";

const NAVIGATE_MS = 1750;
const COLLAPSE_MS = 2400;
const FADE_MS = 420;
const FAREWELL_AT_MS = 1200;

type Phase = "leaving" | "farewell";

export function LogoutTransitionOverlay({
  displayName,
  onNavigate,
  onFadeComplete,
}: {
  displayName: string;
  onNavigate: () => void;
  onFadeComplete: () => void;
}) {
  const { t } = useTranslation();
  const palette = LOGIN_THEMES[getStoredLoginThemeId()];
  const [phase, setPhase] = useState<Phase>("leaving");
  const [animate, setAnimate] = useState(false);
  const [shellPhase, setShellPhase] = useState<"collapse" | "fade">("collapse");
  const navigatedRef = useRef(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => setAnimate(true));
    const farewellTimer = window.setTimeout(() => setPhase("farewell"), FAREWELL_AT_MS);
    const navigateTimer = window.setTimeout(() => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      onNavigate();
    }, NAVIGATE_MS);
    const collapseTimer = window.setTimeout(() => {
      setShellPhase("fade");
    }, COLLAPSE_MS);
    const fadeTimer = window.setTimeout(() => onFadeComplete(), COLLAPSE_MS + FADE_MS);

    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
      window.clearTimeout(farewellTimer);
      window.clearTimeout(navigateTimer);
      window.clearTimeout(collapseTimer);
      window.clearTimeout(fadeTimer);
    };
  }, [onNavigate, onFadeComplete]);

  const shortName = formatShortName(displayName);

  return (
    <div
      className={[
        "logout-aurora-shell logout-aurora-shell--in",
        shellPhase === "fade" && "logout-aurora-shell--fade",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
      aria-busy={shellPhase === "collapse"}
    >
      {shellPhase === "collapse" && (
        <>
          <div
            className={[
              "login-aurora login-aurora--ready login-aurora--collapse",
              animate && "login-aurora--collapse-run",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden
          >
            <div className="login-aurora__mesh" />
            <div className="login-aurora__halo" />
            <AuroraFlowerSvg palette={palette} svgId="logout-aurora" className="login-aurora__svg" />
            <div className="login-aurora__vignette" />
          </div>

          <div className="logout-aurora-shell__copy">
            <p className="logout-aurora-shell__label">{t("logout.leavingLabel")}</p>
            <p className="logout-aurora-shell__title">
              {phase === "leaving" ? t("logout.leaving") : t("logout.farewell", { name: shortName })}
            </p>
            {phase === "farewell" && (
              <p className="logout-aurora-shell__hint">{t("logout.redirect")}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
