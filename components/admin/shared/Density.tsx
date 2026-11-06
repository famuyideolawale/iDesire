"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";

type PageState = { page: number; total: number; size: number; setPage: (page: number) => void };
export function useDataPage<T>(data: readonly T[], size: number, resetKey = "") {
  const [cursor, setCursor] = useState({ key: resetKey, page: 0 });
  const page = Math.max(0, Math.min(cursor.key === resetKey ? cursor.page : 0, Math.ceil(data.length / size) - 1));
  return {
    rows: data.slice(page * size, (page + 1) * size),
    page, total: data.length, size,
    setPage: (page: number) => setCursor({ key: resetKey, page }),
  };
}
export function Pagination({ state, label }: { state: PageState; label: string }) {
  const { page, total, size, setPage } = state;
  const pages = Math.ceil(total / size);
  if (pages < 2) return null;
  const choices = [...new Set([0, page - 1, page, page + 1, pages - 1])].filter(i => i >= 0 && i < pages).sort((a,b) => a-b);
  return <nav className="density-pagination" aria-label={label}>
    <span role="status">{page * size + 1}–{Math.min(total, (page + 1) * size)} of {total}</span>
    <div>
      <button type="button" aria-label="Previous page" disabled={!page} onClick={() => setPage(page - 1)}><ArrowLeft size={15} /></button>
      {choices.map((i, index) => <span key={i}>{index > 0 && i - choices[index - 1] > 1 && <span aria-hidden="true">…</span>}
        <button type="button" aria-label={`Page ${i + 1} of ${pages}`} aria-current={i === page ? "page" : undefined} onClick={() => setPage(i)}>{i + 1}</button>
      </span>)}
      <button type="button" aria-label="Next page" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}><ArrowRight size={15} /></button>
    </div>
  </nav>;
}

export function ViewAll({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" className="density-view-all" onClick={onClick}>{children}<ArrowRight size={15} aria-hidden="true" /></button>;
}
type DataListProps<T> = {
  data: readonly T[]; label: string; limit?: number; increment?: number; previewCap?: number;
  mode?: "page" | "load" | "show" | "preview"; resetKey?: string; empty?: ReactNode;
  loading?: boolean; error?: string; onViewAll?: () => void; render: (rows: readonly T[]) => ReactNode;
};
export function DataList<T>({ data, label, limit = 12, increment = limit, previewCap = limit * 3, mode = "page", resetKey = "", empty, loading, error, onViewAll, render }: DataListProps<T>) {
  const state = useDataPage(data, limit, resetKey);
  const [shown, setShown] = useState({ key: resetKey, count: limit });
  const count = shown.key === resetKey ? shown.count : limit;
  if (loading) return <p role="status">Loading {label.toLowerCase()}…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!data.length) return empty ?? <p className="workspace-empty">No {label.toLowerCase()} to show.</p>;
  const rows = mode === "page" ? state.rows : data.slice(0, mode === "preview" ? limit : count);
  const expandable = mode === "load" || mode === "show";
  const ceiling = mode === "show" ? Math.min(data.length, previewCap) : data.length;
  return <>{render(rows)}
    {mode === "page" && <Pagination state={state} label={label + " pages"} />}
    {expandable && data.length > limit && <div className="density-pagination"><span role="status">Showing {rows.length} of {data.length}</span><div>
      {rows.length < ceiling && <button type="button" onClick={() => setShown({ key: resetKey, count: Math.min(count + increment, ceiling) })}><ArrowDown size={15} aria-hidden="true" />{mode === "load" ? "Load more" : "Show more"}</button>}
      {mode === "show" && count > limit && <button type="button" onClick={() => setShown({ key: resetKey, count: limit })}>Show less</button>}
    </div></div>}
    {onViewAll && <ViewAll onClick={onViewAll}>View all {label.toLowerCase()}</ViewAll>}
  </>;
}

export function CollapsibleSection({ title, description, count, status, defaultOpen = false, children, className = "" }: {
  title: string; description?: string; count?: number; status?: ReactNode; defaultOpen?: boolean; children: ReactNode; className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return <details className={"density-section " + className} open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><span><strong>{title}</strong>{description && <small>{description}</small>}</span>
      {count !== undefined && <span className="density-count">{count.toLocaleString("en-NG")}</span>}{status}<ChevronDown size={17} aria-hidden="true" />
    </summary>
    {open && <div className="density-section-body">{children}</div>}
  </details>;
}
