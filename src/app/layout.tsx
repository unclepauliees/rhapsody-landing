import type { Metadata } from "next";
import { Bodoni_Moda, Space_Mono } from "next/font/google";
import { DOMAIN } from "@/config/brand";
import "./globals.css";

const bodoniModa = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  fallback: ["Courier New", "monospace"],
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://${DOMAIN}`),
  title: "Rhapsody — First light, 5 October 2026",
  description: "A studio above the weather. Request the invitation.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Rhapsody — First light, 5 October 2026",
    description: "A studio above the weather. Request the invitation.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bodoniModa.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
      {/* Plausible stub — uncomment when SUBSCRIBE_PROVIDER analytics are wired up.
      <script defer data-domain={DOMAIN} src="https://plausible.io/js/script.js" /> */}
    </html>
  );
}
