"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import VisualEditorBridge from "./VisualEditorBridge";
import Link from "next/link";
import { useLocal } from "../lib/local/client";
import {
  pageKey,
  productPath,
  type PageContent,
  type CmsBlock,
} from "../lib/local/types";
const Content = createContext<PageContent | null>(null);
const fallbackBlocks: CmsBlock[] = [
  {
    id: "designed-template",
    type: "template",
    title: "",
    body: "",
    image: "",
    alt: "",
    buttonLabel: "",
    href: "",
    visible: true,
  },
];
export function CmsHeading({
  children,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const content = useContext(Content);
  return <h1 {...props}>{content?.title || children}</h1>;
}
export function CmsIntro({
  children,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const content = useContext(Content);
  return <p {...props}>{content?.intro || children}</p>;
}
export default function CmsPage({ children }: { children: React.ReactNode }) {
  const { brand, data } = useLocal(),
    path = usePathname();
  const savedContent = data?.pages.find(
    (p) => p.id === pageKey(brand, path),
  )?.published;
  const [editingContent, setEditingContent] = useState<PageContent | null>(
    null,
  );
  const content = editingContent ?? savedContent;
  useEffect(() => {
    if (content?.seoTitle) document.title = content.seoTitle;
    if (content?.seoDescription)
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute("content", content.seoDescription);
  }, [content]);
  return (
    <Content.Provider value={content ?? null}>
      <VisualEditorBridge
        edits={
          editingContent
            ? (editingContent.elements ?? [])
            : [...(data?.sharedElements ?? []), ...(content?.elements ?? [])]
        }
        authorized={data?.previewAuthorized === true}
        onContent={setEditingContent}
      />
      {data?.previewAuthorized === true && (
        <aside className="cms-preview-banner">
          Saved draft preview · staff only{" "}
          <Link href={path}>View published page</Link>
        </aside>
      )}
      {(content?.blocks ?? fallbackBlocks).map((b) =>
        !b.visible ? null : b.type === "template" ? (
          <div key={b.id} data-cms-template>
            {children}
          </div>
        ) : (
          <section
            key={b.id}
            data-cms-block={b.id}
            className={`cms-section cms-${b.type}`}
          >
            {b.type === "divider" ? (
              <hr />
            ) : (
              <>
                {b.image && <img src={b.image} alt={b.alt} loading="lazy" />}
                {b.title && <h2>{b.title}</h2>}
                {b.body && <p style={{ whiteSpace: "pre-line" }}>{b.body}</p>}
                {b.type === "products" && (
                  <div className="cms-products">
                    {data?.products.slice(0, 4).map((p) => (
                      <Link href={productPath(brand, p)} key={p.id}>
                        <img src={p.image} alt={p.name} />
                        <strong>{p.name}</strong>
                      </Link>
                    ))}
                  </div>
                )}
                {b.buttonLabel && b.href && (
                  <Link className="button button-dark" href={b.href}>
                    {b.buttonLabel} ↗
                  </Link>
                )}
              </>
            )}
          </section>
        ),
      )}
    </Content.Provider>
  );
}
