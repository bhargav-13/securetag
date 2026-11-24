import { API_URL } from './config';
import { supabase } from './supabase';
import type { Contact, LegacyItem, LookupResult, Me, NotifyPrefs, ScanStatus, Tag } from './types';

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;
  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (init.auth !== false) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method || 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("Can't reach SecureTag. Check your internet connection and try again.", 0);
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    throw new ApiError(
      (data && typeof data.error === 'string' && data.error) || `Something went wrong (${res.status}). Please try again.`,
      res.status,
      (data && data.fieldErrors) || {}
    );
  }
  return data as T;
}

export type FormValues = Record<string, string | string[]>;

export const api = {
  me: () => request<Me>('/api/mobile/me'),
  updateProfile: (body: { full_name: string; phone: string }) =>
    request<{ ok: true; fullName: string; phone: string | null }>('/api/mobile/me', { method: 'PATCH', body }),

  lookup: (code: string, opts: { kind?: 'vehicle' | 'legacy'; lat?: number; lng?: number; os?: string; audit?: boolean } = {}) => {
    const q = new URLSearchParams({ code });
    if (opts.audit === false) q.set('audit', '0');
    if (opts.kind) q.set('kind', opts.kind);
    if (opts.lat != null && opts.lng != null) {
      q.set('lat', String(opts.lat));
      q.set('lng', String(opts.lng));
    }
    if (opts.os) q.set('os', opts.os);
    return request<LookupResult>(`/api/mobile/lookup?${q.toString()}`);
  },

  claimTag: (id: string, values: FormValues) =>
    request<{ ok: true; tag: Tag }>(`/api/mobile/tags/${encodeURIComponent(id)}`, { method: 'POST', body: values }),
  updateTag: (id: string, values: FormValues) =>
    request<{ ok: true; tag: Tag }>(`/api/mobile/tags/${encodeURIComponent(id)}`, { method: 'PUT', body: values }),
  setLostMode: (id: string, on: boolean) =>
    request<{ ok: true }>(`/api/mobile/tags/${encodeURIComponent(id)}`, { method: 'PATCH', body: { on } }),

  claimItem: (code: string, values: FormValues) =>
    request<{ ok: true }>(`/api/mobile/legacy/${encodeURIComponent(code)}`, { method: 'POST', body: values }),
  updateItem: (code: string, values: FormValues) =>
    request<{ ok: true }>(`/api/mobile/legacy/${encodeURIComponent(code)}`, { method: 'PUT', body: values }),
  setItemLostMode: (code: string, on: boolean) =>
    request<{ ok: true }>(`/api/mobile/legacy/${encodeURIComponent(code)}`, { method: 'PATCH', body: { on } }),

  createScan: (body: {
    tagId: string;
    reason: string;
    message?: string;
    lat?: number | null;
    lng?: number | null;
    pushToken?: string | null;
  }) =>
    request<{ requestId: string; status: 'pending' | 'auto'; contact?: Contact }>('/api/mobile/scan', {
      method: 'POST',
      body,
      auth: false,
    }),
  scanStatus: async (requestId: string): Promise<ScanStatus> => {
    try {
      return await request<ScanStatus>(`/api/scan/status/${encodeURIComponent(requestId)}`, { auth: false });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return { status: 'notfound' };
      throw e;
    }
  },
  shareLocation: (requestId: string, lat: number, lng: number) =>
    request<{ ok: true }>(`/api/mobile/scan/${encodeURIComponent(requestId)}`, {
      method: 'POST',
      body: { lat, lng },
      auth: false,
    }),
  respond: (requestId: string, decision: 'accepted' | 'declined') =>
    request<{ ok: true }>(`/api/mobile/scan/${encodeURIComponent(requestId)}`, { method: 'POST', body: { decision } }),

  setPrefs: (changes: Partial<NotifyPrefs>) =>
    request<{ ok: true; prefs: NotifyPrefs }>('/api/mobile/prefs', { method: 'PUT', body: changes }),

  registerPush: (token: string) => request<{ ok: true }>('/api/mobile/push', { method: 'POST', body: { token } }),
  unregisterPush: (token: string) => request<{ ok: true }>('/api/mobile/push', { method: 'DELETE', body: { token } }),
};

export type { LegacyItem };
