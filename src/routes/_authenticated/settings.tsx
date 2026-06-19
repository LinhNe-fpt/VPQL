import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, Loader2, Lock, User } from "lucide-react";
import { toast } from "sonner";

import { Topbar } from "@/components/topbar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LoginThemePicker } from "@/components/auth/login-theme-picker";
import {
  changeUserPassword,
  getPinStatus,
  removeLoginPin,
  setLoginPin,
  updateUserProfile,
} from "@/lib/api/auth.functions";
import {
  getIssuerName,
  getRoleLabel,
  getRoleSubtitle,
  updateSessionProfile,
  useClientSession,
} from "@/lib/auth";
import { useLoginTheme } from "@/lib/use-login-theme";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Cài đặt – Stockflow" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const session = useClientSession();
  const { themeId, setThemeId } = useLoginTheme();

  return (
    <>
      <Topbar title={t("pages.settings.title")} subtitle={t("pages.settings.subtitle")} />
      <div className="flex-1 overflow-auto p-6 space-y-5 max-w-2xl">
        {session && <KeeperProfileCard session={session} />}
        {session && <PasswordCard session={session} />}
        {session && <PinCard session={session} />}
        <div className="card-elevated p-6 fluid-in">
          <h2 className="text-[15px] font-semibold tracking-tight">{t("pages.settings.loginThemeTitle")}</h2>
          <p className="text-[12.5px] text-muted-foreground mt-1 mb-4">
            {t("pages.settings.loginThemeDesc")}
          </p>
          <LoginThemePicker themeId={themeId} onThemeChange={setThemeId} />
        </div>
        <div className="card-elevated p-6 fluid-in">
          <h2 className="text-[15px] font-semibold tracking-tight">{t("common.language")}</h2>
          <p className="text-[12.5px] text-muted-foreground mt-1 mb-4">
            {t("pages.settings.languageDesc")}
          </p>
          <LanguageSwitcher />
        </div>
      </div>
    </>
  );
}

function KeeperProfileCard({
  session,
}: {
  session: NonNullable<ReturnType<typeof useClientSession>>;
}) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(session.displayName);
  const [email, setEmail] = useState(session.email ?? "");
  const [phone, setPhone] = useState(session.phone ?? "");
  const [department, setDepartment] = useState(session.department ?? "");
  const [currentPassword, setCurrentPassword] = useState("");

  useEffect(() => {
    setDisplayName(session.displayName);
    setEmail(session.email ?? "");
    setPhone(session.phone ?? "");
    setDepartment(session.department ?? "");
  }, [session]);

  const mutation = useMutation({
    mutationFn: () =>
      updateUserProfile({
        data: {
          username: session.username,
          currentPassword,
          displayName: displayName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          department: department.trim() || undefined,
        },
      }),
    onSuccess: (profile) => {
      updateSessionProfile({
        displayName: profile.displayName,
        email: profile.email,
        phone: profile.phone,
        department: profile.department,
      });
      setCurrentPassword("");
      toast.success(t("pages.settings.profileSaved"));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("pages.settings.profileError"));
    },
  });

  const issuerPreview = getIssuerName({ ...session, displayName: displayName.trim() || session.displayName });

  return (
    <div className="card-elevated p-6 fluid-in space-y-4">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
          <User className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">{t("pages.settings.profileTitle")}</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">{t("pages.settings.profileDesc")}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-[12.5px] p-3 rounded-lg bg-muted/40 border border-border/60">
        <div>
          <dt className="text-muted-foreground">{t("pages.settings.loginId")}</dt>
          <dd className="font-mono font-semibold mt-0.5">{session.username}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("pages.settings.role")}</dt>
          <dd className="font-semibold mt-0.5">{getRoleLabel(session.role)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">{t("pages.settings.issuerPreview")}</dt>
          <dd className="font-semibold mt-0.5">{issuerPreview}</dd>
          <dd className="text-[11px] text-muted-foreground">{getRoleSubtitle(session.role)}</dd>
        </div>
      </dl>

      <div className="space-y-3">
        <Field label={t("pages.settings.fullName")} required>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputCls}
            placeholder={t("pages.settings.fullNamePh")}
          />
        </Field>
        <Field label={t("pages.settings.department")}>
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={inputCls}
            placeholder={t("pages.settings.departmentPh")}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("pages.settings.email")}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="email@congty.vn"
            />
          </Field>
          <Field label={t("pages.settings.phone")}>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
              placeholder="09xx xxx xxx"
            />
          </Field>
        </div>
        <Field label={t("pages.settings.currentPassword")} required>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputCls}
            placeholder="••••••"
            autoComplete="current-password"
          />
        </Field>
      </div>

      <button
        type="button"
        disabled={!displayName.trim() || !currentPassword || mutation.isPending}
        onClick={() => mutation.mutate()}
        className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
      >
        {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
        {t("pages.settings.saveProfile")}
      </button>
    </div>
  );
}

