import React from 'react';
import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { BlogComparison } from '@/lib/blog/source';
import { APP_CTA_URL, WEB_CTA_URL, ctaUrl } from '@/lib/blog/constants';

export function headingId(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function textOf(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

export function extractHeadings(md: string) {
  return md
    .split('\n')
    .filter((l) => l.startsWith('## '))
    .map((l) => {
      const text = l.slice(3).replace(/[*_`[\]]/g, '').replace(/\(.*?\)/g, '').trim();
      return { text, id: headingId(text) };
    });
}

const components: Components = {
  h2: ({ children }) => <h2 id={headingId(textOf(children))}>{children}</h2>,
  a: ({ href = '', children }) => {
    if (href.startsWith('/') || href.startsWith('#')) return <Link href={href}>{children}</Link>;
    return (
      <a href={href} target="_blank" rel="noopener">
        {children}
      </a>
    );
  },
  table: ({ children }) => (
    <div className="fx-blog-table">
      <table>{children}</table>
    </div>
  ),
  img: () => null,
};

function Markdown({ md }: { md: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
      {md}
    </ReactMarkdown>
  );
}

export function InlineCta({ slug }: { slug: string }) {
  return (
    <aside className="glass liquid not-prose my-10 rounded-[20px] p-6">
      <div className="font-display text-[24px] leading-[30px] text-ink">
        Plan it, focus on it, track it.
      </div>
      <p className="mt-2 text-[15px] leading-[24px] text-ink-2">
        Focalyst brings your tasks, focus sessions, app blocking and habits into one app.
      </p>
      <CtaButtons slug={slug} medium="inline" />
    </aside>
  );
}

export function CtaButtons({ slug, medium }: { slug: string; medium: 'inline' | 'end' }) {
  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
      <a
        href={ctaUrl(APP_CTA_URL, medium, slug)}
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-[15px] font-semibold text-white no-underline transition-colors hover:bg-primary-hover sm:w-auto"
      >
        Get the app
      </a>
      <a
        href={ctaUrl(WEB_CTA_URL, medium, slug)}
        className="frost inline-flex h-11 w-full items-center justify-center rounded-full px-6 text-[15px] font-semibold text-ink no-underline sm:w-auto"
      >
        Use it on the web
      </a>
    </div>
  );
}

export function ComparisonTable({ comparison }: { comparison: BlogComparison }) {
  const [, ...heads] = comparison.columns;
  return (
    <div className="fx-blog-table my-8">
      <table>
        <thead>
          <tr>
            <th>{comparison.columns[0] || 'Job to be done'}</th>
            {heads.map((h, i) => (
              <th key={i} className={h === 'Focalyst' ? 'text-primary-text' : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Splits the body into H2 sections so the comparison table lands under the 2nd H2
// and the [[cta]] line becomes the inline CTA card
export default function ArticleBody({
  md,
  slug,
  comparison,
}: {
  md: string;
  slug: string;
  comparison: BlogComparison | null;
}) {
  const sections = md.split(/^(?=## )/m);
  const out: React.ReactNode[] = [];
  let h2Count = 0;
  let pending = comparison;
  sections.forEach((section, si) => {
    if (section.startsWith('## ')) h2Count++;
    const pieces = section.split(/^\s*\[\[cta\]\]\s*$/m);
    pieces.forEach((piece, pi) => {
      if (pi > 0) out.push(<InlineCta key={`cta-${si}-${pi}`} slug={slug} />);
      if (piece.trim()) out.push(<Markdown key={`md-${si}-${pi}`} md={piece} />);
    });
    if (pending && h2Count === 2 && section.startsWith("## ") && pending.rows?.length) {
      out.push(<ComparisonTable key="comparison" comparison={pending} />);
      pending = null;
    }
  });
  return <>{out}</>;
}
