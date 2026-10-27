import type { NextConfig } from "next";

// Environment Variable Check
const requiredEnvs = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const isMobile = process.env.EXPORT_MOBILE === 'true';

if (!isMobile) {
  const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
  if (missingEnvs.length > 0) {
    throw new Error(`CRITICAL: Missing required environment variables: ${missingEnvs.join(', ')}. The app will refuse to start.`);
  }
}

// Security Headers
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "connect-src 'self' https: https://app.kit.com wss: wss://*.supabase.co",
  "form-action 'self' https://app.kit.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_BUILD_TARGET: process.env.EXPORT_MOBILE === 'true' ? 'mobile' : 'web',
  },
  output: isMobile ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (isMobile) return [];
    return [
      { source: '/.well-known/oauth-protected-resource', destination: '/api/mcp/well-known' },
      { source: '/.well-known/oauth-protected-resource/:path*', destination: '/api/mcp/well-known' },
    ];
  },
  async headers() {
    if (isMobile) return [];
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // MCP and its discovery documents set their own CORS headers
        source: '/((?!api/mcp|\\.well-known/).*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' },
        ],
      },
    ];
  },
};


export default nextConfig;
