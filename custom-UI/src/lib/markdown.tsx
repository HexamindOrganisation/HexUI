import type { ReactNode } from "react";
import katex from "katex";
import { createLowlight, common } from "lowlight";
import { cn } from "./utils.js";

/**
 * Safe markdown renderer. Returns React nodes only — never raw HTML from the
 * source — so React's text-escaping is the security boundary. Any embedded HTML
 * in the source is treated as literal text. Links are URL-scheme validated.
 *
 * Two features render richer content than plain text, both from trusted
 * generators (not the raw source):
 *   - **Code** is tokenized by highlight.js (via `lowlight`), which emits a node
 *     tree we map to React `<span>`s — still no `innerHTML`.
 *   - **Math** (`\(…\)`, `\[…\]`, `$$…$$`) is typeset by KaTeX. KaTeX produces
 *     its own markup, injected via `dangerouslySetInnerHTML`. This is the one
 *     controlled exception to the no-HTML rule: KaTeX is run with
 *     `trust:false` + `throwOnError:false`, so even hostile LaTeX cannot emit
 *     script/dangerous HTML — malformed input renders as inert error text.
 *
 * Shared by the `markdown` widget and the `ai-response` transcript so assistant
 * prose renders headings / code / lists / links / math consistently.
 *
 * Note: consumers must load KaTeX's stylesheet (`import "katex/dist/katex.min.css"`)
 * for math to display correctly.
 */
