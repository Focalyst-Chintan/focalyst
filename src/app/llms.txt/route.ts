import { getPosts } from '@/lib/blog/source';
import { PILLARS, PILLAR_KEYS, SITE_URL } from '@/lib/blog/constants';
import { BASE } from '@/lib/blog/llms';

export const revalidate = 3600;



export async function GET() {
  const { posts } = await getPosts({ limit: 50 });
  const hubs = PILLAR_KEYS.map(
    (k) => `- [${PILLARS[k].name}](${SITE_URL}/blog/topics/${k}): ${PILLARS[k].intro}`
  ).join('\n');
  const journal = posts.length
    ? posts.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.description}`).join('\n')
    : '- New posts are published daily.';

  const body = `${BASE}

## Journal
The Focalyst Journal: [${SITE_URL}/blog](${SITE_URL}/blog), RSS at ${SITE_URL}/blog/rss.xml
Full text of the latest posts: [${SITE_URL}/llms-full.txt](${SITE_URL}/llms-full.txt)

### Topic hubs
${hubs}

### Latest posts
${journal}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
