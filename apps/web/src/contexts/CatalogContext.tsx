"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { withCategoryIcon } from "@/lib/category-icons";
type Entry = { id: number; name: string; slug: string; icon?: string | null };
const CatalogContext = createContext<{
  categories: Entry[];
  cities: Entry[];
  error: boolean;
}>({ categories: [], cities: [], error: false });
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState({
    categories: [] as Entry[],
    cities: [] as Entry[],
    error: false,
  });
  useEffect(() => {
    const controller = new AbortController();
    const api =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
    Promise.all(
      ["categories", "cities"].map(async (route) => {
        const response = await fetch(`${api}/${route}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Catalog unavailable");
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error("Invalid catalog");
        return rows as Entry[];
      }),
    )
      .then(([categories, cities]) =>
        setCatalog({ categories: categories.map(withCategoryIcon), cities, error: false }),
      )
      .catch(() => {
        if (!controller.signal.aborted)
          setCatalog((previous) => ({ ...previous, error: true }));
      });
    return () => controller.abort();
  }, []);
  return (
    <CatalogContext.Provider value={catalog}>
      {children}
    </CatalogContext.Provider>
  );
}
export const useCatalog = () => useContext(CatalogContext);
