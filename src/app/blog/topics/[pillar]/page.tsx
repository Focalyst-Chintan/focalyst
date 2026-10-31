import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import PostCard from '@/components/desktop/blog/PostCard';
import PillarChips from '@/components/desktop/blog/PillarChips';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumb } from '@/lib/seo/schema';
import { getPosts, PAGE_SIZE } from '@/lib/blog/source';
import { PILLARS, PILLAR_KEYS, SITE_URL, isPillar } from '@/lib/blog/constants';

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return PILLAR_KEYS.map((pillar) => ({ pillar }));
}

type Props = {
  params: Promise<{ pillar: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pillar } = await params;
  if (!isPillar(pillar)) return {};
  const hub = PILLARS[pillar];
  const url = `${SITE_URL}/blog/topics/${pillar}`;
  return {
    title: hub.name,
    description: hub.intro,
    alternates: { canonical: url },
    openGraph: { title: `${hub.name} | Focalyst`, description: hub.intro, url },
  };
}

export default async function PillarHubPage({ params, searchParams }: Props) {
  const { pillar } = await params;
  if (!isPillar(pillar)) notFound();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { posts, total } = await getPosts({ pillar, page });
  const hub = PILLARS[pillar];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PublicLayout>
      <JsonLd
        data={breadcrumb([
          { name: 'Blog', path: '/blog' },
          { name: hub.name, path: `/blog/topics/${pillar}` },
        ])}
      />
      <div className="mx-auto w-full max-w-[1200px] px-5 py-8 sm:px-6">
        <section className="mx-auto max-w-[760px] pt-10 text-center">
          <Link href="/blog" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3 hover:text-ink">
            The Focalyst Journal
          </Link>
          <h1 className="mt-3 font-display text-[clamp(36px,5vw,52px)] leading-[1.1] text-ink">{hub.name}</h1>
          <p className="mx-auto mt-4 max-w-[620px] text-[17px] leading-[28px] text-ink-2">{hub.intro}</p>
        </section>

        <div className="mt-8">
          <PillarChips active={pillar} />
        </div>

        {posts.length ? (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-center text-[15px] text-ink-2">The first posts in this topic are on the way.</p>
        )}

        {pages > 1 ? (
          <nav aria-label="Pages" className="mt-10 flex items-center justify-center gap-3 text-[14px]">
            {page > 1 ? (
              <Link href={`/blog/topics/${pillar}?page=${page - 1}`} className="frost rounded-full px-4 py-2 text-ink">
                Newer
              </Link>
            ) : null}
            <span className="text-ink-3">
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link href={`/blog/topics/${pillar}?page=${page + 1}`} className="frost rounded-full px-4 py-2 text-ink">
                Older
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </PublicLayout>
  );
}
