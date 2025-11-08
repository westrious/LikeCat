import { marked } from "marked";
import DOMPurify from "dompurify";

// Helper to render markdown safely (marked may return string or Promise<string> depending on build)
export const renderMarkdownToHtml = (s: string) => {
  // Ensure we always pass a string to DOMPurify
  const html = String(marked.parse(s || ""));
  return DOMPurify.sanitize(html);
};
