import type { NextConfig } from "next";
import path from "node:path";

// Invitations use email, so both hosting targets can serve a static export.
const isGithubPagesExport = process.env.GITHUB_PAGES === "true";
const repoName = "rhapsody-landing";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
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
