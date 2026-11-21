import { currentSettings } from "@/lib/session";

export type Theme = "day" | "night";

/** The theme this user chose, or day for anyone not signed in. */
export async function currentTheme(): Promise<Theme> {
  const settings = await currentSettings();
  return settings?.appearance.theme ?? "day";
}

export type View = "full" | "simple";

/** Full Today, or the simple one: the eye in the date line stores this. */
export async function currentView(): Promise<View> {
  const settings = await currentSettings();
  return settings?.appearance.view ?? "full";
}
