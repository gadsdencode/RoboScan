/** True only when the build-time prerender script adds ?prerender=1 to the URL. */
export function isPrerenderSnapshot(): boolean {
  return new URLSearchParams(window.location.search).has("prerender");
}
