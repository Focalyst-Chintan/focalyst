import { getFullPosts, stripFactLabels } from '@/lib/blog/source';
import { SITE_URL } from '@/lib/blog/constants';
import { BASE } from '@/lib/blog/llms';

export const revalidate = 3600;

function body(md: string) {
  return stripFactLabels(md)
    .replace(/^\s*\[\[cta\]\]\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function GET() {
  const posts = await getFullPosts(20);
  const parts = posts.map((p) => {
    const out = [
      `## ${p.title}`,
      '',
      `URL: ${SITE_URL}/blog/${p.slug}`,
      `Published: ${p.publishedIso.slice(0, 10)}${p.updatedIso.slice(0, 10) !== p.publishedIso.slice(0, 10) ? ` (updated ${p.updatedIso.slice(0, 10)})` : ''}`,
    ];
    if (p.quickAnswer) out.push('', `Quick answer: ${p.quickAnswer}`);
    out.push('', body(p.contentMd ?? '').replace(/^## /gm, '### '));
    if (p.faq.length >= 2) {
      out.push('', '### Frequently asked questions');
      for (const f of p.faq) out.push('', `**${f.q}**`, '', f.a);
    }
    if (p.sources.length) {
      out.push('', '### Sources');
      p.sources.forEach((s, i) => out.push(`${i + 1}. [${s.publisher ? `${s.publisher}: ` : ''}${s.title}](${s.url})`));
    }
    return out.join('\n');
  });

  const text = `${BASE}

# The Focalyst Journal: full text of the latest ${posts.length} posts

${parts.join('\n\n---\n\n') || 'New posts are published daily.'}
`;
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