export function renderMarkdown(src: string): ReactNode {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.trim() === "") {
      i++;
      continue;
    }

    // Fenced code block: ```lang ... ```
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] ?? "";
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]!)) {
        code.push(lines[i]!);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push(
        <pre
          key={key++}
          className="overflow-auto rounded-md bg-muted p-3 text-xs"
        >
          <code className="hljs" data-language={lang || undefined}>
            {highlightToReact(code.join("\n"), lang)}
          </code>
        </pre>,
      );
      continue;
    }

    // Display math block: a line starting with `\[` or `$$`, closed by the
    // matching delimiter (on the same line or a later one).
    const blockMath = blockMathAt(lines, i);
    if (blockMath) {
      blocks.push(
        renderMath(blockMath.tex, key++, { display: true, block: true }),
      );
      i = blockMath.next;
      continue;
    }

    // ATX heading: #..###### text
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1]!.length;
      const text = heading[2]!.trim();
      const sizes = [
        "text-2xl font-semibold",
        "text-xl font-semibold",
        "text-lg font-semibold",
        "text-base font-semibold",
        "text-sm font-semibold",
        "text-sm font-semibold uppercase tracking-wide",
      ];
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      blocks.push(
        <Tag key={key++} className={cn("mt-4 mb-2", sizes[level - 1])}>
          {renderInline(text)}
        </Tag>,
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="my-3 border-border" />);
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) {
        buf.push(lines[i]!.replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-2 border-l-2 border-border pl-3 text-muted-foreground"
        >
          {renderInline(buf.join(" "))}
        </blockquote>,
      );
      continue;
    }

    // Lists (unordered or ordered). Blank lines between items ("loose" lists,
    // which LLMs emit constantly) must NOT split the list — otherwise each item
    // becomes its own <ol> and `list-decimal` restarts at "1." for every one.
    const ulMatch = line.match(/^[-*+]\s+(.*)$/);
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      const ordered = !!olMatch;
      const startNum = olMatch ? parseInt(olMatch[1]!, 10) : 1;
      const items: string[] = [];
      const itemRe = ordered ? /^\d+\.\s+(.*)$/ : /^[-*+]\s+(.*)$/;
      while (i < lines.length) {
        const m = lines[i]!.match(itemRe);
        if (m) {
          items.push(m[1]!);
          i++;
          continue;
        }
        // Stay in the list across blank line(s) only if another item follows.
        if (lines[i]!.trim() === "") {
          let j = i + 1;
          while (j < lines.length && lines[j]!.trim() === "") j++;
          if (j < lines.length && itemRe.test(lines[j]!)) {
            i = j;
            continue;
          }
        }
        break;
      }
      const listItems = items.map((it, idx) => (
        <li key={idx}>{renderInline(it)}</li>
      ));
      blocks.push(
        ordered ? (
          <ol
            key={key++}
            start={startNum}
            className="my-2 list-decimal space-y-1 pl-6"
          >
            {listItems}
          </ol>
        ) : (
          <ul key={key++} className="my-2 list-disc space-y-1 pl-6">
            {listItems}
          </ul>
        ),
      );
      continue;
    }

    // Paragraph: collapse consecutive non-blank, non-special lines.
    const para: string[] = [line];
    i++;
    while (i < lines.length) {
      const l = lines[i]!;
      if (
        l.trim() === "" ||
        /^```/.test(l) ||
        /^#{1,6}\s+/.test(l) ||
        /^>\s?/.test(l) ||
        /^[-*+]\s+/.test(l) ||
        /^\d+\.\s+/.test(l) ||
        /^\\\[/.test(l) ||
        /^\$\$/.test(l) ||
        /^(-{3,}|\*{3,}|_{3,})\s*$/.test(l)
      ) {
        break;
      }
      para.push(l);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-2 first:mt-0 last:mb-0">
        {renderInline(para.join(" "))}
      </p>,
    );
  }

  return blocks;
}

// ── Math (KaTeX) ─────────────────────────────────────────────────────────────

/**
 * If the line at `i` opens a display-math block (`\[` or `$$`), consume through
 * the matching close delimiter and return the LaTeX + the next line index.
 * Returns null when there's no opener or no close is found (so the text is left
 * to normal paragraph handling rather than swallowing the rest of the doc).
 */
function blockMathAt(
  lines: string[],
  i: number,
): { tex: string; next: number } | null {
  const open = lines[i]!.trim();
  let close: string;
  if (open.startsWith("\\[")) close = "\\]";
  else if (open.startsWith("$$")) close = "$$";
  else return null;

  const first = open.slice(2); // both openers are 2 chars
  const sameLineClose = first.indexOf(close);
  if (sameLineClose !== -1) {
    return { tex: first.slice(0, sameLineClose).trim(), next: i + 1 };
  }

  const buf: string[] = first ? [first] : [];
  let j = i + 1;
  while (j < lines.length) {
    const l = lines[j]!;
    const ci = l.indexOf(close);
    if (ci !== -1) {
      buf.push(l.slice(0, ci));
      return { tex: buf.join("\n").trim(), next: j + 1 };
    }
    buf.push(l);
    j++;
  }
  return null;
}

/** Typeset a LaTeX fragment with KaTeX. Safe (trust:false, throwOnError:false). */
function renderMath(
  tex: string,
  key: number,
  opts: { display: boolean; block?: boolean },
): ReactNode {
  let html: string;
  try {
    html = katex.renderToString(tex, {
      displayMode: opts.display,
      throwOnError: false,
      trust: false,
      output: "htmlAndMathml",
    });
  } catch {
    // Should be unreachable with throwOnError:false, but never crash the render.
    return (
      <code key={key} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
        {tex}
      </code>
    );
  }
  if (opts.block) {
    return (
      <div
        key={key}
        className="my-3 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <span
      key={key}
      className={opts.display ? "inline-block align-middle" : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ── Code highlighting (highlight.js via lowlight → React nodes) ──────────────

const lowlight = createLowlight(common);
const LANGS = new Set(lowlight.listLanguages());

/**
 * Tokenize `code` with highlight.js and return React `<span>`s (no innerHTML).
 * Uses the fence's language hint when known, else auto-detects; falls back to
 * plain text if highlighting fails.
 */
function highlightToReact(code: string, lang: string): ReactNode {
  let tree;
  try {
    tree =
      lang && LANGS.has(lang)
        ? lowlight.highlight(lang, code)
        : lowlight.highlightAuto(code);
  } catch {
    try {
      tree = lowlight.highlightAuto(code);
    } catch {
      return code;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree.children as any[]).map((n, idx) => hastToReact(n, idx));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hastToReact(node: any, key: number): ReactNode {
  if (node.type === "text") return node.value;
  if (node.type === "element") {
    const cls = node.properties?.className;
    const className = Array.isArray(cls)
      ? cls.join(" ")
      : typeof cls === "string"
        ? cls
        : undefined;
    return (
      <span key={key} className={className}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(node.children as any[])?.map((c, idx) => hastToReact(c, idx))}
      </span>
    );
  }
  return null;
}

// ── Inline parsing ───────────────────────────────────────────────────────────

/**
 * Inline parser: handles math (`\(…\)`, `\[…\]`, `$$…$$`), `code`, **bold**,
 * *italic*, [text](url). Math is matched first so its LaTeX body isn't mangled
 * by the emphasis/code rules. Operates on already-text strings; emits React
 * nodes only (KaTeX output excepted — see the module docstring).
 */
function renderInline(text: string): ReactNode {
  const out: ReactNode[] = [];
  let key = 0;
  let rest = text;

  const patterns: { re: RegExp; build: (m: RegExpExecArray) => ReactNode }[] = [
    // Inline math \( ... \)
    {
      re: /\\\(([\s\S]+?)\\\)/,
      build: (m) => renderMath(m[1]!, key++, { display: false }),
    },
    // Display math appearing mid-line: \[ ... \] or $$ ... $$ (rare; the
    // block-level handler covers the common own-line case).
    {
      re: /\\\[([\s\S]+?)\\\]/,
      build: (m) => renderMath(m[1]!, key++, { display: true }),
    },
    {
      re: /\$\$([^\n]+?)\$\$/,
      build: (m) => renderMath(m[1]!, key++, { display: true }),
    },
    {
      re: /`([^`\n]+)`/,
      build: (m) => (
        <code
          key={key++}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {m[1]}
        </code>
      ),
    },
    {
      re: /\*\*([^*\n]+)\*\*/,
      build: (m) => (
        <strong key={key++} className="font-semibold">
          {renderInline(m[1]!)}
        </strong>
      ),
    },
    {
      re: /\*([^*\n]+)\*/,
      build: (m) => (
        <em key={key++} className="italic">
          {renderInline(m[1]!)}
        </em>
      ),
    },
    {
      re: /\[([^\]\n]+)\]\(([^)\s]+)\)/,
      build: (m) => {
        const safe = sanitizeUrl(m[2]!);
        if (!safe) {
          return <span key={key++}>{m[1]}</span>;
        }
        return (
          <a
            key={key++}
            href={safe}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline underline-offset-2 hover:text-primary"
          >
            {renderInline(m[1]!)}
          </a>
        );
      },
    },
  ];

  while (rest.length > 0) {
    let bestIdx = -1;
    let bestMatch: RegExpExecArray | null = null;
    let bestPattern: (typeof patterns)[number] | null = null;

    for (const p of patterns) {
      const m = p.re.exec(rest);
      if (m && (bestMatch === null || m.index < bestIdx)) {
        bestIdx = m.index;
        bestMatch = m;
        bestPattern = p;
      }
    }

    if (!bestMatch || !bestPattern) {
      out.push(rest);
      break;
    }

    if (bestIdx > 0) out.push(rest.slice(0, bestIdx));
    out.push(bestPattern.build(bestMatch));
    rest = rest.slice(bestIdx + bestMatch[0].length);
  }

  return out;
}

/**
 * Returns the URL only if it uses an allow-listed scheme, or is a relative
 * URL / fragment / mailto. Returns null for `javascript:`, `data:`, `vbscript:`,
 * `file:`, or any other scheme — those are treated as label-only by the caller.
 */
function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("?") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../")
  ) {
    return trimmed;
  }
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!schemeMatch) {
    return trimmed;
  }
  const scheme = schemeMatch[1]!.toLowerCase();
  if (scheme === "http" || scheme === "https" || scheme === "mailto") {
    return trimmed;
  }
  return null;
}
