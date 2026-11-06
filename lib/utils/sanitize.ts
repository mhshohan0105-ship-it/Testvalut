import "server-only";
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = ["p", "br", "div", "strong", "b", "em", "i", "ul", "ol", "li", "code", "pre"];

/** Rich text is stored and rendered as HTML, so only this short list of tags, with no attributes, gets through. */
export function sanitizeRichText(html: string) {
  return sanitizeHtml(html, { allowedTags: ALLOWED_TAGS, allowedAttributes: {} }).trim();
}

export function richTextToPlain(html: string) {
  const withBreaks = html.replace(/<\/(p|div|li|pre)>|<br\s*\/?>/gi, "\n");
  const text = sanitizeHtml(withBreaks, { allowedTags: [], allowedAttributes: {} });
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Returns null for markup with no visible text, such as the `<br>` an emptied editor leaves behind. */
export function normalizeRichText(html: string | null | undefined) {
  if (!html) return null;
  const clean = sanitizeRichText(html);
  return richTextToPlain(clean) ? clean : null;
}

export function plainToRichText(text: string) {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => `<p>${line}</p>`)
    .join("");
}
