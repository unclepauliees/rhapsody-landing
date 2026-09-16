"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Emblem } from "@/components/emblem";
import { cn } from "@/lib/utils";
import { LAUNCH_ISO, RSVP_NOTIFY_EMAIL } from "@/config/brand";

type Theme = "dark" | "light";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getTimeLeft(targetMs: number): TimeLeft {
  const diff = Math.max(0, targetMs - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

const tiles = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hrs" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Sec" },
] as const;

function revealDelay(ms: number): CSSProperties {
  return { "--reveal-delay": `${ms}ms` } as CSSProperties;
}

export function ComingSoonHero({ theme }: { theme: Theme }) {
  const [target] = useState(() => new Date(LAUNCH_ISO).getTime());
  // null until the first client tick — the countdown has no valid SSR value
  // (it depends on Date.now()), so render stays at the "00" placeholder
  // until this fills in, avoiding a hydration mismatch.
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const tick = () => setTimeLeft(getTimeLeft(target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <section className="relative z-10 flex min-h-svh w-full flex-col items-center justify-center px-6 py-[clamp(4rem,12vh,10rem)] text-center sm:items-start sm:text-left">
      <div className="mx-auto w-full max-w-[720px] sm:mx-0">
        <div className="reveal mx-auto sm:mx-0" style={revealDelay(0)}>
          <Emblem theme={theme} className="h-16 w-auto" />
        </div>

        <h1
          className="reveal text-ink-on-ground mx-auto mt-4 text-[clamp(2.75rem,7vw,6.5rem)] leading-[1.05] font-normal sm:mx-0"
          style={{ maxWidth: "14ch", ...revealDelay(80) }}
        >
          The New Instrument
        </h1>

        <p
          className="reveal text-ink-on-ground mx-auto mt-6 text-[clamp(1.1rem,1.6vw,1.35rem)] italic sm:mx-0"
          style={{ maxWidth: "48ch", ...revealDelay(160) }}
        >
          A studio above the weather. First light, 5 October 2026.
        </p>

        <div
          className="reveal mt-10 flex items-stretch justify-center sm:justify-start"
          style={revealDelay(240)}
          suppressHydrationWarning
        >
          {tiles.map((tile, index) => (
            <div
              key={tile.key}
              className={cn(
                "flex flex-col items-center px-4 sm:px-5",
                index > 0 && "border-l border-[var(--line)]/40",
              )}
            >
              <span
                className="text-ink-on-ground font-mono text-3xl font-bold tabular-nums sm:text-4xl"
                suppressHydrationWarning
              >
                {timeLeft ? pad(timeLeft[tile.key]) : "00"}
              </span>
              <span className="text-mute-on-ground mt-1 font-mono text-[0.65rem] tracking-[0.12em] uppercase">
                {tile.label}
              </span>
            </div>
          ))}
        </div>

        <div className="reveal mt-10" style={revealDelay(320)}>
          <Button asChild className="min-h-11 gap-2">
            <a href={`mailto:${RSVP_NOTIFY_EMAIL}?subject=${encodeURIComponent("Project Rhapsody invitation request")}&body=${encodeURIComponent("Hello, I would like to request an invitation to Project Rhapsody.\n\nName:\nOrganization:\n")}`}>
              <Mail className="size-4" aria-hidden="true" />
              Request the invitation
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
