import { useEffect, useState } from "react";

import { AuroraFlowerSvg } from "@/components/auth/login-aurora-flower";
import { hasLogoutHandoff } from "@/lib/auth-aurora-bridge";
import type { LoginThemePalette } from "@/lib/login-theme";

/** Chờ paint + idle trước khi bloom — handoff logout chỉ đọc sau mount (tránh lệch SSR). */
function useAuroraReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const markReady = () => {
      if (!cancelled) setReady(true);
    };

    if (hasLogoutHandoff()) {
      const raf = requestAnimationFrame(markReady);
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
      };
    }

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(markReady, { timeout: 120 });
        } else {
          setTimeout(markReady, 48);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  return ready;
}

/** Nền trừu tượng kiểu macOS — SVG + gradient, không dùng ảnh tĩnh. */
export function LoginAuroraBackdrop({ palette }: { palette: LoginThemePalette }) {
  const ready = useAuroraReady();

  return (
    <div className={`login-aurora${ready ? " login-aurora--ready" : ""}`} aria-hidden>
      <div className="login-aurora__mesh" />
      <div className="login-aurora__halo" />
      <AuroraFlowerSvg palette={palette} className="login-aurora__svg" />
      <div className="login-aurora__vignette" />
    </div>
  );
}
