/**
 * Minimal markdown renderer for admin-authored content pages (ADR 007:
 * markdown + preview, no client-side dependency). Server-rendered output is
 * injected via dangerouslySetInnerHTML, so escaping is the security boundary.
 *
 * Not a full CommonMark implementation by design — headings, paragraphs,
 * lists, bold/italic, and external links only.
 *
 * Escaping order matters: text is HTML-escaped FIRST (including quotes), and
 * link URLs are then re-validated against a strict allowlist before being
 * placed in an attribute. A URL that fails the allowlist degrades to its
 * link text, so no unvalidated value ever reaches `href`.
 */

const TEXT_ESCAPES: [RegExp, string][] = [
  [/&/g, "&amp;"],
  [/</g, "&lt;"],
  [/>/g, "&gt;"],
  [/"/g, "&quot;"],
  [/'/g, "&#39;"],
];

// http(s) only, and no character that can terminate an attribute or a tag.
const SAFE_URL_RE = /^https?:\/\/[^\s"'<>()]+$/;

export function escapeHtml(text: string): string {
  return TEXT_ESCAPES.reduce((acc, [re, replacement]) => acc.replace(re, replacement), text);
}

export function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, url: string) => {
      // `url` is already HTML-escaped; un-escape the entities we introduced so
      // the allowlist sees the real characters, then decide.
      const raw = url
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
      if (!SAFE_URL_RE.test(raw)) return label;
      return `<a href="${url}" rel="nofollow noop noreferrer">${label}</a>`;
    });
}

export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("### ")) {
      closeList();
      html.push(`<h3>${renderInline(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      closeList();
      html.push(`<h2>${renderInline(trimmed.slice(3))}</h2>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${renderInline(trimmed.replace(/^[-*]\s+/, ""))}</li>`);
    } else if (trimmed === "") {
      closeList();
    } else {
      closeList();
      html.push(`<p>${renderInline(trimmed)}</p>`);
    }
  }
  closeList();
  return html.join("");
}
