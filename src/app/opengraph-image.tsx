import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Project Rhapsody | Coming Soon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default async function Image() {
  const emblem = await readFile(join(process.cwd(), "public/brand/emblem-glow.png"));
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#100d0b", color: "#ece7da", padding: 60 }}>
      {/* Use the supplied brand artwork in the static sharing image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${emblem.toString("base64")}`} alt="" width={320} height={192} />
      <div style={{ display: "flex", fontSize: 56, marginTop: 26 }}>Project Rhapsody | Coming Soon</div>
      <div style={{ display: "flex", fontSize: 26, color: "#b7afa3", marginTop: 30 }}>A studio above the weather.</div>
      <div style={{ display: "flex", fontSize: 21, color: "#b7afa3", marginTop: 16 }}>First light, 5 October 2026</div>
    </div>,
    size,
  );
}
