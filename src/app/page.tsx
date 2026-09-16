"use client";

import { useState } from "react";

import { MilkyWayBackground } from "@/components/milky-way-background";
import { FirstLightArc } from "@/components/first-light-arc";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { ComingSoonHero } from "@/components/ui/coming-soon-3";
import { BRAND_NAME, PRESS_EMAIL } from "@/config/brand";
import { withBasePath } from "@/lib/base-path";

type Theme = "dark" | "light";

export default function Home() {
  const [theme, setTheme] = useState<Theme>("dark");

  return (
    <main
      data-theme={theme}
      className="bg-background text-foreground relative flex min-h-svh flex-1 flex-col"
    >
      <MilkyWayBackground theme={theme} />
      <FirstLightArc />

      <header className="relative z-10 flex items-center justify-between px-6 pt-8 sm:px-10">
        <Logo theme={theme} />
        <ThemeToggle theme={theme} onChange={setTheme} />
      </header>

      <ComingSoonHero theme={theme} />

      <footer className="text-mute-on-ground relative z-10 flex flex-col items-center gap-1 px-6 pb-8 text-center font-mono text-[0.72rem] tracking-[0.1em] uppercase sm:items-start sm:text-left">
        <p>
          © 2026 {BRAND_NAME} · <a href={withBasePath("/privacy")}>Privacy</a> ·{" "}
          <a href={`mailto:${PRESS_EMAIL}`}>Press</a>
        </p>
      </footer>
    </main>
  );
}
