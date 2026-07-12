import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "StudyQuest AI — Level Up Your Learning",
  description: "A gamified student productivity platform. Track tasks, build habits, focus with Pomodoro, run code, and collaborate — all powered by AI.",
  keywords: ["study", "productivity", "gamification", "student", "pomodoro", "habits", "tasks", "AI"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7C3AED" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
