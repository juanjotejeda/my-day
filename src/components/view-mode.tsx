"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type View = "simple" | "full";

const ViewMode = createContext<{ view: View; setView: (view: View) => void }>({
  view: "simple",
  setView: () => {},
});

/**
 * Which Today is on screen. The app always opens simple: the eye reveals the
 * rest for as long as the app is open, and opening it again starts quiet.
 */
export function ViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("simple");
  return <ViewMode.Provider value={{ view, setView }}>{children}</ViewMode.Provider>;
}

export function useViewMode() {
  return useContext(ViewMode);
}
