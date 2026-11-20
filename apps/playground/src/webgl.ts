let cached: boolean | undefined;

/** three.js needs WebGL2. Headless browsers without a GPU (and some old devices) don't have it. */
export function hasWebGL2(): boolean {
  if (cached === undefined) {
    try {
      cached = !!document.createElement('canvas').getContext('webgl2');
    } catch {
      cached = false;
    }
  }
  return cached;
}
