import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder, Pencil, Search, Trash2, Undo2, Upload, X } from "lucide-react";

import {
  deleteFile,
  fileContentUrl,
  listFiles,
  renameFile,
  uploadFile,
  type FileMeta,
} from "../api/files";
import {
  FileGlyph,
  fmtSize,
  type Kind,
  kindOf,
  relTime,
  splitName,
  tagOf,
} from "../lib/fileFx";

const KINDS: { id: "all" | Kind; label: string; tag?: string }[] = [
  { id: "all", label: "All" },
  { id: "pdf", label: "Documents", tag: "PDF" },
  { id: "sheet", label: "Spreadsheets", tag: "CSV" },
  { id: "code", label: "Code", tag: "{ }" },
];

/**
 * The Files library — the editorial full-screen view from the HexaUI handoff:
 * a masthead with file/byte totals, a search + kind-filter + upload toolbar, a
 * monochrome grid (the agent stays the only color), inline rename, and a
 * deferred delete with an undo toast. Files are global and reusable; attach any
 * of them to a conversation from the chat composer.
 */
export function FilesPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const { data: files = [], isLoading } = useQuery({
    queryKey: ["files"],
    queryFn: listFiles,
  });

  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  // Deferred delete: hide the row immediately, fire the backend delete only
  // when the undo window closes, so Undo is a true cancel (no re-upload).
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<FileMeta | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uploadMut = useMutation({
    mutationFn: async (picked: File[]) => {
      for (const f of picked) await uploadFile(f);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameFile(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });

  useEffect(() => {
    if (editingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [editingId]);

  // Finalize any pending delete if the component unmounts mid-window.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const ql = q.trim().toLowerCase();
  const visible = files.filter((f) => !hiddenIds.has(f.id));
  const shown = visible.filter((f) => {
    if (kind !== "all" && kindOf(f.name) !== kind) return false;
    if (ql && !f.name.toLowerCase().includes(ql)) return false;
    return true;
  });
  const totalBytes = visible.reduce((a, f) => a + (f.size || 0), 0);

  const startRename = (f: FileMeta) => {
    setConfirmId(null);
    setEditingId(f.id);
    setDraft(f.name);
  };
  const commitRename = () => {
    const v = draft.trim();
    if (v && editingId && v !== files.find((f) => f.id === editingId)?.name) {
      renameMut.mutate({ id: editingId, name: v });
    }
    setEditingId(null);
  };

  const finalizeDelete = (id: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    deleteMut.mutate(id);
    setToast(null);
  };
  const doDelete = (f: FileMeta) => {
    // If a prior delete is still pending, commit it now (one toast at a time).
    if (toast && toast.id !== f.id) finalizeDelete(toast.id);
    setConfirmId(null);
    setLeavingId(f.id);
    setTimeout(() => {
      setLeavingId(null);
      setHiddenIds((s) => new Set(s).add(f.id));
      setToast(f);
      timerRef.current = setTimeout(() => finalizeDelete(f.id), 5000);
    }, 330);
  };
  const undoDelete = () => {
    if (!toast) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const id = toast.id;
    setHiddenIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    setToast(null);
  };

  const pickFiles = () => inputRef.current?.click();

  return (
    <div className="hxf h-full">
      <div className="files-view enter">
        <div className="files-scroll">
          <div className="files-inner">
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (picked.length) uploadMut.mutate(picked);
              }}
            />

            <div className="files-head">
              <h1 className="files-title">Files</h1>
              <span className="spacer" />
              <div className="files-sub">
                <b>{visible.length}</b> files · <b>{fmtSize(totalBytes)}</b> · workspace
              </div>
            </div>

            <div className="files-tools">
              <label className="files-search">
                <Search style={{ width: 16, height: 16 }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search files"
                />
                {q && (
                  <span
                    style={{ cursor: "pointer", color: "var(--text-3)", display: "flex" }}
                    onClick={() => setQ("")}
                  >
                    <X style={{ width: 15, height: 15 }} />
                  </span>
                )}
              </label>
              <div className="kind-filter">
                {KINDS.map((k) => (
                  <div
                    key={k.id}
                    className={"kchip" + (kind === k.id ? " on" : "")}
                    onClick={() => setKind(k.id)}
                  >
                    {k.label}
                    {k.tag && <span className="kn">{k.tag}</span>}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="files-upload"
                onClick={pickFiles}
                disabled={uploadMut.isPending}
              >
                <Upload style={{ width: 16, height: 16 }} />
                {uploadMut.isPending ? "Uploading…" : "Upload"}
              </button>
            </div>

            {isLoading ? (
              <div className="files-empty">
                <p>Loading…</p>
              </div>
            ) : shown.length > 0 ? (
              <>
                <div className="fcol-head">
                  <span>Name</span>
                  <span>Type</span>
                  <span className="r">Size</span>
                  <span className="r">Added</span>
                  <span className="r">Actions</span>
                </div>
                {shown.map((f, i) => {
                  const [base, ext] = splitName(f.name);
                  const editing = editingId === f.id;
                  const confirming = confirmId === f.id;
                  return (
                    <div
                      key={f.id}
                      className={
                        "frow" +
                        (leavingId === f.id ? " leaving" : " enter") +
                        (confirming ? " menu-open" : "")
                      }
                      style={{
                        animationDelay: leavingId === f.id ? "0s" : `${i * 0.035}s`,
                      }}
                    >
                      <div className="fname-cell">
                        <FileGlyph name={f.name} size={38} />
                        <div style={{ minWidth: 0 }}>
                          {editing ? (
                            <input
                              ref={renameRef}
                              className="frename"
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={commitRename}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename();
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                          ) : (
                            <a
                              className="fname"
                              href={fileContentUrl(f.id)}
                              target="_blank"
                              rel="noreferrer"
                              title={f.name}
                            >
                              <span className="base">{base}</span>
                              <span className="ext">{ext}</span>
                            </a>
                          )}
                          {!editing && (
                            <div className="fsource">uploaded by you</div>
                          )}
                        </div>
                      </div>
                      <span className="fmeta-tag">
                        <span className="fkind">{tagOf(f.name)}</span>
                      </span>
                      <span className="fsize r" style={{ textAlign: "right" }}>
                        {fmtSize(f.size)}
                      </span>
                      <span className="fadded r" style={{ textAlign: "right" }}>
                        {relTime(f.created_at)}
                      </span>
                      <div className="frow-actions">
                        {confirming ? (
                          <div className="fconfirm">
                            <span>Delete?</span>
                            <span
                              className="fact"
                              onClick={() => setConfirmId(null)}
                              title="Cancel"
                            >
                              <X style={{ width: 16, height: 16 }} />
                            </span>
                            <button className="del-btn" onClick={() => doDelete(f)}>
                              Delete
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              className="fact"
                              title="Rename"
                              onClick={() => startRename(f)}
                            >
                              <Pencil style={{ width: 16, height: 16 }} />
                            </span>
                            <span
                              className="fact danger"
                              title="Delete"
                              onClick={() => setConfirmId(f.id)}
                            >
                              <Trash2 style={{ width: 16, height: 16 }} />
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="files-empty">
                <div className="fe-glyph">
                  <Folder style={{ width: 26, height: 26 }} />
                </div>
                <h3>{ql || kind !== "all" ? "No files match" : "No files yet"}</h3>
                <p>
                  {ql || kind !== "all"
                    ? "Try a different search or filter."
                    : "Upload a file to get started."}
                </p>
              </div>
            )}
          </div>
        </div>

        {toast && (
          <div className="f-toast">
            <span className="ft-msg">
              Deleted <b>{toast.name}</b>
            </span>
            <button className="ft-undo" onClick={undoDelete}>
              <Undo2 style={{ width: 14, height: 14 }} />
              Undo
            </button>
            <span className="ft-meter">
              <i />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
