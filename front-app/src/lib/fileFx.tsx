import { Code2, FileText, Sheet } from "lucide-react";

/**
 * File-presentation helpers + the shared monochrome glyph, ported from the
 * HexaUI file-handling design handoff. The agent stays the only color, so
 * glyphs are neutral and only distinguish by icon (doc / sheet / code).
 */

const SHEET = ["csv", "tsv", "xlsx", "xls"];
const CODE = ["yaml", "yml", "json", "ts", "tsx", "js", "py", "sh", "go", "rb", "sql"];

export type Kind = "pdf" | "sheet" | "code" | "text";

export const extOf = (name: string) =>
  (name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "").toLowerCase();

export const kindOf = (name: string): Kind => {
  const e = extOf(name);
  if (e === "pdf") return "pdf";
  if (SHEET.includes(e)) return "sheet";
  if (CODE.includes(e)) return "code";
  return "text";
};

export const tagOf = (name: string) => (extOf(name) || "file").toUpperCase();

export const splitName = (name: string): [string, string] => {
  const i = name.lastIndexOf(".");
  return i > 0 ? [name.slice(0, i), name.slice(i)] : [name, ""];
};

export function fmtSize(b: number): string {
  if (b == null) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export function relTime(iso: string): string {
  const added = Date.parse(iso);
  if (Number.isNaN(added)) return "—";
  const s = Math.max(0, (Date.now() - added) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)}d ago`;
  return new Date(added).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function FileGlyph({
  name,
  size = 30,
  className = "fglyph",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const cat = kindOf(name);
  const Ic = cat === "sheet" ? Sheet : cat === "code" ? Code2 : FileText;
  const s = Math.round(size * 0.52);
  return (
    <span className={className} style={{ width: size, height: size }}>
      <Ic style={{ width: s, height: s }} strokeWidth={1.5} />
    </span>
  );
}
