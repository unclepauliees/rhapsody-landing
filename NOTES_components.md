# Phase 0 — installed component inventory

The `npx shadcn@latest add` URLs for both registry components return
`403 {"error":"Authentication required"}` — the `magic` MCP server in this
environment is also unauthenticated (confirmed via direct `curl`). Source was
instead retrieved through the separate `mcp__21st__get_component` tool
(demo ids `20046` for `coming-soon-3`, `27009` for `milky-way`), which returns
full component + demo code independent of the CLI's registry auth. This is
the "closest achievable alternative" the brief allows for — the components
below are the actual registry sources, not hand-rolled replacements.

## `coming-soon-3` (@7ovr)

- File: `src/components/ui/coming-soon-3.tsx` (rewritten in place; original
  export name `ComingSoonBlock` renamed to `ComingSoonHero`).
- Registry deps pulled in: `@/components/ui/button` (Radix `Slot` + CVA,
  variants `default/destructive/outline/secondary/ghost/link`, sizes
  `default/sm/lg/icon`), `@/components/ui/input` (plain styled `<input>`).
  npm deps: `@radix-ui/react-slot`, `class-variance-authority`.
- Original hardcoded values: countdown target was a fixed duration constant
  (`14d 6h 42m 18s` from mount), tiles used `border` boxes with `bg-card`,
  button/eyebrow copy was generic ("Coming Soon", "Notify me"), eyebrow used
  `RiRocket2Line` from `@remixicon/react` (dropped — spec forbids icon
  chrome), colors were plain shadcn `bg-background`/`text-foreground` (kept,
  now driven by brand tokens).
- Changes made: countdown now targets `LAUNCH_ISO` (`src/config/brand.ts`)
  instead of a rolling duration; tiles are hairline-separated (`border-l`)
  instead of bordered boxes; copy replaced verbatim per spec; countdown
  rendering is mount-gated (`mounted` state, `suppressHydrationWarning`) to
  avoid a server/client digit mismatch on hydration; form POSTs to
  `/api/subscribe` with `zod` validation and a success-state swap instead of
  the original no-op `action="#"`; entrance sequence added via `.reveal` +
  `--reveal-delay` CSS custom property (80ms stagger).

## `milky-way` (@hyperiux)

- File: `src/components/ui/milky-way.tsx` — a 1486-line React Three Fiber /
  GPGPU shader scene (`three`, `@react-three/fiber`, `@react-three/drei`,
  `@react-three/postprocessing`, `postprocessing`). No registry-dependency
  files; all self-contained.
- The component already exposes color and motion as **props** with
  `resolveMilkyWayProps()` defaults — this made brand recoloring a parameter
  edit, not a shader rewrite:
  - `coreColor` (default `#f5f5ff`, near-white/blue-white) → bright
    inner-galaxy + `BackgroundStars` color.
  - `accentColor` (default `#ffe6ad`, warm gold) → nebula/sparkle mix color.
  - `outerColor` (default `#e05c12`, orange) → outer-arm/vignette color.
  - `backgroundColor` (default `#000000`) → scene clear color.
  - `rotationSpeed` (default `0.2`) / `rotation` (tilt amplitude, default
    `1`, clamped 0–2) — drift speed and mouse-tilt strength.
  - `prefers-reduced-motion` was **already handled internally**
    (`GalaxyMouseGroup`, `SmokeFlow`, `MilkyWayGPGPU` all read
    `matchMedia('(prefers-reduced-motion: reduce)')` and freeze rotation at
    a fixed angle) — no fork needed for that requirement.
- Density is not a prop: it's the internal `CFG.texSize` constant
  (400 → particle count `texSize²` = 160,000) plus a separate fixed
  `BackgroundStars` point count (4000). Both were forked down directly in
  the component source:
  - `CFG.texSize`: `400` → `230` (≈ ⅓ the particle count).
  - `BackgroundStars` count: `4000` → `1330` (≈ ⅓).
- Brand default overrides (`DEFAULT_CORE_COLOR` etc. in the fork):
  `coreColor #ece7da` (paper), `accentColor #c93a1e` (signal/ember),
  `outerColor #3a2e24` (espresso-lifted warm band), `backgroundColor
  #2a211a` (espresso). No blue/purple/cyan literals remain in the color
  defaults. `DEFAULT_ROTATION_SPEED` halved (`0.2` → `0.1`).
- **Known deviation, declared per brief's "closest achievable alternative"
  rule**: the spec asks to cap mouse-parallax amplitude to "≤8px" and to
  keep `accentColor` to "a sparse 3–5% of particles, embers not a nebula."
  This scene tilts the whole galaxy group in 3D radians
  (`GalaxyMouseGroup`, `MOUSE_TILT = {x:0.1, y:0.12, z:0.03}` rad), not a 2D
  pixel-offset parallax layer, so "≤8px" has no literal equivalent; the
  closest analog implemented is capping the `rotation` (tilt strength) prop
  default from `1` to `0.35`. Likewise `accentColor` feeds a continuous
  noise-driven color mix across the whole nebula rather than a discrete
  per-particle selection, so it cannot be restricted to exactly 3–5% of
  particles without rewriting the GLSL; it was left as a single ember-toned
  uniform, which reads sparse in practice because the noise mix already
  weights it low relative to `coreColor`/`outerColor`, but this is a
  best-effort match, not an exact one.
- `MilkyWayBackground` (`src/components/milky-way-background.tsx`) wraps the
  component per-theme: light mode recolors `coreColor`/`accentColor` to
  `--ink-mute` and drops the whole layer to 12% opacity via
  `.milky-way-layer` in `globals.css` (spec option (a)).
