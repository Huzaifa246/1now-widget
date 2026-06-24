import type { WidgetConfig } from "./types";

/**
 * Resolve config. Priority: data-* attributes on the <script> tag, then a
 * global `window.OneNowBookingConfig` object (handy for SPAs).
 */
export function resolveConfig(scriptEl: HTMLScriptElement | null): WidgetConfig {
  const g: Record<string, unknown> =
    (window as unknown as { OneNowBookingConfig?: Record<string, unknown> })
      .OneNowBookingConfig || {};

  const attr = (name: string, fallback = ""): string => {
    const v = scriptEl?.getAttribute(name);
    return v != null ? v : fallback;
  };
  const gstr = (k: string): string =>
    typeof g[k] === "string" ? (g[k] as string) : "";
  const gbool = (k: string): string => (g[k] === true ? "true" : "");

  const modeRaw = attr("data-mode", gstr("mode") || "page").toLowerCase();
  const mode: WidgetConfig["mode"] =
    modeRaw === "full" ? "full" : modeRaw === "modal" ? "modal" : "page";

  return {
    companyId: attr("data-company-id", gstr("companyId")),
    apiUrl: attr(
      "data-api-url",
      gstr("apiUrl") || "https://api-fleet-management.1now.app",
    ).replace(/\/+$/, ""),
    mode,
    bookingUrl: attr("data-booking-url", gstr("bookingUrl") || "https://book.1now.ai"),
    bookingPath: attr("data-booking-path", gstr("bookingPath") || "/available-car"),
    target: attr("data-target", gstr("target")),
    showFleet: attr("data-show-fleet", gbool("showFleet")) === "true",
    openInNewTab: attr("data-target-blank", gbool("openInNewTab")) === "true",
    title: attr("data-title", gstr("title")),
    imageBase: attr(
      "data-image-base",
      gstr("imageBase") || "https://fleet-management-images-upload-be.s3.amazonaws.com",
    ).replace(/\/+$/, ""),
  };
}
