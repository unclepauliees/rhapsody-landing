import { withBasePath } from "@/lib/base-path";

type Theme = "dark" | "light";

// Actual Rhapsody brand emblem (from the Brand OS asset set) — glow on
// dark ground, crisp ink on paper, matching the arc's dark/light rule.
export function Emblem({
  theme,
  className,
}: {
  theme: Theme;
  className?: string;
}) {
  const src = withBasePath(
    theme === "dark" ? "/brand/emblem-halo-clear.svg" : "/brand/emblem.svg",
  );
  return <img src={src} alt="" aria-hidden="true" className={className} />;
}
