/* files.jsx — HexaUI file handling kit.
   Exports window.FilesKit = { FilesView, AttachMenu, AttachPalette,
   FileGlyph, seedFiles, fx } where fx holds formatting helpers.
   Wrapped in an IIFE to avoid colliding with the top-level `Icons`. */
(function () {
  const { Icons } = window;
  const { useState, useRef, useEffect } = React;

  /* ---------- helpers ---------- */
  const H = 3600e3, D = 86400e3;
  const extOf = (name) => (name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "").toLowerCase();
  const SHEET = ["csv", "tsv", "xlsx", "xls"];
  const CODE = ["yaml", "yml", "json", "ts", "tsx", "js", "py", "sh", "go", "rb", "sql"];
  const kindOf = (name) => {
    const e = extOf(name);
    if (e === "pdf") return "pdf";
    if (SHEET.includes(e)) return "sheet";
    if (CODE.includes(e)) return "code";
    return "text";
  };
  const tagOf = (name) => (extOf(name) || "file").toUpperCase();
  const iconFor = (cat) => (cat === "sheet" ? Icons.sheet : cat === "code" ? Icons.code : Icons.doc);

  const fmtSize = (b) => {
    if (b == null) return "—";
    if (b < 1024) return b + " B";
    if (b < 1048576) return Math.round(b / 1024) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  };
  const relTime = (added) => {
    const s = Math.max(0, (Date.now() - added) / 1000);
    if (s < 45) return "just now";
    if (s < 3600) return Math.round(s / 60) + "m ago";
    if (s < 86400) return Math.round(s / 3600) + "h ago";
    if (s < 7 * 86400) return Math.round(s / 86400) + "d ago";
    return new Date(added).toLocaleDateString([], { month: "short", day: "numeric" });
  };
  const splitName = (name) => {
    const i = name.lastIndexOf(".");
    return i > 0 ? [name.slice(0, i), name.slice(i)] : [name, ""];
  };

  const fx = { extOf, kindOf, tagOf, fmtSize, relTime, splitName };

  /* ---------- seed data ---------- */
  let _id = 0;
  const mk = (name, bytes, age, source) => ({ id: "f" + ++_id, name, bytes, added: Date.now() - age, source });
  const seedFiles = () => [
    mk("pricing-2026.pdf", 1280000, 2 * D, "Probe · research"),
    mk("q3-incident-postmortem.pdf", 690000, 26 * H, "Atlas"),
    mk("checkout-traces.csv", 245000, 4 * H, "Atlas"),
    mk("invoice-batch-aug.csv", 90000, 22 * H, "Ledger"),
    mk("fleet-audit.pdf", 430000, 6 * D, "Sentry"),
    mk("crm-billing-map.csv", 33000, 5 * D, "Relay"),
    mk("vendor-tiers.md", 14200, 2 * D, "Probe"),
    mk("build.yaml", 3100, 5 * D, "Forge"),
    mk("rollback.yaml", 940, 4 * H, "Atlas"),
    mk("rfp-notes.txt", 6300, 3 * D, null),
  ];

  /* ---------- neutral file glyph ---------- */
  const FileGlyph = ({ name, size = 30 }) => {
    const cat = kindOf(name);
    const Ic = iconFor(cat);
    return (
      <span className="fglyph" style={{ width: size, height: size }}>
        <Ic s={Math.round(size * 0.52)} sw={1.5} />
      </span>
    );
  };

  /* ---------- kind filters ---------- */
  const KINDS = [
    { id: "all", label: "All" },
    { id: "pdf", label: "Documents", tag: "PDF" },
    { id: "sheet", label: "Spreadsheets", tag: "CSV" },
    { id: "code", label: "Code", tag: "{ }" },
  ];

  /* ============================================================
     Files view — full screen
     ============================================================ */
  function FilesView({ files, attachedIds, onAttach, onRename, onDelete, onUpload }) {
    const [q, setQ] = useState("");
    const [kind, setKind] = useState("all");
    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState("");
    const [confirmId, setConfirmId] = useState(null);
    const [leavingId, setLeavingId] = useState(null);
    const renameRef = useRef(null);

    useEffect(() => { if (editingId && renameRef.current) { renameRef.current.focus(); renameRef.current.select(); } }, [editingId]);

    const ql = q.trim().toLowerCase();
    const shown = files.filter((f) => {
      if (kind !== "all" && kindOf(f.name) !== kind) return false;
      if (ql && !f.name.toLowerCase().includes(ql)) return false;
      return true;
    });
    const totalBytes = files.reduce((a, f) => a + (f.bytes || 0), 0);

    const startRename = (f) => { setConfirmId(null); setEditingId(f.id); setDraft(f.name); };
    const commitRename = () => {
      const v = draft.trim();
      if (v && editingId) onRename(editingId, v);
      setEditingId(null);
    };
    const doDelete = (f) => {
      setConfirmId(null);
      setLeavingId(f.id);
      setTimeout(() => { setLeavingId(null); onDelete(f); }, 330);
    };

    return (
      <div className="files-view enter">
        <div className="files-scroll">
          <div className="files-inner">
            <div className="files-head">
              <h1 className="files-title">Files</h1>
              <span className="spacer" />
              <div className="files-sub"><b>{files.length}</b> files · <b>{fmtSize(totalBytes)}</b> · workspace</div>
            </div>

            <div className="files-tools">
              <label className="files-search">
                <Icons.search s={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files" />
                {q && <span className="ic" style={{ cursor: "pointer", color: "var(--text-3)" }} onClick={() => setQ("")}><Icons.x s={15} /></span>}
              </label>
              <div className="kind-filter">
                {KINDS.map((k) => (
                  <div key={k.id} className={"kchip" + (kind === k.id ? " on" : "")} onClick={() => setKind(k.id)}>
                    {k.label}{k.tag && <span className="kn">{k.tag}</span>}
                  </div>
                ))}
              </div>
              <button className="w-btn w-btn-default" onClick={onUpload}><Icons.upload s={16} /> Upload</button>
            </div>

            {shown.length > 0 ? (
              <>
                <div className="fcol-head">
                  <span>Name</span><span>Type</span><span className="r">Size</span><span className="r">Added</span><span className="r">Actions</span>
                </div>
                {shown.map((f, i) => {
                  const cat = kindOf(f.name);
                  const [base, ext] = splitName(f.name);
                  const isAttached = attachedIds.includes(f.id);
                  const editing = editingId === f.id;
                  const confirming = confirmId === f.id;
                  return (
                    <div key={f.id}
                      className={"frow" + (leavingId === f.id ? " leaving" : " enter") + (confirming ? " menu-open" : "")}
                      style={{ animationDelay: leavingId === f.id ? "0s" : (i * 0.035) + "s" }}>
                      <div className="fname-cell">
                        <FileGlyph name={f.name} size={38} />
                        <div style={{ minWidth: 0 }}>
                          {editing ? (
                            <input ref={renameRef} className="frename" value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={commitRename}
                              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingId(null); }} />
                          ) : (
                            <div className="fname"><span className="base">{base}</span><span className="ext">{ext}</span></div>
                          )}
                          {!editing && f.source && <div className="fsource"><span className="src-dot" />{f.source}</div>}
                          {!editing && !f.source && <div className="fsource" style={{ color: "var(--text-3)" }}>uploaded by you</div>}
                        </div>
                      </div>
                      <span className="fmeta-tag"><span className="fkind">{tagOf(f.name)}</span></span>
                      <span className="fsize r" style={{ textAlign: "right" }}>{fmtSize(f.bytes)}</span>
                      <span className="fadded r" style={{ textAlign: "right" }}>{relTime(f.added)}</span>
                      <div className="frow-actions">
                        {confirming ? (
                          <div className="fconfirm">
                            <span>Delete?</span>
                            <span className="fact" onClick={() => setConfirmId(null)} title="Cancel"><Icons.x s={16} /></span>
                            <button className="w-btn w-btn-destructive sm" onClick={() => doDelete(f)}>Delete</button>
                          </div>
                        ) : (
                          <>
                            <span className={"fact attach"} title={isAttached ? "Attached" : "Attach to chat"} onClick={() => onAttach(f)}>
                              {isAttached ? <Icons.check s={17} /> : <Icons.attach s={17} />}
                            </span>
                            <span className="fact" title="Rename" onClick={() => startRename(f)}><Icons.pen s={16} /></span>
                            <span className="fact danger" title="Delete" onClick={() => setConfirmId(f.id)}><Icons.trash s={16} /></span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="files-empty">
                <div className="fe-glyph"><Icons.folder s={26} /></div>
                <h3>{ql || kind !== "all" ? "No files match" : "No files yet"}</h3>
                <p>{ql || kind !== "all" ? "Try a different search or filter." : "Upload a file to get started."}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- shared reattach-list filtering ---------- */
  const useFiltered = (files, q) => {
    const ql = q.trim().toLowerCase();
    return ql ? files.filter((f) => f.name.toLowerCase().includes(ql)) : files;
  };

  /* ============================================================
     Attach — popover (variation A)
     ============================================================ */
  function AttachMenu({ files, attachedIds, onAttach, onUpload, style }) {
    const [q, setQ] = useState("");
    const list = useFiltered(files, q);
    return (
      <div className="attach-menu" style={style} onClick={(e) => e.stopPropagation()}>
        <div className="am-search">
          <Icons.search s={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files to attach" autoFocus />
        </div>
        <div className="am-upload" onClick={onUpload}>
          <span className="au-ic"><Icons.upload s={17} /></span>
          <div><div className="au-t">Upload new file</div><div className="au-s">PDF, CSV, code & text</div></div>
        </div>
        <div className="am-seclbl lbl">From your files</div>
        <div className="am-list">
          {list.map((f) => {
            const on = attachedIds.includes(f.id);
            return (
              <div key={f.id} className={"am-row" + (on ? " attached" : "")} onClick={() => onAttach(f)}>
                <FileGlyph name={f.name} size={30} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="ar-name">{f.name}</div>
                  <div className="ar-meta">{tagOf(f.name)} · {fmtSize(f.bytes)} · {relTime(f.added)}</div>
                </div>
                {on && <span className="ar-check"><Icons.check s={17} /></span>}
              </div>
            );
          })}
          {list.length === 0 && <div className="am-empty">No files match “{q}”.</div>}
        </div>
      </div>
    );
  }

  /* ============================================================
     Attach — command palette (variation B)
     ============================================================ */
  function AttachPalette({ files, attachedIds, onAttach, onUpload, onClose }) {
    const [q, setQ] = useState("");
    const [cursor, setCursor] = useState(0);
    const list = useFiltered(files, q);
    const listRef = useRef(null);

    useEffect(() => { setCursor(0); }, [q]);
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(list.length - 1, c + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); if (list[cursor]) onAttach(list[cursor]); }
    };

    return (
      <div className="palette-overlay" onClick={onClose}>
        <div className="palette" onClick={(e) => e.stopPropagation()}>
          <div className="pal-search">
            <Icons.search s={20} />
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Attach a file — search or upload" autoFocus />
            <span className="esc" onClick={onClose}>ESC</span>
          </div>
          <div className="pal-upload" onClick={onUpload}>
            <span className="au-ic"><Icons.upload s={19} /></span>
            <div><div className="au-t" style={{ fontSize: 14.5, fontWeight: 500 }}>Upload new file</div><div className="au-s" style={{ fontSize: 12, color: "var(--text-3)" }}>From your computer — PDF, CSV, code & text</div></div>
          </div>
          <div className="pal-seclbl lbl">From your files</div>
          <div className="pal-list" ref={listRef}>
            {list.map((f, i) => {
              const on = attachedIds.includes(f.id);
              return (
                <div key={f.id} className={"pal-row" + (i === cursor ? " cursor" : "") + (on ? " attached" : "")}
                  onMouseEnter={() => setCursor(i)} onClick={() => onAttach(f)}>
                  <FileGlyph name={f.name} size={34} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="pr-name">{f.name}</div>
                    <div className="pr-meta">{tagOf(f.name)} · {fmtSize(f.bytes)} · {f.source || "uploaded by you"} · {relTime(f.added)}</div>
                  </div>
                  {on && <span className="pr-check"><Icons.check s={18} /></span>}
                </div>
              );
            })}
            {list.length === 0 && <div className="am-empty" style={{ padding: "26px 18px" }}>No files match “{q}”. Press upload to add one.</div>}
          </div>
          <div className="pal-foot">
            <span><span className="key">↑↓</span>navigate</span>
            <span><span className="key">↵</span>attach</span>
            <span><span className="key">esc</span>close</span>
          </div>
        </div>
      </div>
    );
  }

  window.FilesKit = { FilesView, AttachMenu, AttachPalette, FileGlyph, seedFiles, fx };
})();
