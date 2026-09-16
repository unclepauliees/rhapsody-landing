import { Emblem } from "@/components/emblem";

type Theme = "dark" | "light";

export function Logo({ theme }: { theme: Theme }) {
  return (
    <div className="flex items-center gap-3">
      <Emblem theme={theme} className="h-8 w-auto shrink-0" />
      <div className="leading-none">
        <div className="text-mute-on-ground font-mono text-[0.55rem] tracking-[0.3em] uppercase">
          Project
        </div>
        <div className="text-ink-on-ground text-lg tracking-wide uppercase">
          Rhapsody
        </div>
      </div>
    </div>
  );
}
