/** Per-tenant theming: derive a small palette from the company's website
 *  theme and apply it as CSS variables on the widget host. Keeps the embedded
 *  search bar on-brand with the operator's site. */

function hexToRgb(hex: string): string {
  const h = (hex || "").replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return "15, 61, 62";
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Readable foreground (near-white / near-black) for text ON the primary fill. */
function onPrimary(primaryHex: string): string {
  return contrast(primaryHex, "#FFFFFF") >= contrast(primaryHex, "#111827")
    ? "#FFFFFF"
    : "#111827";
}

export interface WidgetTheme {
  primary: string;
  onPrimary: string;
  text: string;
  font: string;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function buildTheme(details: Record<string, unknown> | null): WidgetTheme {
  const d = details || {};
  // Prefer the brand primary; fall back to button color, then 1Now orange.
  const primary =
    str(d.primary_color) || str(d.button_color) || "#FE7743";
  const text = str(d.text_color) || "#1F2937";
  const font = str(d.font_family) || "Urbanist";
  return { primary, onPrimary: onPrimary(primary), text, font };
}

/** Apply the theme as CSS vars on the host element (read by the shadow CSS). */
export function applyTheme(host: HTMLElement, t: WidgetTheme): void {
  host.style.setProperty("--onb-primary", hexToRgb(t.primary));
  host.style.setProperty("--onb-on-primary", hexToRgb(t.onPrimary));
  host.style.setProperty("--onb-text", hexToRgb(t.text));
  host.style.setProperty("--onb-font", `'${t.font}', system-ui, -apple-system, sans-serif`);
}

/** Load a Google font for the tenant (Urbanist is loaded by default in CSS). */
export function ensureFont(fontFamily: string): void {
  const name = (fontFamily || "Urbanist").trim();
  const id = "onb-font-" + name.replace(/\s+/g, "-").toLowerCase();
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${name.replace(
    /\s+/g,
    "+",
  )}:wght@400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}
