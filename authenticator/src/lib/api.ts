import { getToken } from './storage';

const BASE_URL = 'https://sso.gerege.mn';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new APIError(res.status, body.error || body.message || 'Request failed');
  }

  return res.json();
}

export class APIError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Auth
export function sendEmailOTP(email: string) {
  return request<{ message: string; email: string }>('/api/auth/email/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyEmailOTP(email: string, otp: string) {
  return request<{ message: string; code: string; mfa_required: boolean }>(
    '/api/auth/email/verify-otp',
    {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }
  );
}

export function exchangeToken(code: string) {
  return request<{ token: string; mfa_required: boolean }>(
    '/api/auth/exchange-token',
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    }
  );
}

export function getMe() {
  return request<{
    gen_id: string;
    email: string;
    picture: string;
    verified: boolean;
    mfa_enabled: boolean;
    mfa_level: number;
  }>('/api/auth/me');
}

// QR Login
export function markQRScanned(sessionId: string) {
  return request<{ message: string }>('/api/auth/qr/scan', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export function approveQR(sessionId: string) {
  return request<{ message: string }>('/api/auth/qr/approve', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

// MFA TOTP (server-side setup)
export function setupTOTP() {
  return request<{
    secret: string;
    qr_code_uri: string;
    issuer: string;
    account: string;
  }>('/api/auth/mfa/totp/setup', { method: 'POST' });
}

export function verifyTOTPSetup(code: string) {
  return request<{ message: string }>('/api/auth/mfa/totp/verify-setup', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}
