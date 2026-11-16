import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ indexnowKey: string }> }
) {
  const { indexnowKey } = await params;
  const configuredKey = process.env.INDEXNOW_KEY || '826f91132875a9c1547b5971fa84f5cf';

  // Check if requested filename matches {configuredKey}.txt
  if (indexnowKey === `${configuredKey}.txt`) {
    return new NextResponse(configuredKey, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  return new NextResponse('Not found', { status: 404 });
}