function PasswordCard({
  session,
}: {
  session: NonNullable<ReturnType<typeof useClientSession>>;
}) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      changeUserPassword({
        data: {
          username: session.username,
          currentPassword,
          newPassword,
          confirmPassword,
        },
      }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("pages.settings.passwordSaved"));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("pages.settings.passwordError"));
    },
  });

  const canSubmit =
    currentPassword &&
    newPassword.length >= 4 &&
    newPassword === confirmPassword &&
    !mutation.isPending;

  return (
    <div className="card-elevated p-6 fluid-in space-y-4">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-muted grid place-items-center shrink-0">
          <Lock className="size-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">{t("pages.settings.passwordTitle")}</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">{t("pages.settings.passwordDesc")}</p>
        </div>
      </div>

      <div className="space-y-3">
        <Field label={t("pages.settings.currentPassword")} required>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputCls}
            autoComplete="current-password"
          />
        </Field>
        <Field label={t("pages.settings.newPassword")} required>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputCls}
            autoComplete="new-password"
          />
        </Field>
        <Field label={t("pages.settings.confirmPassword")} required>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputCls}
            autoComplete="new-password"
          />
        </Field>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => mutation.mutate()}
        className="h-10 px-5 rounded-lg border border-border bg-card text-[13px] font-semibold hover:bg-muted disabled:opacity-50 flex items-center gap-2"
      >
        {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
        {t("pages.settings.changePassword")}
      </button>
    </div>
  );
}

function PinCard({
  session,
}: {
  session: NonNullable<ReturnType<typeof useClientSession>>;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const statusQuery = useQuery({
    queryKey: ["pin-status", session.username],
    queryFn: () => getPinStatus({ data: { username: session.username } }),
  });

  const hasPin = statusQuery.data?.hasPin ?? false;

  const setMutation = useMutation({
    mutationFn: () =>
      setLoginPin({
        data: {
          username: session.username,
          currentPassword,
          pin,
          confirmPin,
        },
      }),
    onSuccess: () => {
      setCurrentPassword("");
      setPin("");
      setConfirmPin("");
      void queryClient.invalidateQueries({ queryKey: ["pin-status", session.username] });
      toast.success(t("pages.settings.pinSaved"));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("pages.settings.pinError"));
    },
  });

  const removeMutation = useMutation({
    mutationFn: () =>
      removeLoginPin({
        data: {
          username: session.username,
          currentPassword,
        },
      }),
    onSuccess: () => {
      setCurrentPassword("");
      setPin("");
      setConfirmPin("");
      void queryClient.invalidateQueries({ queryKey: ["pin-status", session.username] });
      toast.success(t("pages.settings.pinRemoved"));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("pages.settings.pinError"));
    },
  });

  const pinValid = /^\d{4,6}$/.test(pin);
  const canSet =
    currentPassword &&
    pinValid &&
    pin === confirmPin &&
    !setMutation.isPending &&
    !removeMutation.isPending;

  const canRemove = currentPassword && hasPin && !setMutation.isPending && !removeMutation.isPending;

  return (
    <div className="card-elevated p-6 fluid-in space-y-4">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-muted grid place-items-center shrink-0">
          <KeyRound className="size-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">{t("pages.settings.pinTitle")}</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            {hasPin ? t("pages.settings.pinDescEnabled") : t("pages.settings.pinDesc")}
          </p>
        </div>
      </div>

      {statusQuery.isLoading ? (
        <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground py-2">
          <Loader2 className="size-4 animate-spin" />
          {t("common.loading")}
        </div>
      ) : (
        <div className="space-y-3">
          <Field label={t("pages.settings.currentPassword")} required>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
              autoComplete="current-password"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t("pages.settings.pinCode")} required>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={inputCls}
                placeholder="••••"
                autoComplete="off"
              />
            </Field>
            <Field label={t("pages.settings.confirmPin")} required>
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={inputCls}
                placeholder="••••"
                autoComplete="off"
              />
            </Field>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canSet}
          onClick={() => setMutation.mutate()}
          className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
        >
          {setMutation.isPending && <Loader2 className="size-4 animate-spin" />}
          {hasPin ? t("pages.settings.changePin") : t("pages.settings.setPin")}
        </button>
        {hasPin && (
          <button
            type="button"
            disabled={!canRemove}
            onClick={() => removeMutation.mutate()}
            className="h-10 px-5 rounded-lg border border-border bg-card text-[13px] font-semibold hover:bg-muted disabled:opacity-50 flex items-center gap-2"
          >
            {removeMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("pages.settings.removePin")}
          </button>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "mt-1 w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:ring-2 focus:ring-ring/25";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[12px] font-medium text-foreground">
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
      {children}
    </label>
  );
}
