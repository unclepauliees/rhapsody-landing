import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/config/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "#2A211A",
          padding: "80px",
          position: "relative",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={{ position: "absolute", inset: 0 }}
        >
          <circle
            cx="50"
            cy="130"
            r="90"
            fill="none"
            stroke="#C93A1E"
            strokeWidth={0.6}
          />
        </svg>
        <div
          style={{
            color: "#ECE7DA",
            fontSize: 96,
            display: "flex",
          }}
        >
          {BRAND_NAME}
        </div>
      </div>
    ),
    { ...size },
  );
}
