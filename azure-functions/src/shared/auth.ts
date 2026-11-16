import crypto from 'crypto';

export function verifyCronSecret(headerValue: string | null | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !headerValue) {
    return false;
  }

  const secretBuffer = Buffer.from(secret, 'utf8');
  const headerBuffer = Buffer.from(headerValue, 'utf8');

  if (secretBuffer.length !== headerBuffer.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(secretBuffer, headerBuffer);
  } catch {
    return false;
  }
}
