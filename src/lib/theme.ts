"use client";
import { useEffect, useState } from "react";
export type ThemeMode = "system" | "light" | "dark";
export type Theme = "light" | "dark";
const KEY = "wtp-theme";
/** Runs inline in <head> before paint, so there is no flash of the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var k="${KEY}",m=localStorage.getItem(k)||"system",q=matchMedia("(prefers-color-scheme: dark)");function a(){var mm=localStorage.getItem(k)||"system";var t=mm==="system"?(q.matches?"dark":"light"):mm;document.documentElement.dataset.theme=t;document.documentElement.dataset.themeMode=mm;}a();q.addEventListener("change",a);window.__wtpApplyTheme=a;}catch(e){}})();`;
export const currentTheme = (): Theme => (typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light");
export function getMode(): ThemeMode { try { return (localStorage.getItem(KEY) as ThemeMode) || "system"; } catch { return "system"; } }
export function setMode(m: ThemeMode) {
  try { if (m === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, m); } catch {}
  (window as unknown as { __wtpApplyTheme?: () => void }).__wtpApplyTheme?.();
  window.dispatchEvent(new Event("wtp-theme"));
}
/** Resolved theme, live: follows the toggle and, in system mode, the OS setting. */
export function useTheme(): Theme {
  const [t, setT] = useState<Theme>("light");
  useEffect(() => {
    const upd = () => setT(currentTheme());
    upd();
    const mo = new MutationObserver(upd);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return t;
}
