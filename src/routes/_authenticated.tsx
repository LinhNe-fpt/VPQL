import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { consumeLoginLand } from "@/components/auth/login-transition-overlay";
import { LogoutProvider } from "@/components/auth/logout-flow";
import { AppSidebar } from "@/components/app-sidebar";
import { hasSession } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !hasSession()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const [landed] = useState(() => consumeLoginLand());

  return (
    <LogoutProvider>
      <div
        className={[
          "flex h-screen w-full overflow-hidden bg-background",
          landed && "login-land-in",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <Outlet />
        </div>
      </div>
    </LogoutProvider>
  );
}
