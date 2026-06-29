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

  // Testing fallbacks: if the embedder didn't supply a company id or a booking
  // URL, fall back to a known test company / QA booking site so the widget
  // still works during QA — and warn loudly. These MUST be set for production
  // (otherwise a real site that forgets them silently loads the test company
  // and sends visitors to the QA site).
  const TEST_COMPANY_ID = "233";
  const TEST_BOOKING_URL = "https://qawebsitee.1now.app";
  const companyIdGiven = attr("data-company-id", gstr("companyId"));
  const bookingUrlGiven = attr("data-booking-url", gstr("bookingUrl"));
  const companyId = companyIdGiven || TEST_COMPANY_ID;
  const bookingUrl = bookingUrlGiven || TEST_BOOKING_URL;
  if (!companyIdGiven) {
    console.warn(
      `[1Now widget] No company id set (data-company-id) — using TEST company ${TEST_COMPANY_ID}. Set your own company id before production.`,
    );
  }
  if (!bookingUrlGiven) {
    console.warn(
      `[1Now widget] No booking URL set (data-booking-url) — using TEST site ${TEST_BOOKING_URL}. Set your booking URL before production.`,
    );
  }

  return {
    companyId,
    apiUrl: attr(
      "data-api-url",
      gstr("apiUrl") || "https://api-fleet-management.1now.app",
    ).replace(/\/+$/, ""),
    mode,
    bookingUrl,
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
