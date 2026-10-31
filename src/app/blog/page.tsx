import type { Metadata } from 'next';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import KitWaitlist from '@/components/desktop/mcp/KitWaitlist';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumb } from '@/lib/seo/schema';
import FeaturedPostCard from '@/components/desktop/blog/FeaturedPostCard';
import PostCard from '@/components/desktop/blog/PostCard';
import PillarChips from '@/components/desktop/blog/PillarChips';
import { getPosts } from '@/lib/blog/source';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Ideas on focus, habits and productivity from the Focalyst team.',
  alternates: {
    canonical: 'https://focalyst.online/blog',
    types: { 'application/rss+xml': 'https://focalyst.online/blog/rss.xml' },
  },
  openGraph: {
    title: 'Blog | Focalyst',
    description:
      'Ideas on focus, habits and productivity from the Focalyst team.',
    url: 'https://focalyst.online/blog',
  },
};

export default async function BlogPage() {
  const { posts } = await getPosts({ limit: 25 });
  const [featured, ...rest] = posts;
  const breadcrumbData = breadcrumb([
    { name: 'Focalyst', path: '/' },
    { name: 'Blog', path: '/blog' },
  ]);

  return (
    <PublicLayout>
      <JsonLd data={breadcrumbData} />
      <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6">
        {/* Hero */}
        <section className="fx-reveal mx-auto max-w-[760px] pt-14 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            The Focalyst Journal
          </div>
          <h1 className="mt-3 font-display text-[clamp(40px,5vw,56px)] leading-[1.08] text-ink">
            Notes on focus, habits and{' '}
            <em className="italic">owning your time</em>.
          </h1>
          <p className="mx-auto mt-4 max-w-[620px] text-[17px] leading-[28px] text-ink-2">
            Essays on focus, study systems and behaviour science from the team behind Focalyst.
          </p>
        </section>

        <div className="fx-reveal mt-8" style={{ ['--fx-delay' as string]: '60ms' }}>
          <PillarChips />
        </div>

        {featured ? (
          <>
            <div className="fx-reveal mt-12" style={{ ['--fx-delay' as string]: '120ms' }}>
              <FeaturedPostCard post={featured} />
            </div>
            {rest.length ? (
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <section
            className="fx-reveal glass liquid mx-auto mt-12 max-w-[680px] rounded-[28px] p-8 text-center md:p-12"
            style={{ ['--fx-delay' as string]: '120ms' }}
          >
            <h2 className="font-display text-[32px] leading-tight text-ink">
              First posts are on the way.
            </h2>
            <p className="mx-auto mb-6 mt-2 max-w-[500px] text-[15px] leading-[24px] text-ink-2">
              Thoughtful, practical writing on doing deep work in a distracted world. Be the first to read it.
            </p>
            <div className="mx-auto max-w-[480px]">
              <KitWaitlist buttonLabel="Notify me" />
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  );
}
