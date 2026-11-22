export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Lightweight Markdown-to-HTML converter for PDF export.
 * Converts ### headings to <h3>, **bold** to <strong>,
 * consecutive `- ` lines to <ul><li>...</li></ul>, and paragraphs/line breaks to <p>/<br/>.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  const lines = escapeHtml(markdown).replace(/\r\n/g, '\n').split('\n');
  const htmlParts: string[] = [];
  let inList = false;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      htmlParts.push(`<p>${paragraphLines.join('<br/>')}</p>`);
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushParagraph();
      const level = headingMatch[1].length;
      const tag = level === 1 ? 'h2' : 'h3';
      htmlParts.push(`<${tag}>${formatInlineMarkdown(headingMatch[2])}</${tag}>`);
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!inList) {
        htmlParts.push('<ul>');
        inList = true;
      }
      htmlParts.push(`<li>${formatInlineMarkdown(bulletMatch[1])}</li>`);
      continue;
    }

    flushList();
    paragraphLines.push(formatInlineMarkdown(trimmed));
  }

  flushList();
  flushParagraph();

  return htmlParts.join('\n');
}
