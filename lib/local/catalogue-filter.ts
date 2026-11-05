"use client";
import { useEffect, useState } from "react";

export function useCatalogueFilter(key: string, fallback: string) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    const read = () => setValue(new URLSearchParams(location.search).get(key) ?? fallback);
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [key, fallback]);
  return [value, (next: string) => {
    const url = new URL(location.href);
    if (next === fallback) url.searchParams.delete(key);
    else url.searchParams.set(key, next);
    history.replaceState(history.state, "", url);
    setValue(next);
  }] as const;
}
