import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { LoginTransitionOverlay } from "@/components/auth/login-transition-overlay";
import { XiaomiSupergraphic } from "@/components/auth/xiaomi-supergraphic";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api/auth.functions";
import { hasSession, setSession } from "@/lib/auth";

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

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [transitionUser, setTransitionUser] = useState<string | null>(null);

  const finishTransition = useCallback(() => {
    navigate({ to: "/" });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error(t("login.fillRequired"));
      return;
    }

    setLoading(true);
    try {
      const session = await login({ data: { username: username.trim(), password } });
      setSession(session);
      setTransitionUser(session.displayName);
    } catch {
      toast.error(t("auth.invalidCredentials"));
      setLoading(false);
    }
  }

  return (
    <>
      {transitionUser && (
        <LoginTransitionOverlay displayName={transitionUser} onComplete={finishTransition} />
      )}

      <div className="xiaomi-login-root min-h-screen relative overflow-hidden">
        {!transitionUser && <XiaomiSupergraphic variant="scene" />}

        <div className="relative z-20 flex min-h-screen flex-col">
          <header className="flex items-center justify-between gap-4 px-6 py-5 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="xiaomi-login-logo size-10 rounded-xl grid place-items-center">
                <Zap className="size-5 text-white" strokeWidth={2.4} />
              </div>
              <div>
                <p className="text-[17px] font-semibold tracking-tight text-gray-900">Stockflow</p>
                <p className="text-[12px] text-gray-500">{t("common.edition")}</p>
              </div>
            </div>
            <LanguageSwitcher
              compact
              className="border-gray-200 bg-white/80 text-gray-700 shadow-sm [&_span]:text-gray-700"
            />
          </header>

          <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 lg:flex-row lg:items-center lg:justify-end lg:gap-12 lg:pr-[6%] lg:pl-[42%]">
            <div className="mb-8 text-center lg:mb-0 lg:hidden">
              <p className="text-[13px] font-medium text-[#ff6900]">{t("login.heroEyebrow")}</p>
              <h1 className="mt-2 text-xl font-semibold text-gray-900">{t("login.heroTitle")}</h1>
            </div>

            <div className="xiaomi-login-card w-full max-w-[400px]">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                  {t("login.title")}
                </h2>
                <p className="mt-1.5 text-sm text-gray-500">{t("login.subtitle")}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-700">
                    {t("login.username")}
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    placeholder={t("login.usernamePlaceholder")}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="h-10 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">
                    {t("login.password")}
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-10 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-10 w-full bg-[#ff6900] text-white hover:bg-[#e55f00]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t("login.verifying")}
                    </>
                  ) : (
                    t("login.submit")
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-[12px] text-gray-400">
                {t("common.contactAdmin")}
              </p>
            </div>
          </div>

          <p className="relative z-10 px-6 pb-5 text-center text-[11px] text-gray-400 lg:text-left lg:px-10">
            {t("common.internalNet")}
          </p>
        </div>
      </div>
    </>
  );
}
