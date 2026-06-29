import type { BranchLocation, FleetVehicle, WidgetConfig, DateRange } from "./types";
import { createRangeCalendar } from "./calendar";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function fmtRange(r: DateRange): string {
  if (!r.start) return "Add dates";
  const s = `${MON[r.start.getMonth()]} ${r.start.getDate()}`;
  if (!r.end) return `${s} — …`;
  return `${s} – ${MON[r.end.getMonth()]} ${r.end.getDate()}`;
}
function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${ap}`;
}
function timeOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const v = `${pad(h)}:${pad(m)}`;
      out.push({ value: v, label: to12h(v) });
    }
  }
  return out;
}

interface State {
  sameDropoff: boolean;
  pickupId: string;
  dropoffId: string;
  range: DateRange;
  pickupTime: string;
  returnTime: string;
}

export function renderWidget(opts: {
  root: ShadowRoot;
  config: WidgetConfig;
  locations: BranchLocation[];
  /** Opens a URL (modal iframe or redirect, decided by the caller). */
  openUrl: (url: string) => void;
}): { root: HTMLElement; getQuery: () => Record<string, string> } {
  const { config: cfg, locations } = opts;
  const pickupLocs = locations.filter(
    (l) => l.location_type === "pick_up" || l.location_type === "both" || !l.location_type,
  );
  const dropoffLocs = locations.filter(
    (l) => l.location_type === "drop_off" || l.location_type === "both" || !l.location_type,
  );

  const state: State = {
    sameDropoff: true,
    pickupId: "",
    dropoffId: "",
    range: { start: null, end: null },
    pickupTime: "10:00",
    returnTime: "10:00",
  };

  const root = document.createElement("div");
  root.className = "onb-root";

  if (cfg.title) {
    const h = document.createElement("h3");
    h.className = "onb-title";
    h.textContent = cfg.title;
    root.appendChild(h);
  }

  // --- Same / different drop-off toggle ---
  const toggle = document.createElement("div");
  toggle.className = "onb-toggle";
  const sameBtn = document.createElement("button");
  sameBtn.type = "button";
  sameBtn.textContent = "Same drop off";
  const diffBtn = document.createElement("button");
  diffBtn.type = "button";
  diffBtn.textContent = "Different drop off";
  toggle.append(sameBtn, diffBtn);
  root.appendChild(toggle);

  // --- Bar ---
  const bar = document.createElement("div");
  bar.className = "onb-bar";
  root.appendChild(bar);

  // Location segment factory (label + native select)
  function locationSeg(label: string, list: BranchLocation[], onChange: (id: string, loc?: BranchLocation) => void): HTMLElement {
    const seg = document.createElement("label");
    seg.className = "onb-seg";
    const lab = document.createElement("span");
    lab.className = "onb-seg-label";
    lab.textContent = label;
    const sel = document.createElement("select");
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Where are you going?";
    sel.appendChild(opt0);
    list.forEach((l) => {
      const o = document.createElement("option");
      o.value = String(l.id);
      o.textContent = l.name || l.address || `Location ${l.id}`;
      sel.appendChild(o);
    });
    sel.onchange = () => {
      const loc = list.find((l) => String(l.id) === sel.value);
      onChange(sel.value, loc);
    };
    seg.append(lab, sel);
    return seg;
  }

  const pickupSeg = locationSeg("Pick-up location", pickupLocs, (id) => {
    state.pickupId = id;
  });
  const dropoffSeg = locationSeg("Drop-off location", dropoffLocs, (id) => {
    state.dropoffId = id;
  });

  // Generic "field" segment that opens a popover (dates / time)
  function fieldSeg(label: string, initialValue: string): { seg: HTMLElement; value: HTMLElement; pop: HTMLElement } {
    const seg = document.createElement("button");
    seg.type = "button";
    seg.className = "onb-seg";
    const lab = document.createElement("span");
    lab.className = "onb-seg-label";
    lab.textContent = label;
    const value = document.createElement("span");
    value.className = "onb-seg-value placeholder";
    value.textContent = initialValue;
    const pop = document.createElement("div");
    pop.className = "onb-pop";
    pop.hidden = true;
    seg.append(lab, value, pop);
    return { seg, value, pop };
  }

  // Dates segment + calendar
  const dateField = fieldSeg("Pickup & drop-off date", "Add dates");
  const cal = createRangeCalendar({
    initial: state.range,
    months: 2,
    onChange: (r) => {
      state.range = r;
      dateField.value.textContent = fmtRange(r);
      dateField.value.classList.toggle("placeholder", !r.start);
      if (r.start && r.end) closePops();
    },
  });
  dateField.pop.appendChild(cal.el);

  // Time segment + popover
  const timeField = fieldSeg("Pick-up – drop-off", "10:00 AM – 10:00 PM");
  state.returnTime = "10:00";
  function buildTimePop(): void {
    const wrap = document.createElement("div");
    wrap.className = "onb-time";
    const mk = (labelText: string, val: string, set: (v: string) => void) => {
      const box = document.createElement("div");
      const lb = document.createElement("label");
      lb.textContent = labelText;
      const sel = document.createElement("select");
      timeOptions().forEach((o) => {
        const op = document.createElement("option");
        op.value = o.value;
        op.textContent = o.label;
        if (o.value === val) op.selected = true;
        sel.appendChild(op);
      });
      sel.onchange = () => {
        set(sel.value);
        timeField.value.textContent = `${to12h(state.pickupTime)} – ${to12h(state.returnTime)}`;
        timeField.value.classList.remove("placeholder");
      };
      box.append(lb, sel);
      return box;
    };
    wrap.append(
      mk("Pick-up time", state.pickupTime, (v) => (state.pickupTime = v)),
      mk("Drop-off time", state.returnTime, (v) => (state.returnTime = v)),
    );
    const done = document.createElement("button");
    done.type = "button";
    done.className = "onb-pop-done";
    done.textContent = "Done";
    done.onclick = () => closePops();
    timeField.pop.append(wrap, done);
  }
  buildTimePop();
  timeField.value.textContent = `${to12h(state.pickupTime)} – ${to12h(state.returnTime)}`;
  timeField.value.classList.remove("placeholder");

  // Search button
  const search = document.createElement("button");
  search.type = "button";
  search.className = "onb-search";
  search.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><span>Search</span>';

  // Assemble bar
  bar.append(pickupSeg, dropoffSeg, dateField.seg, timeField.seg, search);

  const error = document.createElement("div");
  error.className = "onb-error";
  root.appendChild(error);

  const fleetBox = document.createElement("div");
  fleetBox.className = "onb-fleet";
  fleetBox.hidden = true;
  root.appendChild(fleetBox);

  const footer = document.createElement("div");
  footer.className = "onb-footer";
  footer.textContent = "Powered by 1Now";
  root.appendChild(footer);

  // --- Toggle behaviour ---
  function applyToggle(): void {
    sameBtn.setAttribute("aria-pressed", String(state.sameDropoff));
    diffBtn.setAttribute("aria-pressed", String(!state.sameDropoff));
    dropoffSeg.style.display = state.sameDropoff ? "none" : "";
  }
  sameBtn.onclick = () => {
    state.sameDropoff = true;
    applyToggle();
  };
  diffBtn.onclick = () => {
    state.sameDropoff = false;
    applyToggle();
  };
  applyToggle();

  // --- Popover open/close ---
  function closePops(): void {
    dateField.pop.hidden = true;
    timeField.pop.hidden = true;
  }
  function openPop(which: HTMLElement): void {
    const isOpen = !which.hidden;
    closePops();
    which.hidden = isOpen;
  }
  dateField.seg.addEventListener("click", (e) => {
    if (dateField.pop.contains(e.target as Node)) return;
    openPop(dateField.pop);
  });
  timeField.seg.addEventListener("click", (e) => {
    if (timeField.pop.contains(e.target as Node)) return;
    openPop(timeField.pop);
  });
  // Outside click closes (works through Shadow DOM via composedPath).
  document.addEventListener("click", (e) => {
    const path = e.composedPath();
    if (!path.includes(dateField.seg) && !path.includes(timeField.seg)) closePops();
  });

  // --- Submit ---
  search.onclick = () => {
    error.textContent = "";
    if (!cfg.companyId) {
      error.textContent = "Configuration error: missing Company ID.";
      return;
    }
    if (!state.pickupId) {
      error.textContent = "Please choose a pick-up location.";
      return;
    }
    if (!state.sameDropoff && !state.dropoffId) {
      error.textContent = "Please choose a drop-off location.";
      return;
    }
    if (!state.range.start || !state.range.end) {
      error.textContent = "Please choose pick-up and drop-off dates.";
      openPop(dateField.pop);
      return;
    }

    const pickupLoc = pickupLocs.find((l) => String(l.id) === state.pickupId);
    const dropLoc = state.sameDropoff
      ? pickupLoc
      : dropoffLocs.find((l) => String(l.id) === state.dropoffId);

    const data: Record<string, string> = {
      pickup_location_id: state.pickupId,
      dropoff_location_id: state.sameDropoff ? state.pickupId : state.dropoffId,
      pickup_location: pickupLoc?.name || pickupLoc?.address || "",
      dropoff_location: dropLoc?.name || dropLoc?.address || "",
      pickup_date: `${ymd(state.range.start)}T${state.pickupTime}`,
      return_date: `${ymd(state.range.end)}T${state.returnTime}`,
    };
    fireAnalytics(cfg, data);

    const base = cfg.bookingUrl.replace(/\/+$/, "");
    const path = cfg.bookingPath
      ? cfg.bookingPath.charAt(0) === "/"
        ? cfg.bookingPath
        : "/" + cfg.bookingPath
      : "";
    const qs = Object.keys(data)
      .filter((k) => data[k] !== "" && data[k] != null)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`)
      .join("&");
    const url = base + path + (qs ? "?" + qs : "");
    opts.openUrl(url);
  };

  // Current selection as URL params (loose — no validation). Lets the fleet
  // preview carry any chosen location/dates to a car's detail page on click.
  function getQuery(): Record<string, string> {
    // No company_id in the redirect — the booking app resolves the company from
    // its own domain. The widget still uses company_id for its own data calls.
    const p: Record<string, string> = {};
    if (state.pickupId) {
      p.pickup_location_id = state.pickupId;
      p.dropoff_location_id = state.sameDropoff ? state.pickupId : state.dropoffId;
    }
    if (state.range.start && state.range.end) {
      p.pickup_date = `${ymd(state.range.start)}T${state.pickupTime}`;
      p.return_date = `${ymd(state.range.end)}T${state.returnTime}`;
    }
    return p;
  }

  opts.root.appendChild(root);
  return { root, getQuery };
}

