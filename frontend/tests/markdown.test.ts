import { describe, expect, it } from "vitest";
import { escapeHtml, renderInline, renderMarkdown } from "@/lib/markdown";

/**
 * Regression cover for the content-page renderer, whose output is injected
 * with dangerouslySetInnerHTML on the public /p/[slug] route.
 */
describe("escapeHtml", () => {
  it("escapes every character that can break out of text or an attribute", () => {
    expect(escapeHtml(`<img src=x onerror="a'b">&`)).toBe(
      "&lt;img src=x onerror=&quot;a&#39;b&quot;&gt;&amp;",
    );
  });
});

describe("renderInline", () => {
  it("renders allowed external links with noopener", () => {
    expect(renderInline("[Сайт](https://example.com/a?b=1&c=2)")).toBe(
      '<a href="https://example.com/a?b=1&amp;c=2" rel="nofollow noop noreferrer">Сайт</a>',
    );
  });

  it("blocks attribute injection through the link URL", () => {
    // The payload that produced
    // <a href="https://a/"onclick="alert`pwned`"> before escaping was fixed.
    const out = renderInline('[Жми](https://a/"onclick="alert`pwned`)');
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("<a ");
    expect(out).toContain("Жми");
  });

  it("blocks javascript: and data: URLs", () => {
    expect(renderInline("[x](javascript:alert%281%29)")).not.toContain("<a ");
    expect(renderInline("[x](data:text/html;base64,AAA)")).not.toContain("<a ");
  });

  it("blocks angle brackets inside a URL", () => {
    expect(renderInline("[x](https://a/<script>)")).not.toContain("<script>");
  });

  it("renders bold and italic", () => {
    expect(renderInline("**жирный** и *курсив*")).toBe("<strong>жирный</strong> и <em>курсив</em>");
  });

  it("escapes raw HTML in text", () => {
    expect(renderInline("<script>alert(1)</script>")).not.toContain("<script>");
  });
});

describe("renderMarkdown", () => {
  it("renders headings, paragraphs and lists", () => {
    const out = renderMarkdown("## Заголовок\n\nТекст\n\n- один\n- два");
    expect(out).toContain("<h2>Заголовок</h2>");
    expect(out).toContain("<p>Текст</p>");
    expect(out).toContain("<ul><li>один</li><li>два</li></ul>");
  });

  it("closes an open list before a following paragraph", () => {
    const out = renderMarkdown("- один\n\nпосле");
    expect(out).toBe("<ul><li>один</li></ul><p>после</p>");
  });

  it("never emits a raw script tag from document content", () => {
    const out = renderMarkdown('# <script>alert(1)</script>\n\n<img src=x onerror="alert(1)">');
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("<img");
  });
});
