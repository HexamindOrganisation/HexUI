import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  CheckIcon,
  fmtSize,
  GlyphIcon,
  relTime,
  SearchIcon,
  tagOf,
  UploadIcon,
} from "./file-bits.js";

/** The minimal shape the palette needs to render + filter a file. */
export interface PaletteFile {
  id: string;
  name: string;
  size: number;
  /** Originating agent label, or null/undefined → "uploaded by you". */
  source?: string | null;
  /** ISO timestamp; when present, a relative time is shown. */
  created_at?: string;
}

/**
 * Command-palette attach (the design handoff's "variation B"). A centered,
 * keyboard-first modal alternative to the anchored popover: a big search field,
 * an upload row, and a list of re-attachable files. ↑/↓ move the cursor, Enter
 * toggles the cursored file, Esc closes. Rendered in a portal with the `.hxf`
 * token scope on its root so it styles correctly regardless of where it's
 * mounted from. Presentational — the host owns attach / upload / close.
 */
export function AttachPalette({
  files,
  attachedIds,
  onAttach,
  onUpload,
  onClose,
}: {
  files: PaletteFile[];
  attachedIds: ReadonlySet<string> | readonly string[];
  onAttach: (file: PaletteFile) => void;
  onUpload: () => void;
  onClose: () => void;
}): JSX.Element {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);

  const isAttached = (id: string) =>
    Array.isArray(attachedIds)
      ? attachedIds.includes(id)
      : (attachedIds as ReadonlySet<string>).has(id);

  const ql = q.trim().toLowerCase();
  const list = ql ? files.filter((f) => f.name.toLowerCase().includes(ql)) : files;

  useEffect(() => {
    setCursor(0);
  }, [q]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(list.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (list[cursor]) onAttach(list[cursor]);
    }
  };

  const metaOf = (f: PaletteFile) =>
    [tagOf(f.name), fmtSize(f.size), f.source || "uploaded by you", relTime(f.created_at)]
      .filter(Boolean)
      .join(" · ");

  return createPortal(
    <div className="hxf palette-overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="pal-search">
          <SearchIcon size={20} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Attach a file — search or upload"
            autoFocus
          />
          <span className="esc" onClick={onClose}>
            ESC
          </span>
        </div>

        <button type="button" className="pal-upload" onClick={onUpload}>
          <span className="au-ic">
            <UploadIcon size={19} />
          </span>
          <div>
            <div className="au-t">Upload new file</div>
            <div className="au-s">From your computer — PDF, CSV, code &amp; text</div>
          </div>
        </button>

        <div className="pal-seclbl">From your files</div>
        <div className="pal-list">
          {list.map((f, i) => {
            const on = isAttached(f.id);
            return (
              <button
                key={f.id}
                type="button"
                className={"pal-row" + (i === cursor ? " cursor" : "") + (on ? " attached" : "")}
                onMouseEnter={() => setCursor(i)}
                onClick={() => onAttach(f)}
              >
                <span className="fglyph pr-glyph">
                  <GlyphIcon name={f.name} size={18} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="pr-name">{f.name}</div>
                  <div className="pr-meta">{metaOf(f)}</div>
                </div>
                {on && (
                  <span className="pr-check">
                    <CheckIcon size={18} />
                  </span>
                )}
              </button>
            );
          })}
          {list.length === 0 && (
            <div className="pal-empty">
              {q ? `No files match “${q}”. Press upload to add one.` : "No files yet — upload one."}
            </div>
          )}
        </div>

        <div className="pal-foot">
          <span>
            <span className="key">↑↓</span>navigate
          </span>
          <span>
            <span className="key">↵</span>attach
          </span>
          <span>
            <span className="key">esc</span>close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
