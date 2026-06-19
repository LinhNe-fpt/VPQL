import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { startAuthAuroraLogout } from "@/lib/auth-aurora-bridge";
import { formatShortName, getSession } from "@/lib/auth";

const LogoutContext = createContext<(() => void) | null>(null);

export function useLogoutRequest() {
  const request = useContext(LogoutContext);
  if (!request) {
    throw new Error("useLogoutRequest must be used within LogoutProvider");
  }
  return request;
}

export function LogoutProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const requestLogout = useCallback(() => {
    const session = getSession();
    setDisplayName(session?.displayName ?? t("common.user"));
    setConfirmOpen(true);
  }, [t]);

  const handleConfirm = useCallback(() => {
    setConfirmOpen(false);
    setTransitioning(true);
    startAuthAuroraLogout(displayName);
  }, [displayName]);

  return (
    <LogoutContext.Provider value={requestLogout}>
      {!transitioning ? children : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-[400px] gap-5">
          <AlertDialogHeader className="text-left">
            <div className="flex items-start gap-3.5">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-destructive/10 border border-destructive/15">
                <LogOut className="size-5 text-destructive" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 pt-0.5">
                <AlertDialogTitle className="text-[17px] tracking-tight">
                  {t("common.confirmLogout")}
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1.5 leading-relaxed">
                  {displayName && displayName !== t("common.user")
                    ? t("common.confirmLogoutWithName", {
                        name: formatShortName(displayName),
                      })
                    : t("common.confirmLogoutGeneric")}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="sm:flex-1">{t("common.stay")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="sm:flex-1"
              onClick={handleConfirm}
            >
              {t("common.logout")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LogoutContext.Provider>
  );
}
