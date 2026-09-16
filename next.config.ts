import type { NextConfig } from "next";
import path from "node:path";

// GitHub Pages is static-only — no Node server, so /api/subscribe can't run
// there. The Pages workflow (.github/workflows/deploy-pages.yml) strips
// src/app/api before this build and sets GITHUB_PAGES=true so the export
// works; the real deploy target (Vercel or any Node host) never sets this
// and keeps the API route.
const isGithubPagesExport = process.env.GITHUB_PAGES === "true";
const repoName = "rhapsody-landing";

const nextConfig: NextConfig = {
  // A stray package-lock.json in $HOME makes Turbopack misdetect the
  // workspace root as the home directory instead of this project.
  turbopack: {
    root: path.join(__dirname),
  },
  // NEXT_PUBLIC_BASE_PATH is read by src/lib/base-path.ts to prefix the
  // manual /public asset references (<img>, plain <a> links) that Next
  // does not rewrite automatically the way it does for <Image>/<Link>.
  env: { NEXT_PUBLIC_BASE_PATH: isGithubPagesExport ? `/${repoName}` : "" },
  ...(isGithubPagesExport && {
    output: "export",
    basePath: `/${repoName}`,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
