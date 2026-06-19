import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
  applyLoginTheme,
  getStoredLoginThemeId,
  LOGIN_THEME_CHANGE_EVENT,
  LOGIN_THEMES,
  setStoredLoginThemeId,
  type LoginThemeId,
} from "./login-theme";

function subscribeLoginTheme(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(LOGIN_THEME_CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(LOGIN_THEME_CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useLoginTheme() {
  const themeId = useSyncExternalStore(
    subscribeLoginTheme,
    getStoredLoginThemeId,
    () => "frost" satisfies LoginThemeId,
  );

  useEffect(() => {
    applyLoginTheme(themeId);
  }, [themeId]);

  const setThemeId = useCallback((id: LoginThemeId) => {
    setStoredLoginThemeId(id);
    applyLoginTheme(id);
  }, []);

  return {
    themeId,
    setThemeId,
    palette: LOGIN_THEMES[themeId],
  };
}
