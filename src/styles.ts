/** All widget CSS, injected once inside the Shadow root so the host page can
 *  never bleed in (and vice-versa). Colors read the `--onb-*` vars set by
 *  theme.ts; `:host` resets inherited properties for full isolation. */
export const STYLES = `
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

/* Fleet preview — "Explore All Vehicles" grid */
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

/* Responsive — stack into a column on narrow containers */
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
