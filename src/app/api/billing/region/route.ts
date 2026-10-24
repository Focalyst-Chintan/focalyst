import { NextResponse, type NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const country = req.headers.get('x-vercel-ip-country') ?? '';
  return NextResponse.json(
    { currency: country === 'IN' ? 'INR' : 'USD' },
    { headers: { 'Cache-Control': 'private, max-age=3600' } },
  );
}
