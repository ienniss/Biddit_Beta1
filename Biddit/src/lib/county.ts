export const TRIANGLE_COUNTIES = ["Wake", "Durham", "Orange"] as const;
export type TriangleCounty = (typeof TRIANGLE_COUNTIES)[number];

export function isTriangleCounty(county: string) {
  return (TRIANGLE_COUNTIES as readonly string[]).includes(county);
}
