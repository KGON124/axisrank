// Custom hooks for app state access

import { useContext, useMemo } from "react";
import { AppContext } from "./context";
import type { Project, Item, SortConfig } from "../core/types";

/**
 * Access the full app state and dispatch.
 */
export function useAppState() {
  return useContext(AppContext);
}

/**
 * Get the current active project, or null.
 */
export function useCurrentProject(): Project | null {
  const { state } = useAppState();
  if (!state.currentProjectId) return null;
  return (
    state.projects.find((p) => p.id === state.currentProjectId) ?? null
  );
}

/**
 * Get sorted items for the current project.
 */
export function useSortedItems(
  items: Item[],
  sortConfig: SortConfig
): Item[] {
  return useMemo(() => {
    const sorted = [...items];
    const { key, direction } = sortConfig;
    const mult = direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      switch (key) {
        case "rank":
          return mult * ((a.rank ?? Infinity) - (b.rank ?? Infinity));
        case "xRank":
          return mult * ((a.xRank ?? Infinity) - (b.xRank ?? Infinity));
        case "yRank":
          return mult * ((a.yRank ?? Infinity) - (b.yRank ?? Infinity));
        case "x":
          return mult * ((a.x ?? -1) - (b.x ?? -1));
        case "y":
          return mult * ((a.y ?? -1) - (b.y ?? -1));
        case "name":
          return mult * a.name.localeCompare(b.name, "ja");
        case "createdAt":
          return mult * a.createdAt.localeCompare(b.createdAt);
        case "updatedAt":
          return mult * a.updatedAt.localeCompare(b.updatedAt);
        default:
          return 0;
      }
    });

    return sorted;
  }, [items, sortConfig]);
}
