import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Topbar } from "@/components/topbar";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Cài đặt – Stockflow" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  return (
    <>
      <Topbar title={t("pages.settings.title")} />
      <div className="flex-1 overflow-auto p-6 space-y-5">
        <div className="card-elevated p-6 max-w-lg fluid-in">
          <h2 className="text-[15px] font-semibold tracking-tight">{t("common.language")}</h2>
          <p className="text-[12.5px] text-muted-foreground mt-1 mb-4">
            {t("pages.settings.languageDesc")}
          </p>
          <LanguageSwitcher />
        </div>
        <div className="card-elevated p-10 max-w-md text-center fluid-in">
          <h2 className="text-[16px] font-semibold tracking-tight">{t("pages.settings.heading")}</h2>
          <p className="text-[12.5px] text-muted-foreground mt-2">{t("pages.settings.desc")}</p>
        </div>
      </div>
    </>
  );
}
