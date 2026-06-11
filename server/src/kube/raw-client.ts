import fetch, { type RequestInit, type Response } from 'node-fetch';
import { ApiException, type KubeConfig } from '@kubernetes/client-node';

/**
 * Authenticated HTTP access to arbitrary API server paths for the things the
 * typed clients can't do generically: discovery, dynamic resource list/get,
 * subresources, and watch streams. Auth (incl. exec-plugin token refresh) is
 * re-applied per request via KubeConfig.applyToFetchOptions.
 */
export class RawClient {
  constructor(private kc: KubeConfig) {}

  private serverUrl(): string {
    const cluster = this.kc.getCurrentCluster();
    if (!cluster) throw new Error('no active cluster in kubeconfig context');
    return cluster.server.replace(/\/$/, '');
  }

  async request(path: string, init?: { method?: string; body?: string; headers?: Record<string, string>; signal?: AbortSignal }): Promise<Response> {
    const requestInit = (await this.kc.applyToFetchOptions({})) as RequestInit;
    requestInit.method = init?.method ?? 'GET';
    if (init?.body !== undefined) requestInit.body = init.body;
    if (init?.signal) requestInit.signal = init.signal;
    const headers = requestInit.headers as Record<string, string> | undefined;
    requestInit.headers = { ...(headers ?? {}), ...(init?.headers ?? {}) };
    return fetch(this.serverUrl() + path, requestInit);
  }

  /** GET/mutate a JSON API path; throws ApiException on non-2xx. */
  async json<T = unknown>(path: string, init?: { method?: string; body?: string; headers?: Record<string, string>; signal?: AbortSignal }): Promise<T> {
    const res = await this.request(path, init);
    const text = await res.text();
    if (!res.ok) {
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        /* keep raw text */
      }
      const message =
        body && typeof body === 'object' && 'message' in body
          ? String((body as { message: unknown }).message)
          : `${res.status} ${res.statusText} for ${path}`;
      throw new ApiException(res.status, message, body, {});
    }
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /**
   * Open a streaming GET (watch) and hand back the response; the caller
   * consumes res.body as an NDJSON stream. Aborts via the provided signal.
   */
  async stream(path: string, signal: AbortSignal): Promise<Response> {
    const res = await this.request(path, { signal });
    if (!res.ok) {
      const text = await res.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        /* keep raw text */
      }
      throw new ApiException(res.status, `watch failed: ${res.status} ${res.statusText}`, body, {});
    }
    return res;
  }
}

/** Build the REST path for a group/version/plural, optionally namespaced. */
export function resourcePath(group: string, version: string, plural: string, opts?: { namespace?: string; name?: string; subresource?: string; query?: URLSearchParams }): string {
  const base = group === '' ? `/api/${version}` : `/apis/${group}/${version}`;
  let p = base;
  if (opts?.namespace) p += `/namespaces/${encodeURIComponent(opts.namespace)}`;
  p += `/${plural}`;
  if (opts?.name) p += `/${encodeURIComponent(opts.name)}`;
  if (opts?.subresource) p += `/${opts.subresource}`;
  const q = opts?.query?.toString();
  return q ? `${p}?${q}` : p;
}
