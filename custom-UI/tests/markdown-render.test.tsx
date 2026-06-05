import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { renderMarkdown } from "../src/lib/markdown.js";

function mount(src: string): HTMLElement {
  const { container } = render(<div>{renderMarkdown(src)}</div>);
  return container;
}

describe("renderMarkdown — code highlighting", () => {
  it("tokenizes fenced code with highlight.js classes (React spans, no innerHTML)", () => {
    const c = mount("```js\nconst x = 1;\n```");
    const code = c.querySelector("pre code");
    expect(code).toBeTruthy();
    expect(code!.classList.contains("hljs")).toBe(true);
    // highlight.js emits hljs-* token spans (e.g. hljs-keyword for `const`).
    expect(c.querySelector('[class*="hljs-"]')).toBeTruthy();
    expect(code!.textContent).toContain("const x = 1;");
  });

  it("falls back gracefully for an unknown language", () => {
    const c = mount("```wat\nsome plain text\n```");
    expect(c.querySelector("pre code")!.textContent).toContain("some plain text");
  });
});

describe("renderMarkdown — math (KaTeX)", () => {
  it("renders inline math \\( … \\)", () => {
    const c = mount("Euler: \\(e^{i\\pi}+1=0\\) is neat.");
    expect(c.querySelector(".katex")).toBeTruthy();
    expect(c.textContent).toContain("Euler:");
    expect(c.textContent).toContain("is neat.");
  });

  it("renders a display math block \\[ … \\]", () => {
    const c = mount("Before\n\n\\[\n\\int_0^1 x^2 \\, dx\n\\]\n\nAfter");
    expect(c.querySelector(".katex-display")).toBeTruthy();
    expect(c.textContent).toContain("Before");
    expect(c.textContent).toContain("After");
  });

  it("renders a $$ … $$ display block", () => {
    const c = mount("$$ a^2 + b^2 = c^2 $$");
    expect(c.querySelector(".katex-display")).toBeTruthy();
  });

  it("does not crash on malformed LaTeX (throwOnError:false)", () => {
    const c = mount("\\(\\frac{1}{\\)");
    // KaTeX renders an inert error node rather than throwing.
    expect(c).toBeTruthy();
  });
});

describe("renderMarkdown — regressions", () => {
  it("keeps ordered-list numbering across loose items", () => {
    const c = mount("1. first\n\n2. second\n\n3. third");
    const ol = c.querySelector("ol");
    expect(ol).toBeTruthy();
    expect(ol!.querySelectorAll("li").length).toBe(3);
  });

  it("still renders bold / italic / links", () => {
    const c = mount("**bold** and *italic* and [x](https://example.com)");
    expect(c.querySelector("strong")!.textContent).toBe("bold");
    expect(c.querySelector("em")!.textContent).toBe("italic");
    expect(c.querySelector("a")!.getAttribute("href")).toBe("https://example.com");
  });
});
