/* 1Now Booking Engine widget — https://1now.ai — embed on any site. */
"use strict";
(() => {
  // src/config.ts
  function resolveConfig(scriptEl) {
    const g = window.OneNowBookingConfig || {};
    const attr = (name, fallback = "") => {
      const v = scriptEl == null ? void 0 : scriptEl.getAttribute(name);
      return v != null ? v : fallback;
    };
    const gstr = (k) => typeof g[k] === "string" ? g[k] : "";
    const gbool = (k) => g[k] === true ? "true" : "";
    const modeRaw = attr("data-mode", gstr("mode") || "page").toLowerCase();
    const mode = modeRaw === "full" ? "full" : modeRaw === "modal" ? "modal" : "page";
    const TEST_COMPANY_ID = "233";
    const TEST_BOOKING_URL = "https://qawebsitee.1now.app";
    const companyIdGiven = attr("data-company-id", gstr("companyId"));
    const bookingUrlGiven = attr("data-booking-url", gstr("bookingUrl"));
    const companyId = companyIdGiven || TEST_COMPANY_ID;
    const bookingUrl = bookingUrlGiven || TEST_BOOKING_URL;
    if (!companyIdGiven) {
      console.warn(
        `[1Now widget] No company id set (data-company-id) \u2014 using TEST company ${TEST_COMPANY_ID}. Set your own company id before production.`
      );
    }
    if (!bookingUrlGiven) {
      console.warn(
        `[1Now widget] No booking URL set (data-booking-url) \u2014 using TEST site ${TEST_BOOKING_URL}. Set your booking URL before production.`
      );
    }
    return {
      companyId,
      apiUrl: attr(
        "data-api-url",
        gstr("apiUrl") || "https://api-fleet-management.1now.app"
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
        gstr("imageBase") || "https://fleet-management-images-upload-be.s3.amazonaws.com"
      ).replace(/\/+$/, "")
    };
  }

  // src/api.ts
  async function getJson(url) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }
  function toArray(payload) {
    if (Array.isArray(payload)) return payload;
    const p = payload;
    if (p && Array.isArray(p.data)) return p.data;
    if (p && Array.isArray(p.results)) return p.results;
    return [];
  }
  async function fetchLocations(cfg) {
    const data = await getJson(
      `${cfg.apiUrl}/api/company/locations/?company_id=${encodeURIComponent(cfg.companyId)}`
    );
    return toArray(data).filter(
      (l) => l && l.active !== false && !l.removed
    );
  }
  async function fetchFleet(cfg) {
    const data = await getJson(
      `${cfg.apiUrl}/api/fleet/?company_id=${encodeURIComponent(cfg.companyId)}`
    );
    return toArray(data).filter(
      (v) => v && v.active !== false && !v.removed
    );
  }
  async function fetchTheme(cfg) {
    try {
      const data = await getJson(
        `${cfg.apiUrl}/api/website/details/?company_id=${encodeURIComponent(cfg.companyId)}`
      );
      if (data && typeof data === "object" && "success" in data && "data" in data) {
        return data.data;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  // src/theme.ts
  function hexToRgb(hex) {
    const h = (hex || "").replace("#", "").trim();
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const n = parseInt(full, 16);
    if (Number.isNaN(n)) return "15, 61, 62";
    return `${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}`;
  }
  function channel(c) {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }
  function luminance(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return 0.2126 * channel(n >> 16 & 255) + 0.7152 * channel(n >> 8 & 255) + 0.0722 * channel(n & 255);
  }
  function contrast(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function onPrimary(primaryHex) {
    return contrast(primaryHex, "#FFFFFF") >= contrast(primaryHex, "#111827") ? "#FFFFFF" : "#111827";
  }
  var str = (v) => typeof v === "string" ? v.trim() : "";
  function buildTheme(details) {
    const d = details || {};
    const primary = str(d.primary_color) || str(d.button_color) || "#FE7743";
    const text = str(d.text_color) || "#1F2937";
    const font = str(d.font_family) || "Urbanist";
    return { primary, onPrimary: onPrimary(primary), text, font };
  }
  function applyTheme(host, t) {
    host.style.setProperty("--onb-primary", hexToRgb(t.primary));
    host.style.setProperty("--onb-on-primary", hexToRgb(t.onPrimary));
    host.style.setProperty("--onb-text", hexToRgb(t.text));
    host.style.setProperty("--onb-font", `'${t.font}', system-ui, -apple-system, sans-serif`);
  }
  function ensureFont(fontFamily) {
    const name = (fontFamily || "Urbanist").trim();
    const id = "onb-font-" + name.replace(/\s+/g, "-").toLowerCase();
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${name.replace(
      /\s+/g,
      "+"
    )}:wght@400;500;600;700;800&display=swap`;
    document.head.appendChild(link);
  }

  // src/calendar.ts
  var DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  var MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  function addMonths(d, n) {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
  }
  function sameDay(a, b) {
    return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function createRangeCalendar(opts) {
    var _a;
    const months = (_a = opts.months) != null ? _a : 2;
    const today = startOfDay(/* @__PURE__ */ new Date());
    const range = {
      start: opts.initial.start ? startOfDay(opts.initial.start) : null,
      end: opts.initial.end ? startOfDay(opts.initial.end) : null
    };
    let view = startOfMonth(range.start || today);
    const root = document.createElement("div");
    root.className = "onb-cals";
    function pick(day) {
      var _a2;
      if (!range.start || range.start && range.end) {
        range.start = day;
        range.end = null;
      } else if (day.getTime() < range.start.getTime()) {
        range.start = day;
      } else {
        range.end = day;
      }
      (_a2 = opts.onChange) == null ? void 0 : _a2.call(opts, { ...range });
      render();
    }
    function monthEl(base) {
      const wrap = document.createElement("div");
      wrap.className = "onb-cal";
      const head = document.createElement("div");
      head.className = "onb-cal-head";
      const prev = document.createElement("button");
      prev.className = "onb-nav";
      prev.type = "button";
      prev.setAttribute("aria-label", "Previous month");
      prev.textContent = "\u2039";
      prev.onclick = () => {
        view = addMonths(view, -1);
        render();
      };
      const title = document.createElement("div");
      title.className = "onb-cal-title";
      title.textContent = `${MONTHS[base.getMonth()]} ${base.getFullYear()}`;
      const next = document.createElement("button");
      next.className = "onb-nav";
      next.type = "button";
      next.setAttribute("aria-label", "Next month");
      next.textContent = "\u203A";
      next.onclick = () => {
        view = addMonths(view, 1);
        render();
      };
      head.append(prev, title, next);
      const grid = document.createElement("div");
      grid.className = "onb-grid";
      DOW.forEach((d) => {
        const c = document.createElement("div");
        c.className = "onb-dow";
        c.textContent = d;
        grid.appendChild(c);
      });
      const firstDow = new Date(base.getFullYear(), base.getMonth(), 1).getDay();
      const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      for (let i = 0; i < firstDow; i++) {
        const b = document.createElement("div");
        b.className = "onb-day blank";
        grid.appendChild(b);
      }
      for (let dnum = 1; dnum <= daysInMonth; dnum++) {
        const day = new Date(base.getFullYear(), base.getMonth(), dnum);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "onb-day";
        btn.textContent = String(dnum);
        const past = day.getTime() < today.getTime();
        if (past) {
          btn.disabled = true;
        } else {
          btn.onclick = () => pick(day);
        }
        const isStart = sameDay(day, range.start);
        const isEnd = sameDay(day, range.end);
        const inRange = range.start && range.end && day.getTime() > range.start.getTime() && day.getTime() < range.end.getTime();
        if (inRange) btn.classList.add("in-range");
        if (isStart || isEnd) {
          btn.classList.add("cap");
          if (range.start && range.end && !sameDay(range.start, range.end)) {
            btn.classList.add(isStart ? "start" : "end");
          } else {
            btn.classList.add("only");
          }
        }
        grid.appendChild(btn);
      }
      wrap.append(head, grid);
      return wrap;
    }
    function render() {
      root.innerHTML = "";
      for (let m = 0; m < months; m++) {
        root.appendChild(monthEl(addMonths(view, m)));
      }
    }
    render();
    return { el: root, getRange: () => ({ ...range }) };
  }

  // src/ui.ts
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var pad = (n) => String(n).padStart(2, "0");
  var ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function fmtRange(r) {
    if (!r.start) return "Add dates";
    const s = `${MON[r.start.getMonth()]} ${r.start.getDate()}`;
    if (!r.end) return `${s} \u2014 \u2026`;
    return `${s} \u2013 ${MON[r.end.getMonth()]} ${r.end.getDate()}`;
  }
  function to12h(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const ap = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${pad(m)} ${ap}`;
  }
  function timeOptions() {
    const out = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 30]) {
        const v = `${pad(h)}:${pad(m)}`;
        out.push({ value: v, label: to12h(v) });
      }
    }
    return out;
  }
  function renderWidget(opts) {
    const { config: cfg, locations } = opts;
    const pickupLocs = locations.filter(
      (l) => l.location_type === "pick_up" || l.location_type === "both" || !l.location_type
    );
    const dropoffLocs = locations.filter(
      (l) => l.location_type === "drop_off" || l.location_type === "both" || !l.location_type
    );
    const state = {
      sameDropoff: true,
      pickupId: "",
      dropoffId: "",
      range: { start: null, end: null },
      pickupTime: "10:00",
      returnTime: "10:00"
    };
    const root = document.createElement("div");
    root.className = "onb-root";
    if (cfg.title) {
      const h = document.createElement("h3");
      h.className = "onb-title";
      h.textContent = cfg.title;
      root.appendChild(h);
    }
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
    const bar = document.createElement("div");
    bar.className = "onb-bar";
    root.appendChild(bar);
    function locationSeg(label, list, onChange) {
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
    function fieldSeg(label, initialValue) {
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
    const dateField = fieldSeg("Pickup & drop-off date", "Add dates");
    const cal = createRangeCalendar({
      initial: state.range,
      months: 2,
      onChange: (r) => {
        state.range = r;
        dateField.value.textContent = fmtRange(r);
        dateField.value.classList.toggle("placeholder", !r.start);
        if (r.start && r.end) closePops();
      }
    });
    dateField.pop.appendChild(cal.el);
    const timeField = fieldSeg("Pick-up \u2013 drop-off", "10:00 AM \u2013 10:00 PM");
    state.returnTime = "10:00";
    function buildTimePop() {
      const wrap = document.createElement("div");
      wrap.className = "onb-time";
      const mk = (labelText, val, set) => {
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
          timeField.value.textContent = `${to12h(state.pickupTime)} \u2013 ${to12h(state.returnTime)}`;
          timeField.value.classList.remove("placeholder");
        };
        box.append(lb, sel);
        return box;
      };
      wrap.append(
        mk("Pick-up time", state.pickupTime, (v) => state.pickupTime = v),
        mk("Drop-off time", state.returnTime, (v) => state.returnTime = v)
      );
      const done = document.createElement("button");
      done.type = "button";
      done.className = "onb-pop-done";
      done.textContent = "Done";
      done.onclick = () => closePops();
      timeField.pop.append(wrap, done);
    }
    buildTimePop();
    timeField.value.textContent = `${to12h(state.pickupTime)} \u2013 ${to12h(state.returnTime)}`;
    timeField.value.classList.remove("placeholder");
    const search = document.createElement("button");
    search.type = "button";
    search.className = "onb-search";
    search.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><span>Search</span>';
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
    function applyToggle() {
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
    function closePops() {
      dateField.pop.hidden = true;
      timeField.pop.hidden = true;
    }
    function openPop(which) {
      const isOpen = !which.hidden;
      closePops();
      which.hidden = isOpen;
    }
    dateField.seg.addEventListener("click", (e) => {
      if (dateField.pop.contains(e.target)) return;
      openPop(dateField.pop);
    });
    timeField.seg.addEventListener("click", (e) => {
      if (timeField.pop.contains(e.target)) return;
      openPop(timeField.pop);
    });
    document.addEventListener("click", (e) => {
      const path = e.composedPath();
      if (!path.includes(dateField.seg) && !path.includes(timeField.seg)) closePops();
    });
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
      const dropLoc = state.sameDropoff ? pickupLoc : dropoffLocs.find((l) => String(l.id) === state.dropoffId);
      const data = {
        pickup_location_id: state.pickupId,
        dropoff_location_id: state.sameDropoff ? state.pickupId : state.dropoffId,
        pickup_location: (pickupLoc == null ? void 0 : pickupLoc.name) || (pickupLoc == null ? void 0 : pickupLoc.address) || "",
        dropoff_location: (dropLoc == null ? void 0 : dropLoc.name) || (dropLoc == null ? void 0 : dropLoc.address) || "",
        pickup_date: `${ymd(state.range.start)}T${state.pickupTime}`,
        return_date: `${ymd(state.range.end)}T${state.returnTime}`
      };
      fireAnalytics(cfg, data);
      const base = cfg.bookingUrl.replace(/\/+$/, "");
      const path = cfg.bookingPath ? cfg.bookingPath.charAt(0) === "/" ? cfg.bookingPath : "/" + cfg.bookingPath : "";
      const qs = Object.keys(data).filter((k) => data[k] !== "" && data[k] != null).map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`).join("&");
      const url = base + path + (qs ? "?" + qs : "");
      opts.openUrl(url);
    };
    function getQuery() {
      const p = {};
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
  function fireAnalytics(cfg, data) {
    var _a;
    try {
      const ph = window.posthog;
      (_a = ph == null ? void 0 : ph.capture) == null ? void 0 : _a.call(ph, "booking_widget_search", {
        company_id: cfg.companyId,
        pickup_location_id: data.pickup_location_id,
        dropoff_location_id: data.dropoff_location_id,
        pickup_date: data.pickup_date,
        return_date: data.return_date
      });
    } catch (e) {
    }
  }
  var BONZAH_ICON = '<svg viewBox="0 0 24 24" fill="#c01c84" aria-hidden="true"><path d="M12 2c.9 2.7 2.9 4.7 5.6 5.6-2.7.9-4.7 2.9-5.6 5.6-.9-2.7-2.9-4.7-5.6-5.6C9.1 6.7 11.1 4.7 12 2z"/></svg>';
  function renderFleetPreview(container, cfg, fleet, getQuery, openUrl) {
    if (!fleet.length) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    const img = (u) => {
      if (!u) return "";
      return /^https?:\/\//i.test(u) ? u : `${cfg.imageBase}/${u.replace(/^\/+/, "")}`;
    };
    const esc = (s) => String(s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
    let visible = 8;
    const card = (c) => {
      var _a;
      const price = (_a = c.avg_car_price_per_day) != null ? _a : c.price;
      const name = c.name || [c.year, c.make, c.model].filter(Boolean).join(" ") || "Vehicle";
      const meta = (c.seats ? `${c.seats} seats ` : "") + (c.color ? `<b>${esc(c.color)}</b> color` : "");
      const thumb = img(c.thumbnail_photo_url);
      const badge = c.has_bonzah_insurance ? `<div class="onb-badge">${BONZAH_ICON}Bonzah available</div>` : "";
      return `<div class="onb-car"><div class="onb-car-imgwrap">` + (thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy">` : `<div class="ph"></div>`) + badge + `</div><div class="onb-car-b"><div class="onb-car-n">${esc(name)}</div><div class="onb-car-m">${meta}</div>` + (price != null ? `<div class="onb-car-p">$${esc(price)} <span>/day</span></div>` : "") + `</div></div>`;
    };
    const nav = (url) => {
      if (openUrl) openUrl(url);
      else if (cfg.openInNewTab) window.open(url, "_blank", "noopener");
      else window.location.href = url;
    };
    const goToEngine = () => {
      const base = cfg.bookingUrl.replace(/\/+$/, "");
      nav(`${base}/vehicles`);
    };
    const goToCar = (carId) => {
      const base = cfg.bookingUrl.replace(/\/+$/, "");
      const params = getQuery ? getQuery() : {};
      params.selectedCarId = String(carId);
      const qs = Object.keys(params).filter((k) => params[k] !== "" && params[k] != null).map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&");
      nav(`${base}/car-listing-detail?${qs}`);
    };
    const render = () => {
      const shown = fleet.slice(0, visible);
      const moreBtn = visible < fleet.length ? '<button type="button" data-act="more">View more</button>' : "";
      container.innerHTML = `<div class="onb-fleet-head"><div class="onb-fleet-h">Explore All Vehicles (${fleet.length})</div></div><div class="onb-fleet-grid">${shown.map(card).join("")}</div><div class="onb-fleet-actions">${moreBtn}<button type="button" data-act="all">View all</button></div>`;
      const more = container.querySelector('[data-act="more"]');
      if (more) more.onclick = () => {
        visible += 8;
        render();
      };
      const all = container.querySelector('[data-act="all"]');
      if (all) all.onclick = goToEngine;
      const carEls = container.querySelectorAll(".onb-car");
      carEls.forEach((el, i) => {
        const c = shown[i];
        if (c) el.onclick = () => goToCar(c.id);
      });
    };
    render();
  }

  // src/styles.ts
  var STYLES = `
:host { all: initial; display: block; --onb-primary: 15,61,62; --onb-on-primary: 255,255,255; --onb-text: 31,41,55; --onb-font: 'Urbanist', system-ui, -apple-system, sans-serif; }
*, *::before, *::after { box-sizing: border-box; }
.onb-root { font-family: var(--onb-font); color: rgb(var(--onb-text)); width: 100%; }
.onb-title { font-size: 18px; font-weight: 700; margin: 0 0 12px; }

.onb-toggle { display: inline-flex; gap: 4px; background: rgba(var(--onb-text), .07); border-radius: 999px; padding: 4px; margin-bottom: 12px; }
.onb-toggle button { border: 0; background: transparent; padding: 7px 16px; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; color: rgba(var(--onb-text), .7); transition: background .15s, color .15s; }
.onb-toggle button[aria-pressed="true"] { background: rgb(var(--onb-primary)); color: rgb(var(--onb-on-primary)); }

.onb-bar { display: flex; align-items: stretch; background: #fff; border: 1px solid rgba(var(--onb-text), .12); border-radius: 16px; box-shadow: 0 10px 34px rgba(0,0,0,.10); }
.onb-seg { position: relative; flex: 1 1 0; min-width: 0; padding: 14px 18px; display: flex; flex-direction: column; justify-content: center; gap: 3px; cursor: pointer; background: transparent; border: 0; text-align: left; font: inherit; color: inherit; border-radius: 16px; transition: background .15s; }
.onb-seg:hover { background: rgba(var(--onb-primary), .05); }
.onb-seg + .onb-seg { border-left: 1px solid rgba(var(--onb-text), .10); }
.onb-seg-label { font-size: 12px; font-weight: 500; color: rgba(var(--onb-text), .55); }
.onb-seg-value { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.onb-seg-value.placeholder { color: rgba(var(--onb-text), .42); font-weight: 500; }

.onb-seg select { appearance: none; -webkit-appearance: none; border: 0; background: transparent; font: inherit; font-size: 15px; font-weight: 600; color: rgb(var(--onb-text)); padding: 0; margin: 0; width: 100%; cursor: pointer; outline: none; }

.onb-search { flex: none; align-self: stretch; margin: 8px; border: 0; border-radius: 12px; background: rgb(var(--onb-primary)); color: rgb(var(--onb-on-primary)); padding: 0 24px; display: flex; align-items: center; justify-content: center; gap: 8px; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; transition: filter .15s; }
.onb-search:hover { filter: brightness(1.08); }
.onb-search:disabled { opacity: .5; cursor: not-allowed; }
.onb-search svg { width: 18px; height: 18px; }

.onb-error { color: #b42318; font-size: 13px; margin-top: 8px; min-height: 16px; }
.onb-footer { margin-top: 10px; font-size: 11px; color: rgba(var(--onb-text), .45); text-align: center; }

/* Popovers (calendar / time) */
.onb-pop { position: absolute; top: calc(100% + 10px); left: 0; z-index: 60; background: #fff; border: 1px solid rgba(var(--onb-text), .12); border-radius: 16px; box-shadow: 0 20px 48px rgba(0,0,0,.18); padding: 16px; }
.onb-pop[hidden] { display: none; }

/* Calendar */
.onb-cals { display: flex; gap: 22px; }
.onb-cal { width: 280px; }
.onb-cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.onb-cal-title { font-weight: 700; font-size: 14px; }
.onb-nav { border: 0; background: transparent; cursor: pointer; font-size: 16px; line-height: 1; padding: 6px 10px; border-radius: 8px; color: rgb(var(--onb-text)); }
.onb-nav:hover { background: rgba(var(--onb-text), .07); }
.onb-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.onb-dow { font-size: 11px; text-align: center; color: rgba(var(--onb-text), .5); padding: 4px 0; font-weight: 600; }
.onb-day { aspect-ratio: 1 / 1; border: 0; background: transparent; border-radius: 9px; font: inherit; font-size: 13px; cursor: pointer; color: rgb(var(--onb-text)); }
.onb-day:hover:not(:disabled) { background: rgba(var(--onb-primary), .14); }
.onb-day:disabled { color: rgba(var(--onb-text), .25); cursor: default; }
.onb-day.blank { visibility: hidden; }
.onb-day.in-range { background: rgba(var(--onb-primary), .14); border-radius: 0; }
.onb-day.cap { background: rgb(var(--onb-primary)); color: rgb(var(--onb-on-primary)); font-weight: 700; }
.onb-day.cap.start { border-radius: 9px 0 0 9px; }
.onb-day.cap.end { border-radius: 0 9px 9px 0; }
.onb-day.cap.only { border-radius: 9px; }

/* Time */
.onb-time { display: flex; gap: 16px; }
.onb-time > div { flex: 1; }
.onb-time label { font-size: 12px; font-weight: 600; color: rgba(var(--onb-text), .55); display: block; margin-bottom: 6px; }
.onb-time select { width: 100%; appearance: none; -webkit-appearance: none; border: 1px solid rgba(var(--onb-text), .15); border-radius: 10px; padding: 9px 12px; font: inherit; font-size: 14px; color: rgb(var(--onb-text)); background: #fff; cursor: pointer; }
.onb-pop-done { margin-top: 12px; width: 100%; border: 0; border-radius: 10px; background: rgb(var(--onb-primary)); color: rgb(var(--onb-on-primary)); padding: 10px; font: inherit; font-weight: 700; cursor: pointer; }

/* Fleet preview \u2014 "Explore All Vehicles" grid */
.onb-fleet { margin-top: 26px; }
.onb-fleet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.onb-fleet-h { font-size: 22px; font-weight: 800; color: rgb(var(--onb-text)); }
.onb-fleet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; }
.onb-car { background: #fff; border: 1px solid rgba(var(--onb-text), .10); border-radius: 16px; padding: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.06); cursor: pointer; transition: transform .15s, box-shadow .15s; }
.onb-car:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(0,0,0,.14); }
.onb-car-imgwrap { position: relative; }
.onb-car img, .onb-car .ph { width: 100%; height: 150px; object-fit: cover; border-radius: 12px; display: block; background: rgba(var(--onb-text), .06); }
.onb-badge { position: absolute; top: 10px; left: 10px; display: inline-flex; align-items: center; gap: 5px; background: #fff; border-radius: 999px; padding: 4px 10px 4px 8px; font-size: 11px; font-weight: 600; color: #c01c84; box-shadow: 0 2px 8px rgba(0,0,0,.16); }
.onb-badge svg { width: 13px; height: 13px; }
.onb-car-b { padding: 12px 10px 6px; }
.onb-car-n { font-size: 15px; font-weight: 700; color: rgb(var(--onb-text)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.onb-car-m { font-size: 13px; color: rgba(var(--onb-text), .5); margin-top: 4px; }
.onb-car-m b { color: rgba(var(--onb-text), .8); font-weight: 600; }
.onb-car-p { font-size: 16px; font-weight: 800; color: rgb(var(--onb-text)); margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(var(--onb-text), .08); }
.onb-car-p span { font-size: 11px; font-weight: 600; color: rgba(var(--onb-text), .5); }
.onb-fleet-actions { display: flex; gap: 12px; justify-content: center; margin-top: 22px; }
.onb-fleet-actions button { border: 0; border-radius: 10px; background: rgb(var(--onb-primary)); color: rgb(var(--onb-on-primary)); padding: 11px 24px; font: inherit; font-weight: 700; font-size: 14px; cursor: pointer; transition: filter .15s; }
.onb-fleet-actions button:hover { filter: brightness(1.08); }

/* Responsive \u2014 stack into a column on narrow containers */
@media (max-width: 860px) {
  .onb-bar { flex-direction: column; }
  .onb-seg + .onb-seg { border-left: 0; border-top: 1px solid rgba(var(--onb-text), .10); }
  .onb-search { margin: 12px; padding: 14px; }
  .onb-cals { flex-direction: column; gap: 14px; }
  .onb-cal { width: 100%; }
  .onb-pop { left: 0; right: 0; }
  .onb-fleet-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .onb-fleet-h { font-size: 19px; }
}
`;

  // src/widget.ts
  (function() {
    "use strict";
    const scriptEl = document.currentScript || (() => {
      const all = document.getElementsByTagName("script");
      return all[all.length - 1];
    })();
    const config = resolveConfig(scriptEl);
    function openModal(url) {
      const overlay = document.createElement("div");
      overlay.setAttribute(
        "style",
        "position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;"
      );
      const panel = document.createElement("div");
      panel.setAttribute(
        "style",
        "position:relative;width:100%;max-width:1120px;height:92vh;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.45);"
      );
      const closeBtn = document.createElement("button");
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.textContent = "\u2715";
      closeBtn.setAttribute(
        "style",
        "position:absolute;top:10px;right:12px;z-index:2;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 2px 10px rgba(0,0,0,.25);font-size:15px;line-height:1;cursor:pointer;"
      );
      const frame = document.createElement("iframe");
      frame.src = url;
      frame.title = "Book your vehicle";
      frame.setAttribute("style", "width:100%;height:100%;border:0;display:block;");
      frame.setAttribute("allow", "payment *; clipboard-write");
      const close = () => {
        overlay.remove();
        document.removeEventListener("keydown", onKey);
      };
      const onKey = (e) => {
        if (e.key === "Escape") close();
      };
      closeBtn.onclick = close;
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close();
      });
      document.addEventListener("keydown", onKey);
      panel.append(closeBtn, frame);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
    }
    function openUrl(url) {
      if (config.mode === "modal") {
        openModal(url);
      } else {
        if (config.openInNewTab) window.open(url, "_blank", "noopener");
        else window.location.href = url;
      }
    }
    function mount() {
      const host = document.createElement("div");
      host.className = "onb-host";
      const shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : null;
      const mountInto = shadow != null ? shadow : host;
      if (shadow) {
        const styleEl = document.createElement("style");
        styleEl.textContent = STYLES;
        shadow.appendChild(styleEl);
      } else if (!document.getElementById("onb-styles")) {
        const s = document.createElement("style");
        s.id = "onb-styles";
        s.textContent = STYLES.replace(/:host/g, ".onb-host");
        document.head.appendChild(s);
      }
      const targetEl = config.target ? document.getElementById(config.target) : null;
      if (targetEl) targetEl.appendChild(host);
      else if (scriptEl && scriptEl.parentNode)
        scriptEl.parentNode.insertBefore(host, scriptEl.nextSibling);
      else document.body.appendChild(host);
      if (config.mode === "full") {
        const base = config.bookingUrl.replace(/\/+$/, "");
        const frame = document.createElement("iframe");
        frame.src = `${base}/?company_id=${encodeURIComponent(config.companyId)}`;
        frame.title = "Book your vehicle";
        frame.setAttribute(
          "style",
          "width:100%;height:90vh;min-height:560px;border:0;border-radius:14px;display:block;background:#fff;"
        );
        frame.setAttribute("allow", "payment *; clipboard-write");
        mountInto.appendChild(frame);
        return;
      }
      fetchTheme(config).then((details) => {
        const theme = buildTheme(details);
        applyTheme(host, theme);
        ensureFont(theme.font);
      }).catch(() => {
      });
      const loading = document.createElement("div");
      loading.className = "onb-root";
      loading.style.cssText = "padding:18px;font-family:var(--onb-font);color:rgba(var(--onb-text),.6);font-size:14px;";
      loading.textContent = "Loading booking\u2026";
      mountInto.appendChild(loading);
      fetchLocations(config).then((locations) => {
        loading.remove();
        const view = renderWidget({ root: mountInto, config, locations, openUrl });
        maybeFleet(view.getQuery);
      }).catch(() => {
        loading.remove();
        const view = renderWidget({
          root: mountInto,
          config,
          locations: [],
          openUrl
        });
        maybeFleet(view.getQuery);
      });
      function maybeFleet(getQuery) {
        if (!config.showFleet) return;
        const box = mountInto.querySelector(".onb-fleet");
        if (!box) return;
        fetchFleet(config).then((fleet) => renderFleetPreview(box, config, fleet, getQuery, openUrl)).catch(() => {
        });
      }
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }
  })();
})();
//# sourceMappingURL=widget.js.map
