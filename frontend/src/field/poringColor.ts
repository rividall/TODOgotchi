export interface PoringColor {
  body: number;
  shade: number;
  ripeGlow: number;
}

// Pleasant pastel palette, deterministic per poring ID.
// Each entry: { body, shade (rim, ~2 shades darker), ripeGlow (soft halo color for ripe tier) }.
const PALETTE: PoringColor[] = [
  { body: 0xfda4af, shade: 0xe11d48, ripeGlow: 0xfde68a }, // rose
  { body: 0xfdba74, shade: 0xea580c, ripeGlow: 0xfed7aa }, // orange
  { body: 0xfcd34d, shade: 0xd97706, ripeGlow: 0xfef3c7 }, // amber
  { body: 0xa7f3d0, shade: 0x059669, ripeGlow: 0xd1fae5 }, // mint
  { body: 0x93c5fd, shade: 0x2563eb, ripeGlow: 0xdbeafe }, // sky
  { body: 0xc4b5fd, shade: 0x7c3aed, ripeGlow: 0xede9fe }, // violet
  { body: 0xf9a8d4, shade: 0xdb2777, ripeGlow: 0xfce7f3 }, // pink
  { body: 0x86efac, shade: 0x16a34a, ripeGlow: 0xdcfce7 }, // green
  { body: 0x67e8f9, shade: 0x0891b2, ripeGlow: 0xcffafe }, // cyan
  { body: 0xfecaca, shade: 0xdc2626, ripeGlow: 0xfee2e2 }, // coral
  { body: 0xddd6fe, shade: 0x6d28d9, ripeGlow: 0xf5f3ff }, // lavender
  { body: 0xbef264, shade: 0x65a30d, ripeGlow: 0xecfccb }, // lime
];

const COMPLETED: PoringColor = { body: 0xcbd5e1, shade: 0x64748b, ripeGlow: 0xe2e8f0 };

// Small deterministic hash so two adjacent IDs don't always land on adjacent palette slots.
function hash(n: number): number {
  let x = (n * 2654435761) >>> 0;
  x = ((x ^ (x >>> 16)) * 0x85ebca6b) >>> 0;
  x = ((x ^ (x >>> 13)) * 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

export function poringColor(id: number, completed: boolean): PoringColor {
  if (completed) return COMPLETED;
  return PALETTE[hash(id) % PALETTE.length];
}
