import type { BranchLocation, FleetVehicle, WidgetConfig } from "./types";

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

/** Tolerate a bare array or the {success,data} envelope. */
function toArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const p = payload as { data?: unknown; results?: unknown };
  if (p && Array.isArray(p.data)) return p.data as T[];
  if (p && Array.isArray(p.results)) return p.results as T[];
  return [];
}

export async function fetchLocations(cfg: WidgetConfig): Promise<BranchLocation[]> {
  const data = await getJson(
    `${cfg.apiUrl}/api/company/locations/?company_id=${encodeURIComponent(cfg.companyId)}`,
  );
  return toArray<BranchLocation>(data).filter(
    (l) => l && l.active !== false && !l.removed,
  );
}

export async function fetchFleet(cfg: WidgetConfig): Promise<FleetVehicle[]> {
  const data = await getJson(
    `${cfg.apiUrl}/api/fleet/?company_id=${encodeURIComponent(cfg.companyId)}`,
  );
  return toArray<FleetVehicle>(data).filter(
    (v) => v && v.active !== false && !v.removed,
  );
}

/** Company website theme (colors + font). Used to brand the widget to match
 *  the operator's site. Returns null on failure (widget falls back to defaults). */
export async function fetchTheme(
  cfg: WidgetConfig,
): Promise<Record<string, unknown> | null> {
  try {
    const data = (await getJson(
      `${cfg.apiUrl}/api/website/details/?company_id=${encodeURIComponent(cfg.companyId)}`,
    )) as Record<string, unknown>;
    if (data && typeof data === "object" && "success" in data && "data" in data) {
      return data.data as Record<string, unknown>;
    }
    return data;
  } catch {
    return null;
  }
}
