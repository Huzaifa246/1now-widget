import { resolveConfig } from "./config";
import { fetchLocations, fetchFleet, fetchTheme } from "./api";
import { applyTheme, buildTheme, ensureFont } from "./theme";
import { renderWidget, renderFleetPreview } from "./ui";
import { STYLES } from "./styles";

(function () {
  "use strict";

  const scriptEl: HTMLScriptElement | null =
    (document.currentScript as HTMLScriptElement) ||
    (() => {
      const all = document.getElementsByTagName("script");
      return all[all.length - 1] as HTMLScriptElement;
    })();

  const config = resolveConfig(scriptEl);

  /**
   * Open a URL in a modal iframe overlay on the host page. Keeps the visitor on
   * their own site while the hosted booking app (Template-1Now-FE) runs inside
   * the frame — handles the full detail → Pay & Book flow, scoped by company_id.
   * Appended to <body> with inline styles so no ancestor containing-block or
   * host CSS can break it.
   */
  function openModal(url: string): void {
    const overlay = document.createElement("div");
    overlay.setAttribute(
      "style",
      "position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;",
    );
    const panel = document.createElement("div");
    panel.setAttribute(
      "style",
      "position:relative;width:100%;max-width:1120px;height:92vh;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.45);",
    );
    const closeBtn = document.createElement("button");
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "✕";
    closeBtn.setAttribute(
      "style",
      "position:absolute;top:10px;right:12px;z-index:2;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 2px 10px rgba(0,0,0,.25);font-size:15px;line-height:1;cursor:pointer;",
    );
    const frame = document.createElement("iframe");
    frame.src = url;
    frame.title = "Book your vehicle";
    frame.setAttribute("style", "width:100%;height:100%;border:0;display:block;");
    frame.setAttribute("allow", "payment *; clipboard-write");

    const close = (): void => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (e: KeyboardEvent): void => {
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

  /** Route a booking URL: full-page navigation (default) or a modal iframe. */
  function openUrl(url: string): void {
    if (config.mode === "modal") {
      openModal(url);
    } else {
      // "page" — navigate to the booking app as the next page.
      if (config.openInNewTab) window.open(url, "_blank", "noopener");
      else window.location.href = url;
    }
  }

  function mount(): void {
    const host = document.createElement("div");
    host.className = "onb-host";

    const shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : null;
    const mountInto: ShadowRoot | HTMLElement = shadow ?? host;

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

    // Place the host element.
    const targetEl = config.target ? document.getElementById(config.target) : null;
    if (targetEl) targetEl.appendChild(host);
    else if (scriptEl && scriptEl.parentNode)
      scriptEl.parentNode.insertBefore(host, scriptEl.nextSibling);
    else document.body.appendChild(host);

    // FULL mode — embed the entire hosted booking app inline (operator needs no
    // site of their own; one script tag → a complete, company-scoped site).
    if (config.mode === "full") {
      const base = config.bookingUrl.replace(/\/+$/, "");
      const frame = document.createElement("iframe");
      frame.src = `${base}/?company_id=${encodeURIComponent(config.companyId)}`;
      frame.title = "Book your vehicle";
      frame.setAttribute(
        "style",
        "width:100%;height:90vh;min-height:560px;border:0;border-radius:14px;display:block;background:#fff;",
      );
      frame.setAttribute("allow", "payment *; clipboard-write");
      mountInto.appendChild(frame);
      return;
    }

    // BAR / REDIRECT mode — themed search bar + fleet preview.
    fetchTheme(config)
      .then((details) => {
        const theme = buildTheme(details);
        applyTheme(host, theme);
        ensureFont(theme.font);
      })
      .catch(() => {
        /* keep defaults */
      });

    const loading = document.createElement("div");
    loading.className = "onb-root";
    loading.style.cssText =
      "padding:18px;font-family:var(--onb-font);color:rgba(var(--onb-text),.6);font-size:14px;";
    loading.textContent = "Loading booking…";
    mountInto.appendChild(loading);

    fetchLocations(config)
      .then((locations) => {
        loading.remove();
        const view = renderWidget({ root: mountInto as ShadowRoot, config, locations, openUrl });
        maybeFleet(view.getQuery);
      })
      .catch(() => {
        loading.remove();
        const view = renderWidget({
          root: mountInto as ShadowRoot,
          config,
          locations: [],
          openUrl,
        });
        maybeFleet(view.getQuery);
      });

    function maybeFleet(getQuery?: () => Record<string, string>): void {
      if (!config.showFleet) return;
      const box = mountInto.querySelector(".onb-fleet") as HTMLElement | null;
      if (!box) return;
      fetchFleet(config)
        .then((fleet) => renderFleetPreview(box, config, fleet, getQuery, openUrl))
        .catch(() => {
          /* preview is optional */
        });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
