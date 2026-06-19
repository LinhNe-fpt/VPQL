import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { LoginAuroraBackdrop } from "@/components/auth/login-aurora-backdrop";
import { LoginThemePicker } from "@/components/auth/login-theme-picker";
import { LoginTransitionOverlay } from "@/components/auth/login-transition-overlay";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getUnlockInfoFn, login, loginWithPin } from "@/lib/api/auth.functions";
import { useLoginTheme } from "@/lib/use-login-theme";
import {
  clearUnlockHint,
  getUnlockHint,
  hasSession,
  setSession,
  type UnlockHint,
} from "@/lib/auth";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && hasSession()) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [
      { title: "Đăng nhập – Stockflow" },
      { name: "description", content: "Đăng nhập hệ thống quản lý kho VPP & BHLĐ." },
    ],
  }),
  component: LoginPage,
});

type LoginMode = "pin" | "full";

function LoginField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="login-field block">
      <span className="login-field__label">{label}</span>
      {children}
    </label>
  );
}

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { themeId, setThemeId, palette } = useLoginTheme();
  const [mode, setMode] = useState<LoginMode>("full");
  const [unlockHint, setUnlockHint] = useState<UnlockHint | null>(null);
  const [checkingUnlock, setCheckingUnlock] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionUser, setTransitionUser] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function resolveUnlock() {
      const hint = getUnlockHint();
      if (!hint) {
        if (!cancelled) {
          setCheckingUnlock(false);
          setMode("full");
        }
        return;
      }

      try {
        const info = await getUnlockInfoFn({ data: { username: hint.username } });
        if (cancelled) return;

        if (!info.found) {
          clearUnlockHint();
          setCheckingUnlock(false);
          return;
        }

        setUnlockHint({ username: info.username, displayName: info.displayName });
        setUsername(info.username);

        if (info.hasPin) {
          setMode("pin");
        } else {
          setMode("full");
        }
      } catch {
        if (!cancelled) {
          setUnlockHint(hint);
          setUsername(hint.username);
          setMode("full");
        }
      } finally {
        if (!cancelled) setCheckingUnlock(false);
      }
    }

    const run = () => {
      void resolveUnlock();
    };

    if (typeof requestIdleCallback !== "undefined") {
      const idleId = requestIdleCallback(run, { timeout: 280 });
      return () => {
        cancelled = true;
        cancelIdleCallback(idleId);
      };
    }

    const timerId = window.setTimeout(run, 64);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, []);

  const finishTransition = useCallback(() => {
    navigate({ to: "/" });
  }, [navigate]);

  async function completeLogin(session: Awaited<ReturnType<typeof login>>) {
    setSession(session);
    setTransitionUser(session.displayName);
    setTransitioning(true);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error(t("login.fillRequired"));
      return;
    }

    setLoading(true);
    try {
      const session = await login({ data: { username: username.trim(), password } });
      await completeLogin(session);
    } catch {
      toast.error(t("auth.invalidCredentials"));
      setLoading(false);
    }
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unlockHint || !/^\d{4,6}$/.test(pin)) {
      toast.error(t("login.pinInvalid"));
      return;
    }

    setLoading(true);
    try {
      const session = await loginWithPin({ data: { username: unlockHint.username, pin } });
      await completeLogin(session);
    } catch {
      toast.error(t("login.pinWrong"));
      setLoading(false);
    }
  }

  function switchToPasswordLogin() {
    setMode("full");
    setPin("");
    if (unlockHint) setUsername(unlockHint.username);
  }

  function switchToOtherAccount() {
    clearUnlockHint();
    setUnlockHint(null);
    setMode("full");
    setUsername("");
    setPassword("");
    setPin("");
  }

  const showPinForm = mode === "pin" && unlockHint && !checkingUnlock;

  const formHeading = showPinForm ? t("login.pinTitle") : t("login.title");
  const formSubtitle = showPinForm
    ? t("login.pinSubtitle", { name: unlockHint!.displayName })
    : t("login.welcomeBackDesc");

  return (
    <>
      {transitioning && (
        <LoginTransitionOverlay displayName={transitionUser} onComplete={finishTransition} />
      )}

      <div className="login-shell login-shell--wallpaper">
        <LoginAuroraBackdrop palette={palette} />

        <header className="login-topbar">
          <div className="login-topbar__actions">
            <LoginThemePicker themeId={themeId} onThemeChange={setThemeId} compact />
            <LanguageSwitcher compact className="login-lang border-white/40 bg-white/55 shadow-sm backdrop-blur-md" />
          </div>
        </header>

        <main className="login-center">
          <div className="login-glass-card">
            <div className="login-glass-card__brand">
              <div className="login-glass-card__logo">
                <Zap className="size-5 text-white" strokeWidth={2.4} />
              </div>
              <div>
                <p className="login-glass-card__name">Stockflow</p>
                <p className="login-glass-card__edition">{t("common.edition")}</p>
              </div>
            </div>

            {checkingUnlock ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <Loader2 className="size-7 animate-spin text-slate-600" />
                <p className="text-sm text-slate-500">{t("login.checkingUnlock")}</p>
              </div>
            ) : (
              <>
                <div className="login-glass-card__head">
                  <h1 className="login-form__title">{formHeading}</h1>
                  <p className="login-form__subtitle">{formSubtitle}</p>
                </div>

                {showPinForm ? (
                  <form onSubmit={handlePinSubmit} className="space-y-5">
                    <LoginField id="pin" label={t("login.pinLabel")}>
                      <input
                        id="pin"
                        name="pin"
                        type="password"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="••••"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        disabled={loading}
                        className="login-field__input login-field__input--glass login-field__input--pin"
                        autoFocus
                      />
                    </LoginField>

                    <button
                      type="submit"
                      disabled={loading || pin.length < 4}
                      className="login-btn-pill login-btn-pill--glass"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          {t("login.verifying")}
                        </>
                      ) : (
                        t("login.pinSubmit")
                      )}
                    </button>

                    <div className="login-form__links">
                      <button type="button" onClick={switchToPasswordLogin} className="login-link">
                        {t("login.usePassword")}
                      </button>
                      <button type="button" onClick={switchToOtherAccount} className="login-link login-link--muted">
                        {t("login.otherAccount")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handlePasswordSubmit} className="space-y-5">
                    <LoginField id="username" label={t("login.username")}>
                      <input
                        id="username"
                        name="username"
                        autoComplete="username"
                        placeholder={t("login.usernamePlaceholder")}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                        className="login-field__input login-field__input--glass"
                      />
                    </LoginField>

                    <LoginField id="password" label={t("login.password")}>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        className="login-field__input login-field__input--glass"
                      />
                    </LoginField>

                    <button type="submit" disabled={loading} className="login-btn-pill login-btn-pill--glass">
                      {loading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          {t("login.verifying")}
                        </>
                      ) : (
                        t("login.submit")
                      )}
                    </button>

                    {unlockHint && (
                      <div className="login-form__links">
                        <button type="button" onClick={switchToOtherAccount} className="login-link login-link--muted">
                          {t("login.otherAccount")}
                        </button>
                      </div>
                    )}

                    <p className="login-form__hint">{t("common.contactAdmin")}</p>
                  </form>
                )}
              </>
            )}
          </div>
        </main>

        <footer className="login-footnote">{t("common.internalNet")}</footer>
      </div>
    </>
  );
}
