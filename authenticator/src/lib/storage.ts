import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'gerege_auth_token';
const TOTP_ACCOUNTS_KEY = 'gerege_totp_accounts';

export interface TOTPAccount {
  id: string;
  issuer: string;
  email: string;
  secret: string;
  createdAt: number;
}

// JWT Token
export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// TOTP Accounts
export async function getTOTPAccounts(): Promise<TOTPAccount[]> {
  const raw = await SecureStore.getItemAsync(TOTP_ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveTOTPAccount(account: Omit<TOTPAccount, 'id' | 'createdAt'>): Promise<TOTPAccount> {
  const accounts = await getTOTPAccounts();
  const newAccount: TOTPAccount = {
    ...account,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    createdAt: Date.now(),
  };
  accounts.push(newAccount);
  await SecureStore.setItemAsync(TOTP_ACCOUNTS_KEY, JSON.stringify(accounts));
  return newAccount;
}

export async function removeTOTPAccount(id: string): Promise<void> {
  const accounts = await getTOTPAccounts();
  const filtered = accounts.filter((a) => a.id !== id);
  await SecureStore.setItemAsync(TOTP_ACCOUNTS_KEY, JSON.stringify(filtered));
}
