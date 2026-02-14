import { TOTP } from 'otpauth';

export function generateTOTPCode(secret: string): string {
  const totp = new TOTP({
    secret,
    digits: 6,
    period: 30,
    algorithm: 'SHA1',
  });
  return totp.generate();
}

export function getRemainingSeconds(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

export function parseTOTPUri(uri: string): {
  issuer: string;
  account: string;
  secret: string;
} | null {
  try {
    const url = new URL(uri);
    if (url.protocol !== 'otpauth:') return null;
    if (url.hostname !== 'totp') return null;

    const secret = url.searchParams.get('secret');
    if (!secret) return null;

    const issuer = url.searchParams.get('issuer') || '';
    // Path format: /Issuer:account or /account
    const path = decodeURIComponent(url.pathname).replace(/^\//, '');
    const parts = path.split(':');
    const account = parts.length > 1 ? parts[1].trim() : parts[0].trim();

    return { issuer, account, secret };
  } catch {
    return null;
  }
}
