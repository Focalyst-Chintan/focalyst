import type { Metadata } from 'next';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import McpView from '@/components/desktop/mcp/McpView';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumb } from '@/lib/seo/schema';

export const metadata: Metadata = {
  title: 'MCP: connect Focalyst to your AI',
  description:
    'Connect your Focalyst tasks, habits and focus data to ChatGPT, Claude or Gemini and get a productivity coach that knows you. Included with Focalyst Pro.',
  alternates: {
    canonical: 'https://focalyst.online/mcp-preview',
  },
  openGraph: {
    title: 'MCP: connect Focalyst to your AI | Focalyst',
    description:
      'Connect your Focalyst tasks, habits and focus data to ChatGPT, Claude or Gemini and get a productivity coach that knows you. Included with Focalyst Pro.',
    url: 'https://focalyst.online/mcp-preview',
  },
};

export default function McpPreviewPage() {
  const breadcrumbData = breadcrumb([
    { name: 'Focalyst', path: '/' },
    { name: 'MCP', path: '/mcp-preview' },
  ]);

  return (
    <PublicLayout strongAmbient>
      <JsonLd data={breadcrumbData} />
      <McpView />
    </PublicLayout>
  );
}
