import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import TypographicCover from './TypographicCover';
import ArticleBody, { CtaButtons, extractHeadings } from './ArticleBody';
import PostCard from './PostCard';
import ShareRow from './ShareRow';
import { formatDate, type BlogPost } from '@/lib/blog/source';
import { AI_DISCLOSURE, PILLARS, SITE_URL } from '@/lib/blog/constants';

const DAY = 24 * 60 * 60 * 1000;

export default function ArticleLayout({ post, related }: { post: BlogPost; related: BlogPost[] }) {
  const hub = post.pillar ? PILLARS[post.pillar] : null;
  const headings = extractHeadings(post.contentMd ?? '');
  const updated =
    new Date(post.updatedIso).getTime() - new Date(post.publishedIso).getTime() > DAY
      ? formatDate(post.updatedIso)
      : null;

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-ink-3">
          <Link href="/blog" className="hover:text-ink">
            Blog
          </Link>
          {hub && post.pillar ? (
            <>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <Link href={`/blog/topics/${post.pillar}`} className="hover:text-ink">
                {hub.name}
              </Link>
            </>
          ) : null}
        </nav>

        <header className="mt-6">
          <h1 className="font-display text-[clamp(34px,5vw,52px)] leading-[1.1] text-ink">{post.title}</h1>
          <p className="mt-4 text-[18px] leading-[28px] text-ink-2">{post.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
            <span>{post.author}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.publishedIso}>{post.publishedAt}</time>
            {updated ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Updated <time dateTime={post.updatedIso}>{updated}</time>
                </span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes} min read</span>
          </div>
        </header>

        {post.quickAnswer ? (
          <section
            aria-label="Quick answer"
            className="frost mt-8 rounded-[20px] border-l-[3px] border-l-primary p-5"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary-text">
              Quick answer
            </div>
            <p className="mt-2 text-[17px] leading-[28px] text-ink">{post.quickAnswer}</p>
          </section>
        ) : null}

        {headings.length > 2 ? (
          <details className="frost group mt-4 rounded-[16px] px-5 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold text-ink">
              On this page
              <ChevronDown className="h-4 w-4 text-ink-3 transition-transform group-open:rotate-180" />
            </summary>
            <ol className="mt-3 space-y-2 pb-1 text-[14px] text-ink-2">
              {headings.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} className="hover:text-primary-text">
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </details>
        ) : null}

        <div className="mt-8">
          {post.coverImageUrl ? null : <TypographicCover title={post.title} pillar={post.pillar} />}
        </div>

        <article className="fx-article fx-blog mt-8">
          <ArticleBody md={post.contentMd ?? ''} slug={post.slug} comparison={post.comparison} />
        </article>

        {post.faq.length ? (
          <section className="mt-14">
            <h2 className="font-display text-[28px] leading-tight text-ink">Frequently asked questions</h2>
            <div className="mt-5 space-y-3">
              {post.faq.map((item) => (
                <details key={item.q} className="frost group rounded-[16px] px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[16px] font-semibold text-ink">
                    {item.q}
                    <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-[15px] leading-[26px] text-ink-2">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {post.sources.length ? (
          <section className="mt-14">
            <h2 className="font-display text-[28px] leading-tight text-ink">Sources</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-[24px] text-ink-2">
              {post.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener"
                    className="text-primary-text underline underline-offset-[3px]"
                  >
                    {s.publisher ? `${s.publisher}: ` : ''}
                    {s.title}
                  </a>
                  {s.checked ? (
                    <span className="ml-2 text-[13px] text-ink-3">checked {formatDate(s.checked)}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className="glass liquid mt-14 rounded-[28px] p-6 md:p-10">
          <h2 className="font-display text-[30px] leading-tight text-ink">Own your time with Focalyst</h2>
          <p className="mt-2 text-[15px] leading-[24px] text-ink-2">
            Focalyst is free to start on iPhone, Android and the web.
          </p>
          <CtaButtons slug={post.slug} medium="end" />
        </section>

        <section className="mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[28px] leading-tight text-ink">More on this</h2>
            {hub && post.pillar ? (
              <Link
                href={`/blog/topics/${post.pillar}`}
                className="text-[14px] font-medium text-primary-text hover:underline"
              >
                All posts in {hub.name}
              </Link>
            ) : null}
          </div>
          {related.length ? (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {related.map((r) => (
                <PostCard key={r.slug} post={r} />
              ))}
            </div>
          ) : null}
        </section>

        {post.aiAssisted ? <p className="mt-10 text-[13px] leading-[20px] text-ink-3">{AI_DISCLOSURE}</p> : null}

        <ShareRow url={`${SITE_URL}/blog/${post.slug}`} title={post.title} />
      </div>
    </PublicLayout>
  );
}
