import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleLayout from '@/components/desktop/blog/ArticleLayout';
import { JsonLd } from '@/components/seo/JsonLd';
import { getAllSlugs, getPost, getRelated, type BlogPost } from '@/lib/blog/source';
import { PILLARS, SITE_URL } from '@/lib/blog/constants';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.slice(0, 200).map(({ slug }) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Post not found' };
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: post.metaTitle || post.title,
    description: post.description,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords].filter(Boolean) as string[],
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: `${post.title} | Focalyst`,
      description: post.description,
      publishedTime: post.publishedIso,
      modifiedTime: post.updatedIso,
      section: post.pillar ? PILLARS[post.pillar].name : undefined,
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | Focalyst`,
      description: post.description,
    },
  };
}

function graph(post: BlogPost) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const hub = post.pillar ? PILLARS[post.pillar] : null;
  const nodes: object[] = [
    {
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: post.title,
      description: post.description,
      datePublished: post.publishedIso,
      dateModified: post.updatedIso,
      author: { '@type': 'Organization', name: 'Focalyst', url: SITE_URL },
      publisher: {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Focalyst',
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/small-logo.png` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      image: `${url}/opengraph-image`,
      keywords: [post.primaryKeyword, ...post.secondaryKeywords].filter(Boolean).join(', '),
      articleSection: hub?.name,
      inLanguage: 'en',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Blog', item: `${SITE_URL}/blog` },
        ...(hub && post.pillar
          ? [{ '@type': 'ListItem', position: 2, name: hub.name, item: `${SITE_URL}/blog/topics/${post.pillar}` }]
          : []),
        { '@type': 'ListItem', position: hub ? 3 : 2, name: post.title, item: url },
      ],
    },
  ];
  if (post.faq.length) {
    nodes.push({
      '@type': 'FAQPage',
      mainEntity: post.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }
  if (post.kind === 'comparison' && post.comparison?.columns?.length) {
    const apps = post.comparison.columns.slice(1).filter(Boolean);
    nodes.push({
      '@type': 'ItemList',
      name: post.title,
      itemListElement: apps.map((name, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: { '@type': 'SoftwareApplication', name, applicationCategory: 'ProductivityApplication' },
      })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': nodes };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const related = await getRelated(post);
  return (
    <>
      <JsonLd data={graph(post)} />
      <ArticleLayout post={post} related={related} />
    </>
  );
}
