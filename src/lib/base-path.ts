// Manual /public references (<img src>, plain <a href>) aren't rewritten by
// Next's basePath handling the way <Image>/<Link> are, so prefix them here.
// Empty everywhere except the GitHub Pages export build.
export function withBasePath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
