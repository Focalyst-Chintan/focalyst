import { NextResponse } from 'next/server';
import { MCP_RESOURCE_URL, SUPABASE_ISSUER } from '@/lib/mcp/config';

// RFC 9728 protected resource metadata. Served at /.well-known/oauth-protected-resource[/api/mcp]
// through rewrites in next.config.ts, so `resource` is fixed rather than taken from the request URL.
const body = {
  resource: MCP_RESOURCE_URL,
  authorization_servers: [SUPABASE_ISSUER],
  bearer_methods_supported: ['header'],
  resource_name: 'Focalyst',
  resource_documentation: 'https://focalyst.online/mcp-preview',
};

export async function GET() {
  return NextResponse.json(body, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
