/**
 * API client utilities and base URL config.
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.shelterscan.example';

export interface ApiError {
  code: string;
  message: string;
  retry_suggested?: boolean;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  options?: { timeoutMs?: number }
): Promise<T> {
  const controller = new AbortController();
  const timeout = options?.timeoutMs ?? 15000;
  const id = setTimeout(() => controller.abort(), timeout);

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(id);

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: ApiError = {
      code: data.error?.code ?? 'UNKNOWN',
      message: data.error?.message ?? res.statusText,
      retry_suggested: data.error?.retry_suggested,
    };
    throw err;
  }
  return data as T;
}

export function getAnalyzeEndpoint(): string {
  return `${process.env.EXPO_PUBLIC_API_URL ?? ''}/api/analyze`.replace(/\/\/api/, '/api');
}
