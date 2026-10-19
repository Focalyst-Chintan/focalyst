export function toEditorHTML(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return '<p></p>';
  // Convert mobile plain-text checklists "- [ ] " or "- [x] " if present
  if (!/<[a-z][\s\S]*>/i.test(raw)) {
    const lines = raw.split(/\r?\n/);
    return lines
      .map((line) => {
        const escaped = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        if (/^[-*]\s*[x]\s+/i.test(line)) {
          const text = escaped.replace(/^[-*]\s*[x]\s+/i, '');
          return `<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"></label><div><p>${text}</p></div></li></ul>`;
        }
        if (/^[-*]\s*\[\s?\]\s+/i.test(line)) {
          const text = escaped.replace(/^[-*]\s*\[\s?\]\s+/i, '');
          return `<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"></label><div><p>${text}</p></div></li></ul>`;
        }
        return `<p>${escaped}</p>`;
      })
      .join('');
  }
  return raw;
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
