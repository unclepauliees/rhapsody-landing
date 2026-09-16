"use client";

type Theme = "dark" | "light";

export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className="text-ink-on-ground rounded-[4px] border border-[var(--line)]/40 px-2.5 py-1 font-mono text-[0.72rem] tracking-[0.18em] uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      aria-label={`Switch to ${next} mode`}
    >
      {next === "dark" ? "Dark" : "Light"}
    </button>
  );
}
