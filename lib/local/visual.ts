import type { CmsElement } from "./types";
export type Selection = CmsElement & {
  tag: string;
  label: string;
  sectionImageSelector?: string;
  blockId?: string;
};
export const editableTags =
  "h1,h2,h3,h4,h5,h6,p,a,button,img,li,summary,label,strong,em,span,small,blockquote,figcaption";
export function pickElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  if (target.closest(".live-chat-widget,.cms-preview-banner,[data-cms-ignore]"))
    return null;
  const image =
    target.closest("img") ||
    (!target.closest(editableTags)
      ? target.closest(".fashion-hero")?.querySelector("img")
      : null);
  const element =
    image || target.closest("a,button") || target.closest(editableTags);
  if (
    !(element instanceof HTMLElement) ||
    !element.closest("[data-cms-template],[data-cms-block],[data-cms-site]")
  )
    return null;
  return element;
}
export function elementSelector(element: Element) {
  let root =
    element.closest("[data-cms-slide],[data-cms-item],[data-cms-product]") ||
    element.closest("[data-cms-template],[data-cms-block],[data-cms-site]");
  if (!root) throw new Error("Choose an element on the page.");
  let prefix: string;
  if (root.hasAttribute("data-cms-item"))
    prefix = `[data-cms-template] [data-cms-item="${CSS.escape(root.getAttribute("data-cms-item")!)}"]`;
  else if (root.hasAttribute("data-cms-product"))
    prefix = `[data-cms-template] [data-cms-product="${CSS.escape(root.getAttribute("data-cms-product")!)}"]`;
  else if (root.hasAttribute("data-cms-slide"))
    prefix = `[data-cms-template] [data-cms-slide="${CSS.escape(root.getAttribute("data-cms-slide")!)}"]`;
  else if (root.hasAttribute("data-cms-block"))
    prefix = `[data-cms-block="${CSS.escape(root.getAttribute("data-cms-block")!)}"]`;
  else if (root.hasAttribute("data-cms-site"))
    prefix = `[data-cms-site="${CSS.escape(root.getAttribute("data-cms-site")!)}"]`;
  else prefix = "[data-cms-template]";
  const parts: string[] = [];
  let cursor: Element | null = element;
  while (cursor && cursor !== root) {
    const name = cursor.tagName.toLowerCase();
    const siblings = cursor.parentElement
      ? Array.from(cursor.parentElement.children).filter(
          (s) => s.tagName === cursor!.tagName,
        )
      : [];
    parts.unshift(
      name + ":nth-of-type(" + (siblings.indexOf(cursor) + 1) + ")",
    );
    cursor = cursor.parentElement;
  }
  return prefix + (parts.length ? " > " + parts.join(" > ") : "");
}
export function describeElement(el: HTMLElement): Selection {
  const image = el instanceof HTMLImageElement,
    anchor = el instanceof HTMLAnchorElement ? el : el.closest("a");
  const section = el.closest("[data-cms-item],[data-cms-product],section");
  const sectionImage = section?.querySelector("img");
  return {
    blockId:
      el.closest("[data-cms-block]")?.getAttribute("data-cms-block") ||
      undefined,
    ...(!image && sectionImage
      ? { sectionImageSelector: elementSelector(sectionImage) }
      : {}),
    selector: elementSelector(el),
    scope: el.closest("[data-cms-site]") ? "site" : "page",
    kind: image
      ? "image"
      : el.tagName === "A"
        ? "link"
        : el.tagName === "BUTTON"
          ? "button"
          : "text",
    tag: el.tagName.toLowerCase(),
    label: image
      ? "Image"
      : el.tagName === "A"
        ? "Link / button"
        : el.tagName === "BUTTON"
          ? "Button"
          : el.tagName.match(/^H[1-6]$/)
            ? "Heading"
            : "Text",
    ...(image
      ? { src: el.getAttribute("src") || "", alt: el.getAttribute("alt") || "" }
      : { text: el.innerText.trim() }),
    ...(anchor
      ? {
          href: anchor.getAttribute("href") || "",
          linkSelector: elementSelector(anchor),
        }
      : {}),
  };
}
// Text nodes are updated without removing icon SVGs, links or form controls.
function textNodes(el: HTMLElement) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement?.closest("svg,script,style,select,textarea")
        ? NodeFilter.FILTER_REJECT
        : node.textContent?.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Node[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n);
  return nodes;
}
type Snapshot = {
  element: HTMLElement;
  nodes: { node: Node; value: string | null }[];
  attrs: Record<string, string | null>;
  last: CmsElement;
  link?: { element: HTMLAnchorElement; href: string | null };
};
export function createVisualApplier() {
  const snapshots = new Map<string, Snapshot>();
  function restore(s: Snapshot) {
    if (s.link) {
      if (s.link.href === null) s.link.element.removeAttribute("href");
      else s.link.element.setAttribute("href", s.link.href);
    }
    for (const n of s.nodes)
      if (n.node.isConnected) n.node.textContent = n.value;
    for (const [key, value] of Object.entries(s.attrs))
      if (value === null) s.element.removeAttribute(key);
      else s.element.setAttribute(key, value);
  }
  function apply(edits: CmsElement[]) {
    const keys = new Set(edits.map((e) => e.selector));
    for (const [key, s] of snapshots)
      if (!keys.has(key)) {
        restore(s);
        snapshots.delete(key);
      }
    for (const edit of edits) {
      let el: HTMLElement | null = null;
      try {
        el = document.querySelector<HTMLElement>(edit.selector);
      } catch {
        continue;
      }
      if (!el || !el.matches(editableTags)) continue;
      let snapshot = snapshots.get(edit.selector);
      if (!snapshot || snapshot.element !== el) {
        snapshot = {
          element: el,
          nodes: textNodes(el).map((node) => ({
            node,
            value: node.textContent,
          })),
          attrs: Object.fromEntries(
            ["src", "srcset", "alt", "href", "style"].map((k) => [
              k,
              el!.getAttribute(k),
            ]),
          ),
          last: edit,
        };
        snapshots.set(edit.selector, snapshot);
      }
      snapshot.last = edit;
      if (edit.text !== undefined && el.innerText.trim() !== edit.text) {
        const nodes = textNodes(el);
        if (nodes.length) {
          nodes[0].textContent = edit.text;
          for (const n of nodes.slice(1)) n.textContent = "";
        } else el.append(document.createTextNode(edit.text));
      }
      if (edit.src !== undefined && el instanceof HTMLImageElement) {
        if (el.getAttribute("src") !== edit.src) {
          el.removeAttribute("srcset");
          el.setAttribute("src", edit.src);
        }
        if (el.alt !== (edit.alt || "")) el.alt = edit.alt || "";
      }
      if (edit.href !== undefined) {
        let link: Element | null = el;
        if (edit.linkSelector)
          try {
            link = document.querySelector(edit.linkSelector);
          } catch {}
        if (link instanceof HTMLAnchorElement) {
          if (!snapshot.link)
            snapshot.link = { element: link, href: link.getAttribute("href") };
          if (link.getAttribute("href") !== edit.href)
            link.setAttribute("href", edit.href);
        }
      }
    }
  }
  return {
    apply,
    dispose() {
      for (const s of snapshots.values()) restore(s);
      snapshots.clear();
    },
  };
}
