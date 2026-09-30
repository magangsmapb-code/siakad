"use client";

import { useSyncExternalStore } from "react";

function readTheme() {
  const savedTheme = window.localStorage.getItem("siakad-theme");
  return savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribeTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("siakad-theme-change", onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("siakad-theme-change", onChange);
    media.removeEventListener("change", onChange);
  };
}

export function useTheme() {
  const dark = useSyncExternalStore(subscribeTheme, readTheme, () => false);

  function toggleTheme() {
    const nextDark = !readTheme();
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("siakad-theme", nextDark ? "dark" : "light");
    window.dispatchEvent(new Event("siakad-theme-change"));
  }

  return { dark, toggleTheme };
}