function fireAnalytics(cfg: WidgetConfig, data: Record<string, string>): void {
  try {
    const ph = (window as unknown as { posthog?: { capture?: (e: string, p: unknown) => void } }).posthog;
    ph?.capture?.("booking_widget_search", {
      company_id: cfg.companyId,
      pickup_location_id: data.pickup_location_id,
      dropoff_location_id: data.dropoff_location_id,
      pickup_date: data.pickup_date,
      return_date: data.return_date,
    });
  } catch {
    /* analytics must never block the booking */
  }
}

const BONZAH_ICON =
  '<svg viewBox="0 0 24 24" fill="#c01c84" aria-hidden="true"><path d="M12 2c.9 2.7 2.9 4.7 5.6 5.6-2.7.9-4.7 2.9-5.6 5.6-.9-2.7-2.9-4.7-5.6-5.6C9.1 6.7 11.1 4.7 12 2z"/></svg>';

/** Optional live fleet preview — the "Explore All Vehicles" grid (matches the
 *  engine): Bonzah badge, seats · color, price, with View more / View all. */
export function renderFleetPreview(
  container: HTMLElement,
  cfg: WidgetConfig,
  fleet: FleetVehicle[],
  getQuery?: () => Record<string, string>,
  openUrl?: (url: string) => void,
): void {
  if (!fleet.length) {
    container.hidden = true;
    return;
  }
  container.hidden = false;

  const img = (u?: string): string => {
    if (!u) return "";
    return /^https?:\/\//i.test(u) ? u : `${cfg.imageBase}/${u.replace(/^\/+/, "")}`;
  };
  const esc = (s: unknown) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
    );

  let visible = 8;

  const card = (c: FleetVehicle): string => {
    const price = c.avg_car_price_per_day ?? c.price;
    const name = c.name || [c.year, c.make, c.model].filter(Boolean).join(" ") || "Vehicle";
    const meta =
      (c.seats ? `${c.seats} seats ` : "") +
      (c.color ? `<b>${esc(c.color)}</b> color` : "");
    const thumb = img(c.thumbnail_photo_url);
    const badge = c.has_bonzah_insurance
      ? `<div class="onb-badge">${BONZAH_ICON}Bonzah available</div>`
      : "";
    return (
      `<div class="onb-car"><div class="onb-car-imgwrap">` +
      (thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy">` : `<div class="ph"></div>`) +
      badge +
      `</div><div class="onb-car-b"><div class="onb-car-n">${esc(name)}</div>` +
      `<div class="onb-car-m">${meta}</div>` +
      (price != null ? `<div class="onb-car-p">$${esc(price)} <span>/day</span></div>` : "") +
      `</div></div>`
    );
  };

  const nav = (url: string): void => {
    if (openUrl) openUrl(url);
    else if (cfg.openInNewTab) window.open(url, "_blank", "noopener");
    else window.location.href = url;
  };

  const goToEngine = (): void => {
    const base = cfg.bookingUrl.replace(/\/+$/, "");
    nav(`${base}/vehicles`);
  };

  // Clicking a card opens that car's detail page on the engine, carrying the
  // company + any location/dates already chosen in the bar.
  const goToCar = (carId: number): void => {
    const base = cfg.bookingUrl.replace(/\/+$/, "");
    const params = getQuery ? getQuery() : {};
    params.selectedCarId = String(carId);
    const qs = Object.keys(params)
      .filter((k) => params[k] !== "" && params[k] != null)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join("&");
    nav(`${base}/car-listing-detail?${qs}`);
  };

  const render = (): void => {
    const shown = fleet.slice(0, visible);
    const moreBtn =
      visible < fleet.length ? '<button type="button" data-act="more">View more</button>' : "";
    container.innerHTML =
      `<div class="onb-fleet-head"><div class="onb-fleet-h">Explore All Vehicles (${fleet.length})</div></div>` +
      `<div class="onb-fleet-grid">${shown.map(card).join("")}</div>` +
      `<div class="onb-fleet-actions">${moreBtn}<button type="button" data-act="all">View all</button></div>`;
    const more = container.querySelector('[data-act="more"]') as HTMLButtonElement | null;
    if (more) more.onclick = () => {
      visible += 8;
      render();
    };
    const all = container.querySelector('[data-act="all"]') as HTMLButtonElement | null;
    if (all) all.onclick = goToEngine;
    const carEls = container.querySelectorAll(".onb-car");
    carEls.forEach((el, i) => {
      const c = shown[i];
      if (c) (el as HTMLElement).onclick = () => goToCar(c.id);
    });
  };

  render();
}
