"use client";
import { useEffect, useRef } from "react";
import {
  createVisualApplier,
  describeElement,
  pickElement,
  type Selection,
} from "../lib/local/visual";
import type { CmsElement, PageContent } from "../lib/local/types";
export default function VisualEditorBridge({
  edits,
  authorized,
  onContent,
}: {
  edits: CmsElement[];
  authorized: boolean;
  onContent: (c: PageContent) => void;
}) {
  const callback = useRef(onContent);
  callback.current = onContent;
  const current = useRef(edits);
  current.current = edits;
  useEffect(() => {
    const applier = createVisualApplier();
    let frame = 0;
    let active: HTMLElement | null = null,
      hover: HTMLElement | null = null;
    let interactive = false;
    const embedded =
      authorized &&
      window.parent !== window &&
      new URLSearchParams(location.search).get("cmsEditor") === "1";
    const send = (type: string, payload: unknown = {}) =>
      window.parent.postMessage({ type, payload }, location.origin);
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => applier.apply(current.current));
    };
    const observer = new MutationObserver(schedule);
    window.addEventListener("cms:refresh", schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["src", "href", "srcset", "alt"],
    });
    schedule();
    const message = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== window.parent)
        return;
      if (event.data?.type === "cms:content") {
        callback.current(event.data.payload);
        requestAnimationFrame(schedule);
      }
      if (event.data?.type === "cms:select-element") {
        try {
          const el = document.querySelector<HTMLElement>(event.data.payload);
          if (el && pickElement(el)) {
            active?.removeAttribute("data-cms-selected");
            active = el;
            el.setAttribute("data-cms-selected", "true");
            send("cms:select", describeElement(el));
          }
        } catch {}
      }
      if (event.data?.type === "cms:mode")
        interactive = event.data.payload === "interact";
      if (event.data?.type === "cms:deselect") {
        active?.removeAttribute("data-cms-selected");
        active = null;
      }
    };
    const move = (event: MouseEvent) => {
      if (interactive) return;
      const el = pickElement(event.target);
      if (el === hover) return;
      hover?.removeAttribute("data-cms-hover");
      hover = el;
      hover?.setAttribute("data-cms-hover", "true");
    };
    const click = (event: MouseEvent) => {
      const el = pickElement(event.target);
      if (!el) return;
      if (
        interactive &&
        ((el.tagName === "BUTTON" && !(el as HTMLButtonElement).form) ||
          el.tagName === "SUMMARY" ||
          (event.target instanceof Element &&
            event.target.closest("input,select,textarea")))
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (interactive && el.tagName === "A") {
        send("cms:follow", { href: el.getAttribute("href") });
        return;
      }
      active?.removeAttribute("data-cms-selected");
      active = el;
      el.setAttribute("data-cms-selected", "true");
      send("cms:select", describeElement(el));
    };
    const followEditedLink = (event: MouseEvent) => {
      if (
        embedded ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const edit = current.current.find((edit) => {
        if (edit.href === undefined) return false;
        try {
          return (
            document.querySelector(edit.linkSelector || edit.selector) ===
            anchor
          );
        } catch {
          return false;
        }
      });
      if (!edit) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (anchor.target === "_blank")
        window.open(anchor.href, "_blank", "noopener,noreferrer");
      else location.assign(anchor.href);
    };
    document.addEventListener("click", followEditedLink, true);
    const submit = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      send("cms:notice", {
        message:
          "Form submissions are disabled inside the editor. Use the live website to test orders and enquiries.",
      });
    };
    let style: HTMLStyleElement | undefined;
    if (embedded) {
      style = document.createElement("style");
      style.textContent =
        "[data-cms-hover]{outline:2px dashed #467bdf!important;outline-offset:3px;cursor:crosshair!important}[data-cms-selected]{outline:3px solid #467bdf!important;outline-offset:4px!important}html{scroll-behavior:auto!important}.fashion-hero-shade{pointer-events:none!important}.fashion-hero-copy{pointer-events:none!important}.fashion-hero-copy>*{pointer-events:auto!important}.live-chat-widget{display:none!important}.cms-preview-banner{display:none!important}";
      document.head.append(style);
      window.addEventListener("message", message);
      document.addEventListener("mousemove", move, true);
      document.addEventListener("click", click, true);
      document.addEventListener("submit", submit, true);
      send("cms:ready");
    }
    return () => {
      document.removeEventListener("click", followEditedLink, true);
      window.removeEventListener("cms:refresh", schedule);
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("message", message);
      document.removeEventListener("mousemove", move, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("submit", submit, true);
      active?.removeAttribute("data-cms-selected");
      hover?.removeAttribute("data-cms-hover");
      style?.remove();
      applier.dispose();
    };
  }, [authorized]);
  useEffect(() => {
    window.dispatchEvent(new Event("cms:refresh"));
  }, [edits]);
  return null;
}
