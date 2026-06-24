import type { DateRange } from "./types";

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function sameDay(a: Date | null, b: Date | null): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export interface CalendarHandle {
  el: HTMLElement;
  getRange(): DateRange;
}

/** Two-month (responsive) range picker. First click sets start, second sets
 *  end (clicking before start restarts). Past days are disabled. */
export function createRangeCalendar(opts: {
  initial: DateRange;
  months?: number;
  onChange?: (r: DateRange) => void;
}): CalendarHandle {
  const months = opts.months ?? 2;
  const today = startOfDay(new Date());
  const range: DateRange = {
    start: opts.initial.start ? startOfDay(opts.initial.start) : null,
    end: opts.initial.end ? startOfDay(opts.initial.end) : null,
  };
  let view = startOfMonth(range.start || today);

  const root = document.createElement("div");
  root.className = "onb-cals";

  function pick(day: Date): void {
    if (!range.start || (range.start && range.end)) {
      range.start = day;
      range.end = null;
    } else if (day.getTime() < range.start.getTime()) {
      range.start = day;
    } else {
      range.end = day;
    }
    opts.onChange?.({ ...range });
    render();
  }

  function monthEl(base: Date): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "onb-cal";

    const head = document.createElement("div");
    head.className = "onb-cal-head";
    const prev = document.createElement("button");
    prev.className = "onb-nav";
    prev.type = "button";
    prev.setAttribute("aria-label", "Previous month");
    prev.textContent = "‹";
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
    next.textContent = "›";
    next.onclick = () => {
      view = addMonths(view, 1);
      render();
    };
    // Only the first month shows the prev arrow; only the last shows next.
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
      const inRange =
        range.start && range.end &&
        day.getTime() > range.start.getTime() &&
        day.getTime() < range.end.getTime();
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

  function render(): void {
    root.innerHTML = "";
    for (let m = 0; m < months; m++) {
      root.appendChild(monthEl(addMonths(view, m)));
    }
  }

  render();
  return { el: root, getRange: () => ({ ...range }) };
}
