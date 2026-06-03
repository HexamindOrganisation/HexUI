/**
 * Shared file-presentation bits for the composer's attach surfaces (popover +
 * command palette) and the attached pills. Hand-rolled SVGs (the library has no
 * icon dependency). The agent stays the only color, so the glyph is a neutral
 * tile and only the icon distinguishes doc / spreadsheet / code.
 */

const SHEET = ["csv", "tsv", "xlsx", "xls"];
const CODE = ["yaml", "yml", "json", "ts", "tsx", "js", "py", "sh", "go", "rb", "sql"];

export const extOf = (name: string) =>
  (name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "").toLowerCase();

export const tagOf = (name: string) => (extOf(name) || "file").toUpperCase();

export function fmtSize(b: number): string {
  if (b == null) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

/** Relative time from an ISO string; "" when no/invalid timestamp. */
export function relTime(iso?: string): string {
  if (!iso) return "";
  const added = Date.parse(iso);
  if (Number.isNaN(added)) return "";
  const s = Math.max(0, (Date.now() - added) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)}d ago`;
  return new Date(added).toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Neutral file glyph; the icon distinguishes doc / spreadsheet / code. */
export function GlyphIcon({ name, size = 16 }: { name: string; size?: number }): JSX.Element {
  const e = extOf(name);
  const cat =
    e === "pdf" ? "pdf" : SHEET.includes(e) ? "sheet" : CODE.includes(e) ? "code" : "text";
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    style: { width: size, height: size },
  };
  if (cat === "code") {
    return (
      <svg {...common}>
        <path d="M16 18l6-6-6-6" />
        <path d="M8 6l-6 6 6 6" />
      </svg>
    );
  }
  if (cat === "sheet") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function SearchIcon({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ width: size, height: size }}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function CheckIcon({ size = 17 }: { size?: number }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ width: size, height: size }}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function UploadIcon({ size = 17 }: { size?: number }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ width: size, height: size }}>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

export function XIcon({ size = 14 }: { size?: number }): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden style={{ width: size, height: size }}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
