export const MCP_RESOURCE_URL = process.env.MCP_RESOURCE_URL || 'https://focalyst.online/api/mcp';
export const SUPABASE_ISSUER = `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')}/auth/v1`;
export const MCP_METADATA_PATH = '/.well-known/oauth-protected-resource/api/mcp';
export const MCP_SERVER_NAME = 'Focalyst';

// Absolute metadata URL, always on the public host (never a preview or request host)
export const MCP_METADATA_URL = `${new URL(MCP_RESOURCE_URL).origin}${MCP_METADATA_PATH}`;

export const MCP_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Mcp-Session-Id',
};

// Public copy only. Signed-in screens and tool messages use monthly_credits from the database.
export const MCP_PRO_MONTHLY_CREDITS = 500;
export const MCP_DAILY_BONUS = 10;
