"use client";
import { CollapsibleSection, DataList } from "./admin/shared/Density";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Brand,
  CmsPage,
  CmsBlock,
  PageContent,
  Media,
  CmsElement,
} from "../lib/local/types";
import type { Selection } from "../lib/local/visual";
type Act = (input: Record<string, unknown>) => Promise<any>;
function initialContent(page: CmsPage, shared: CmsElement[]): PageContent {
  return {
    ...structuredClone(page.draft),
    elements: [
      ...(page.draft.elements ?? []).filter((e) => e.scope !== "site"),
      ...structuredClone(shared),
    ],
  };
}
export default function VisualPageBuilder({
  pages,
  brand,
  act,
  media,
  sharedDraft = [],
}: {
  pages: CmsPage[];
  brand: Brand;
  act: Act;
  media: Media[];
  sharedDraft?: CmsElement[];
}) {
  const [id, setId] = useState(pages[0]?.id || "home"),
    [dirty, setDirty] = useState(false),
    [expanded, setExpanded] = useState(false);
  const page = pages.find((p) => p.id === id) || pages[0];
  const choose = (id: string) => {
    if (id === page.id) return;
    if (
      dirty &&
      !confirm("You have unsaved page changes. Discard them and switch pages?")
    )
      return;
    setDirty(false);
    setId(id);
  };
  return (
    <section
      className={`visual-studio ${expanded ? "studio-expanded" : ""}`}
      aria-label={`${brand} visual page builder`}
    >
      <Editor
        key={page.id}
        page={page}
        pages={pages}
        brand={brand}
        act={act}
        media={media}
        sharedDraft={sharedDraft}
        onDirty={setDirty}
        onChoose={choose}
        expanded={expanded}
        onExpand={() => setExpanded(!expanded)}
      />
    </section>
  );
}
function Editor({
  page,
  pages,
  brand,
  act,
  media,
  sharedDraft,
  onDirty,
  onChoose,
  expanded,
  onExpand,
}: {
  page: CmsPage;
  pages: CmsPage[];
  brand: Brand;
  act: Act;
  media: Media[];
  sharedDraft: CmsElement[];
  onDirty: (v: boolean) => void;
  onChoose: (id: string) => void;
  expanded: boolean;
  onExpand: () => void;
}) {
  const [content, setContent] = useState<PageContent>(() =>
      initialContent(page, sharedDraft),
    ),
    [dirty, setDirty] = useState(false),
    [working, setWorking] = useState(false),
    [selected, setSelected] = useState<Selection | null>(null),
    [tab, setTab] = useState("Element"),
    [viewport, setViewport] = useState(1280),
    [scale, setScale] = useState(1),
    [ready, setReady] = useState(false),
    [mode, setMode] = useState<"edit" | "interact">("edit"),
    [status, setStatus] = useState(""),
    [uploading, setUploading] = useState(false),
    [activeBlock, setActiveBlock] = useState("");
  const iframe = useRef<HTMLIFrameElement>(null),
    canvas = useRef<HTMLDivElement>(null);
  const current = useRef(content);
  current.current = content;
  const undoStack = useRef<PageContent[]>([]),
    redoStack = useRef<PageContent[]>([]);
  const path =
    page.id === "product"
      ? brand === "idesire"
        ? "/product/royal-bloom-embroidered-lace"
        : "/kokies-world-of-gift/1"
      : page.path;
  const send = useCallback(
    (type: string, payload: unknown) =>
      iframe.current?.contentWindow?.postMessage(
        { type, payload },
        location.origin,
      ),
    [],
  );
  const change = (next: PageContent, history = true) => {
    if (history) {
      undoStack.current.push(structuredClone(current.current));
      undoStack.current = undoStack.current.slice(-60);
      redoStack.current = [];
    }
    setContent(next);
    setDirty(true);
    onDirty(true);
    setStatus("Unsaved changes · visible only in this editor");
  };
  useEffect(() => {
    if (!dirty) setContent(initialContent(page, sharedDraft));
  }, [page.updatedAt, sharedDraft]);
  useEffect(() => {
    if (ready) send("cms:content", content);
  }, [content, ready, send]);
  useEffect(() => {
    send("cms:mode", mode);
  }, [mode, ready, send]);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== iframe.current?.contentWindow
      )
        return;
      const { type, payload } = event.data || {};
      if (type === "cms:ready") {
        setReady(true);
        send("cms:content", current.current);
      }
      if (type === "cms:select") {
        setSelected(payload);
        setTab("Element");
        setStatus("");
      }
      if (type === "cms:notice") setStatus(payload.message);
      if (type === "cms:follow") {
        const url = new URL(payload.href, location.origin);
        const p = pages.find((p) => p.path === url.pathname);
        if (p) onChoose(p.id);
        else
          setStatus(
            "Select the destination page using the page menu, or return to Edit mode to change this link.",
          );
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [send, pages, onChoose]);
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const resize = () =>
      setScale(Math.max(0.1, Math.min(1, (node.clientWidth - 32) / viewport)));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [viewport, expanded]);
  useEffect(() => {
    if (window.innerWidth < 700) setViewport(390);
  }, []);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  const update = (patch: Partial<CmsElement>) => {
    if (!selected) return;
    const next = { ...selected, ...patch };
    setSelected(next);
    const clean: CmsElement = {
      selector: next.selector,
      scope: next.scope,
      kind: next.kind,
      ...(next.text !== undefined ? { text: next.text } : {}),
      ...(next.src !== undefined ? { src: next.src, alt: next.alt } : {}),
      ...(next.href !== undefined
        ? { href: next.href, linkSelector: next.linkSelector }
        : {}),
    };
    const blockId = selected.blockId;
    if (blockId) {
      change({
        ...current.current,
        blocks: current.current.blocks.map((b) =>
          b.id !== blockId
            ? b
            : {
                ...b,
                ...(patch.src !== undefined ? { image: patch.src } : {}),
                ...(patch.alt !== undefined ? { alt: patch.alt } : {}),
                ...(patch.href !== undefined ? { href: patch.href } : {}),
                ...(patch.text !== undefined
                  ? selected.kind === "link"
                    ? { buttonLabel: patch.text }
                    : selected.tag === "h2"
                      ? { title: patch.text }
                      : { body: patch.text }
                  : {}),
              },
        ),
      });
      return;
    }
    const elements = current.current.elements ?? [];
    change({
      ...current.current,
      elements: [
        ...elements.filter((e) => e.selector !== clean.selector),
        clean,
      ],
    });
  };
  const save = async (publish = false) => {
    setWorking(true);
    const result = await act({
      action: publish ? "publishPage" : "savePageDraft",
      id: page.id,
      content: current.current,
    });
    if (result) {
      setDirty(false);
      onDirty(false);
      setStatus(
        publish
          ? "Published. Your changes are now on the live website."
          : "Draft saved. The published website is unchanged.",
      );
    }
    setWorking(false);
  };
  const history = (redo = false) => {
    const from = redo ? redoStack : undoStack,
      to = redo ? undoStack : redoStack;
    const next = from.current.pop();
    if (!next) return;
    to.current.push(structuredClone(current.current));
    change(next, false);
    setSelected(null);
    send("cms:deselect", null);
  };
  const editBlock = (patch: Partial<CmsBlock>) =>
    change({
      ...content,
      blocks: content.blocks.map((b) =>
        b.id === activeBlock ? { ...b, ...patch } : b,
      ),
    });
  const block = content.blocks.find((b) => b.id === activeBlock);
  return (
    <>
      <header className="visual-toolbar">
        <div>
          <span className="desk-kicker">
            {brand === "kokies" ? "KOKIES WORLD OF GIFTS" : "iDESIRE TRADS"} /
            VISUAL EDITOR
          </span>
          <h2>{page.name}</h2>
        </div>
        <label>
          Editing page
          <select
            aria-label="Choose page to edit"
            value={page.id}
            onChange={(e) => onChoose(e.target.value)}
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="desk-actions">
          <button
            onClick={() => history()}
            disabled={!undoStack.current.length}
            title="Undo last edit"
          >
            ↶ Undo
          </button>
          <button
            onClick={() => history(true)}
            disabled={!redoStack.current.length}
            title="Redo last edit"
          >
            ↷ Redo
          </button>
          <button onClick={onExpand}>
            {expanded ? "Exit full workspace" : "Expand workspace"}
          </button>
          <button disabled={working} onClick={() => void save()}>
            Save draft{dirty ? " •" : ""}
          </button>
          <button
            className="desk-primary"
            disabled={working}
            onClick={() => void save(true)}
          >
            Publish page
          </button>
        </div>
      </header>
      <div className="visual-subtoolbar">
        <div className="desk-actions">
          {[
            [1280, "Desktop"],
            [768, "Tablet"],
            [390, "Mobile"],
          ].map(([width, label]) => (
            <button
              key={width}
              aria-pressed={viewport === width}
              onClick={() => setViewport(Number(width))}
            >
              {label}
            </button>
          ))}
          <span>
            {viewport}px · {Math.round(scale * 100)}%
          </span>
        </div>
        <div className="desk-actions">
          <button
            className={mode === "edit" ? "visual-active" : ""}
            onClick={() => setMode(mode === "edit" ? "interact" : "edit")}
          >
            {mode === "edit" ? "✦ Click to edit" : "▶ Test interactions"}
          </button>
          <a href={path} target="_blank" rel="noreferrer">
            Open live page ↗
          </a>
        </div>
      </div>
      <p className="visual-instruction">
        {mode === "edit"
          ? "Click any heading, paragraph, image, button or link on the page below. Edit the selected item in the panel."
          : "Test menus, sliders and disclosure panels. Form submissions are disabled in the editor."}
      </p>
      {status && (
        <p className="visual-status" role="status">
          {status}
        </p>
      )}
      <div className="visual-workspace">
        <div className="visual-canvas" ref={canvas}>
          {!ready && (
            <div className="visual-loading">
              Loading the actual {page.name.toLowerCase()}…
            </div>
          )}
          <div
            className="visual-frame-wrap"
            style={{
              width: viewport * scale,
              height: Math.max(720, 750 * scale),
            }}
          >
            <iframe
              ref={iframe}
              title={`Edit ${page.name} — actual ${brand} website`}
              src={`${path}?cmsPreview=1&cmsEditor=1&page=${encodeURIComponent(page.id)}`}
              onLoad={() => {
                send("cms:content", current.current);
                send("cms:mode", mode);
              }}
              style={{
                width: viewport,
                height: Math.max(900, 750 / scale),
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          </div>
        </div>
        <aside className="visual-inspector">
          <nav aria-label="Page editor tools">
            {["Element", "Sections", "Page settings"].map((t) => (
              <button
                aria-pressed={tab === t}
                key={t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </nav>
          {tab === "Element" &&
            (selected ? (
              <>
                <span className="desk-kicker">
                  {selected.scope === "site"
                    ? "SHARED ACROSS THIS BRAND"
                    : "THIS PAGE"}{" "}
                  / {selected.tag}
                </span>
                <h3>{selected.label}</h3>
                {selected.sectionImageSelector && (
                  <button
                    className="visual-section-image"
                    onClick={() =>
                      send("cms:select-element", selected.sectionImageSelector)
                    }
                  >
                    Edit image in this section ↗
                  </button>
                )}
                {selected.scope === "site" && (
                  <p className="visual-help">
                    This shared header or footer change will apply across this
                    brand when you publish.
                  </p>
                )}
                {selected.kind === "image" ? (
                  <>
                    <img
                      className="visual-selected-image"
                      src={selected.src}
                      alt={selected.alt || "Selected image"}
                    />
                    <label>
                      Upload & replace image
                      <input
                        aria-label="Upload & replace image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          try {
                            const body = new FormData();
                            body.append("file", file);
                            body.append("alt", selected.alt || file.name);
                            const response = await fetch(
                              `/api/local/media/${brand}`,
                              { method: "POST", body },
                            );
                            const image = await response.json();
                            if (!response.ok) throw new Error(image.error);
                            update({ src: image.src, alt: image.alt });
                            setStatus(
                              "Image replaced in the editor. Save a draft or publish when ready.",
                            );
                          } catch (e) {
                            setStatus((e as Error).message);
                          } finally {
                            setUploading(false);
                          }
                        }}
                      />
                    </label>
                    {uploading && <p role="status">Uploading image…</p>}
                    <label>
                      Choose from brand media
                      <select
                        aria-label="Choose from brand media"
                        value=""
                        onChange={(e) => {
                          const m = media.find((m) => m.src === e.target.value);
                          if (m) update({ src: m.src, alt: m.alt });
                        }}
                      >
                        <option value="">Select a replacement…</option>
                        {media.map((m) => (
                          <option key={m.id} value={m.src}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <DataList data={media} label="Image thumbnails" limit={12} render={rows => <div
                      className="visual-media-grid"
                      aria-label="Brand image thumbnails"
                    >
                      {rows.map((m) => (
                        <button
                          key={m.id}
                          title={m.name}
                          aria-label={"Use image: " + m.name}
                          onClick={() => update({ src: m.src, alt: m.alt })}
                        >
                          <img
                            src={m.src}
                            alt={m.alt || m.name}
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>} />
                    <label>
                      Image URL
                      <input
                        aria-label="Image URL"
                        value={selected.src || ""}
                        onChange={(e) => update({ src: e.target.value })}
                      />
                    </label>
                    <label>
                      Image description
                      <input
                        aria-label="Image description"
                        value={selected.alt || ""}
                        onChange={(e) => update({ alt: e.target.value })}
                      />
                    </label>
                  </>
                ) : (
                  <label>
                    {selected.kind === "link" || selected.kind === "button"
                      ? "Button / link label"
                      : "Visible text"}
                    <textarea
                      aria-label={
                        selected.kind === "link" || selected.kind === "button"
                          ? "Button / link label"
                          : "Visible text"
                      }
                      rows={selected.kind === "text" ? 6 : 3}
                      value={selected.text ?? ""}
                      onChange={(e) => update({ text: e.target.value })}
                    />
                  </label>
                )}
                {selected.href !== undefined && (
                  <label>
                    Link destination
                    <input
                      aria-label="Link destination"
                      value={selected.href}
                      placeholder="/shop or https://…"
                      onChange={(e) => update({ href: e.target.value })}
                    />
                  </label>
                )}
                {selected.kind === "button" && selected.href === undefined && (
                  <p className="visual-help">
                    This is an interactive control, such as a slider or form
                    action. Its behaviour stays connected while you edit its
                    label.
                  </p>
                )}
                {(content.elements ?? []).some(
                  (e) => e.selector === selected.selector,
                ) && (
                  <button
                    onClick={() => {
                      change({
                        ...content,
                        elements: (content.elements ?? []).filter(
                          (e) => e.selector !== selected.selector,
                        ),
                      });
                      setSelected(null);
                      send("cms:deselect", null);
                    }}
                  >
                    Reset this element
                  </button>
                )}
                <p className="visual-help">
                  Changes appear instantly in the page preview. Save draft keeps
                  them private; Publish page makes them live.
                </p>
              </>
            ) : (
              <div className="visual-empty">
                <span>↖</span>
                <h3>Select something on the page.</h3>
                <p>
                  The canvas is the actual website. Click an image to swap it,
                  or select text, a button or a link to edit it here.
                </p>
                <p>
                  Switch to “Test interactions” to change hero slides or open
                  menus, then return to “Click to edit”.
                </p>
              </div>
            ))}
          {tab === "Sections" && (
            <>
              <h3>Page sections</h3>
              <p className="visual-help">
                Keep the designed page and its functional tools. Add sections
                before or after it, and see them in the canvas.
              </p>
              {content.blocks.map((b, i) => (
                <div key={b.id} className="visual-section-row">
                  <button
                    onClick={() => setActiveBlock(b.id)}
                    aria-pressed={activeBlock === b.id}
                  >
                    {b.type === "template"
                      ? "Live designed page"
                      : b.title || b.type}
                  </button>
                  <div className="desk-actions">
                    <button
                      aria-label={`Move ${b.type} up`}
                      disabled={i === 0}
                      onClick={() => {
                        const blocks = [...content.blocks];
                        [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]];
                        change({ ...content, blocks });
                      }}
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Move ${b.type} down`}
                      disabled={i === content.blocks.length - 1}
                      onClick={() => {
                        const blocks = [...content.blocks];
                        [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]];
                        change({ ...content, blocks });
                      }}
                    >
                      ↓
                    </button>
                    {!(page.protected && b.type === "template") && (
                      <>
                        <button
                          onClick={() =>
                            change({
                              ...content,
                              blocks: content.blocks.map((x) =>
                                x.id === b.id
                                  ? { ...x, visible: !x.visible }
                                  : x,
                              ),
                            })
                          }
                        >
                          {b.visible ? "Hide" : "Show"}
                        </button>
                        {b.type !== "template" && (
                          <button
                            onClick={() =>
                              change({
                                ...content,
                                blocks: content.blocks.filter(
                                  (x) => x.id !== b.id,
                                ),
                              })
                            }
                          >
                            ×
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <label>
                Add section
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const b: CmsBlock = {
                      id: crypto.randomUUID(),
                      type: e.target.value as CmsBlock["type"],
                      title: "Your new section",
                      body: "Click here to edit this section.",
                      image: "",
                      alt: "",
                      buttonLabel: "",
                      href: "",
                      visible: true,
                    };
                    change({ ...content, blocks: [...content.blocks, b] });
                    setActiveBlock(b.id);
                  }}
                >
                  <option value="">Choose a section…</option>
                  {[
                    "text",
                    "image",
                    "callout",
                    "faq",
                    "products",
                    "divider",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              {block && block.type !== "template" && (
                <>
                  <label>
                    Section heading
                    <input
                      value={block.title}
                      onChange={(e) => editBlock({ title: e.target.value })}
                    />
                  </label>
                  <label>
                    Section text
                    <textarea
                      value={block.body}
                      onChange={(e) => editBlock({ body: e.target.value })}
                    />
                  </label>
                  <label>
                    Section image
                    <select
                      value={block.image}
                      onChange={(e) => editBlock({ image: e.target.value })}
                    >
                      <option value="">No image</option>
                      {media.map((m) => (
                        <option key={m.id} value={m.src}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Image description
                    <input
                      value={block.alt}
                      onChange={(e) => editBlock({ alt: e.target.value })}
                    />
                  </label>
                  <label>
                    Button label
                    <input
                      value={block.buttonLabel}
                      onChange={(e) =>
                        editBlock({ buttonLabel: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Button link
                    <input
                      value={block.href}
                      onChange={(e) => editBlock({ href: e.target.value })}
                    />
                  </label>
                </>
              )}
            </>
          )}
          {tab === "Page settings" && (
            <>
              <h3>Search & publishing</h3>
              <label>
                Search title
                <input
                  value={content.seoTitle}
                  onChange={(e) =>
                    change({ ...content, seoTitle: e.target.value })
                  }
                />
              </label>
              <label>
                Search description
                <textarea
                  value={content.seoDescription}
                  onChange={(e) =>
                    change({ ...content, seoDescription: e.target.value })
                  }
                />
              </label>
              <p className="visual-help">
                Last published {new Date(page.publishedAt).toLocaleString()}
              </p>
              <a
                href={`${path}?cmsPreview=1&page=${page.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Open saved draft preview ↗
              </a>
              <CollapsibleSection key={page.id} title="Version history" count={page.versions.length}>
                <DataList data={page.versions} label="Published versions" limit={6}
                  empty={<p className="visual-help">Published versions appear here after publishing.</p>}
                  render={rows => <div>{rows.map((v) => (
                  <div className="visual-version" key={v.id}>
                    <small>
                      {new Date(v.at).toLocaleString()}
                      <br />
                      {v.actor}
                    </small>
                    <button
                      onClick={async () => {
                        if (
                          dirty &&
                          !confirm(
                            "Replace your unsaved changes with this version?",
                          )
                        )
                          return;
                        const r = await act({
                          action: "restorePage",
                          id: page.id,
                          versionId: v.id,
                        });
                        if (r) {
                          setContent({
                            ...r.draft,
                            elements: [
                              ...(r.draft.elements ?? []).filter(
                                (e: CmsElement) => e.scope !== "site",
                              ),
                              ...(v.content.elements ?? []).filter(
                                (e) => e.scope === "site",
                              ),
                            ],
                          });
                          setDirty(false);
                          onDirty(false);
                          setSelected(null);
                          setStatus(
                            "Version restored into draft. Review the canvas, then publish when ready.",
                          );
                        }
                      }}
                    >
                      Restore draft
                    </button>
                  </div>
                ))}</div>} />
              </CollapsibleSection>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
