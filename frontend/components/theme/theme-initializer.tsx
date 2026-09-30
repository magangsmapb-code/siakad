"use client";

import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("siakad-theme");
    const useDark = savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", useDark);
  }, []);

  return null;
}