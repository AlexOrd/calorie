/** Compare two `MAJOR.MINOR.PATCH` strings. Returns -1 / 0 / +1. */
export function cmpVersion(a: string, b: string): number {
  const pa = a.split('.').map((s) => Number(s) || 0);
  const pb = b.split('.').map((s) => Number(s) || 0);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}
