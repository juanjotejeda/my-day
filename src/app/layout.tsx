import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";

import { RegisterServiceWorker } from "@/components/register-service-worker";
import { currentTheme } from "@/lib/theme";

import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Day",
  description: "One calm plan for the day, around your energy.",
  applicationName: "My Day",
  appleWebApp: { capable: true, title: "My Day", statusBarStyle: "default" },
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
};

export async function generateViewport(): Promise<Viewport> {
  // The status bar matches the theme, so night mode is not framed in white.
  const theme = await currentTheme();
  return { themeColor: theme === "night" ? "#0F1A2E" : "#FFFFFF", viewportFit: "cover" };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await currentTheme();

  return (
    <html lang="en" data-theme={theme} className={`${roboto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
