import type { Metadata } from 'next';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import McpView from '@/components/desktop/mcp/McpView';

export const metadata: Metadata = {
  title: 'MCP',
  description:
    'Connect your Focalyst data to ChatGPT, Claude, Gemini or any AI assistant you already use.',
};

export default function McpPreviewPage() {
  return (
    <PublicLayout strongAmbient>
      <McpView />
    </PublicLayout>
  );
}
